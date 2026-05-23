const MAX_EMAIL_CHARS = 12000

function send(res, status, body) {
  res.status(status).json(body)
}

function normalizeScore(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return send(res, 500, { error: 'OPENAI_API_KEY is not configured' })

  const { goals, email } = req.body ?? {}
  if (!Array.isArray(goals) || goals.length === 0 || !email) {
    return send(res, 400, { error: 'Goals and email are required' })
  }

  const cleanGoals = goals
    .map((goal) => ({
      id: String(goal.id ?? ''),
      text: String(goal.text ?? '').trim(),
    }))
    .filter((goal) => goal.id && goal.text)
    .slice(0, 25)

  if (cleanGoals.length === 0) return send(res, 400, { error: 'At least one goal is required' })

  const emailText = [
    `From: ${email.from ?? ''}`,
    `To: ${email.to ?? ''}`,
    `Subject: ${email.subject ?? ''}`,
    '',
    String(email.bodyText ?? email.snippet ?? '').slice(0, MAX_EMAIL_CHARS),
  ].join('\n')

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'Score how relevant an email is to each user goal. Return only the required JSON. Scores must be integers from 0 to 100, where 0 means not relevant and 100 means directly actionable or strongly related.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({ goals: cleanGoals, email: emailText }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'goal_relevance',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                scores: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      goalId: { type: 'string' },
                      score: { type: 'integer', minimum: 0, maximum: 100 },
                    },
                    required: ['goalId', 'score'],
                  },
                },
              },
              required: ['scores'],
            },
          },
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return send(res, response.status, { error: data.error?.message ?? 'OpenAI request failed' })
    }

    const rawText = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((part) => part.text)?.text
    const parsed = JSON.parse(rawText)
    const rawScores = Array.isArray(parsed.scores) ? parsed.scores : []
    const scoreMap = new Map(rawScores.map((item) => [String(item.goalId), normalizeScore(item.score)]))

    return send(res, 200, {
      scores: cleanGoals.map((goal) => ({
        goalId: goal.id,
        score: scoreMap.get(goal.id) ?? 0,
      })),
    })
  } catch (error) {
    console.error('Goal analysis failed:', error)
    return send(res, 500, { error: 'Goal analysis failed' })
  }
}
