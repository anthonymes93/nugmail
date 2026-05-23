import { useQuery } from '@tanstack/react-query'
import type { Goal } from '../contexts/GoalsContext'

export interface GoalLabel {
  goalId: string
  label: string
}

const CACHE_PREFIX = 'nugmail_goal_label_v3'

function fallbackLabel(goal: Goal) {
  return goal.text
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
    .replace(/[^a-z0-9 ]/gi, '')
    .slice(0, 40) || 'Goal'
}

function cacheKey(goal: Goal) {
  return `${CACHE_PREFIX}:${goal.id}:${goal.text}`
}

function readCachedLabels(goals: Goal[]) {
  return goals.reduce<GoalLabel[]>((labels, goal) => {
    const cached = localStorage.getItem(cacheKey(goal))
    if (cached) labels.push({ goalId: goal.id, label: cached })
    return labels
  }, [])
}

export function useGoalLabels(goals: Goal[]) {
  const activeGoals = goals.filter((goal) => !goal.completed)

  return useQuery({
    queryKey: ['goalLabels', activeGoals.map((goal) => [goal.id, goal.text])],
    enabled: activeGoals.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: () => readCachedLabels(activeGoals),
    queryFn: async () => {
      const cached = readCachedLabels(activeGoals)
      const cachedIds = new Set(cached.map((label) => label.goalId))
      const missingGoals = activeGoals.filter((goal) => !cachedIds.has(goal.id))

      if (missingGoals.length === 0) return cached

      const res = await fetch('/api/summarize-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: missingGoals.map((goal) => ({ id: goal.id, text: goal.text })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Goal label generation failed')

      const labels = (data.labels as GoalLabel[]).map((label) => ({
        goalId: label.goalId,
        label: label.label || fallbackLabel(missingGoals.find((goal) => goal.id === label.goalId) ?? activeGoals[0]),
      }))

      labels.forEach((label) => {
        const goal = activeGoals.find((item) => item.id === label.goalId)
        if (goal) localStorage.setItem(cacheKey(goal), label.label)
      })

      return [...cached, ...labels]
    },
  })
}
