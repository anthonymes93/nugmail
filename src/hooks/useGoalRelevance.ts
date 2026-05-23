import { useQuery } from '@tanstack/react-query'
import type { Goal } from '../contexts/GoalsContext'
import type { ParsedEmail } from '../types/gmail'

export interface GoalRelevanceScore {
  goalId: string
  score: number
}

const CACHE_PREFIX = 'nugmail_goal_relevance_v1'

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i) | 0
  }
  return Math.abs(hash).toString(36)
}

function getEmailText(email: ParsedEmail) {
  if (email.bodyText?.trim()) return email.bodyText
  if (!email.bodyHtml) return email.snippet

  const doc = new DOMParser().parseFromString(email.bodyHtml, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || email.snippet
}

function cacheKey(email: ParsedEmail, goals: Goal[]) {
  const goalSignature = goals.map((goal) => `${goal.id}:${goal.text}`).join('|')
  return `${CACHE_PREFIX}:${email.accountEmail}:${email.id}:${hashString(goalSignature)}`
}

export function useGoalRelevance(email: ParsedEmail | undefined, goals: Goal[]) {
  const activeGoals = goals.filter((goal) => !goal.completed)

  return useQuery({
    queryKey: ['goalRelevance', email?.accountEmail, email?.id, activeGoals.map((goal) => [goal.id, goal.text])],
    enabled: !!email && activeGoals.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      if (!email) return []
      const key = cacheKey(email, activeGoals)
      const cached = localStorage.getItem(key)
      if (cached) return JSON.parse(cached) as GoalRelevanceScore[]

      const res = await fetch('/api/analyze-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: activeGoals.map((goal) => ({ id: goal.id, text: goal.text })),
          email: {
            from: email.from,
            to: email.to,
            subject: email.subject,
            snippet: email.snippet,
            bodyText: getEmailText(email),
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Goal relevance analysis failed')

      const scores = data.scores as GoalRelevanceScore[]
      localStorage.setItem(key, JSON.stringify(scores))
      return scores
    },
  })
}
