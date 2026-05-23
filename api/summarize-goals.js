function send(res, status, body) {
  res.status(status).json(body)
}

function cleanLabel(value, fallback) {
  const label = String(value ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 12)

  if (label) return label
  return String(fallback ?? 'Goal').replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'Goal'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return send(res, 500, { error: 'OPENAI_API_KEY is not configured' })

  const { goals } = req.body ?? {}
  if (!Array.isArray(goals) || goals.length === 0) {
    return send(res, 400, { error: 'Goals are required' })
  }

  const cleanGoals = goals
    .map((goal) => ({
      id: String(goal.id ?? ''),
      text: String(goal.text ?? '').trim(),
    }))
    .filter((goal) => goal.id && goal.text)
    .slice(0, 25)

  if (cleanGoals.length === 0) return send(res, 400, { error: 'At least one goal is required' })

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
                text: 'Create one short display word for each user goal. Use one word only, no spaces or punctuation. Prefer a concrete noun or verb that captures the goal.',
              },
            ],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: JSON.stringify({ goals: cleanGoals }) }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'goal_labels',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                labels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      goalId: { type: 'string' },
                      label: { type: 'string' },
                    },
                    required: ['goalId', 'label'],
                  },
                },
              },
              required: ['labels'],
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
    const rawLabels = Array.isArray(parsed.labels) ? parsed.labels : []
    const labelMap = new Map(rawLabels.map((item) => [String(item.goalId), cleanLabel(item.label)]))

    return send(res, 200, {
      labels: cleanGoals.map((goal) => ({
        goalId: goal.id,
        label: labelMap.get(goal.id) ?? cleanLabel(goal.text.split(/\s+/)[0], 'Goal'),
      })),
    })
  } catch (error) {
    console.error('Goal label generation failed:', error)
    return send(res, 500, { error: 'Goal label generation failed' })
  }
}
