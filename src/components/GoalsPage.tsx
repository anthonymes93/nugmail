import { useState } from 'react'
import { CheckCircle2, Circle, Plus, Target, Trash2 } from 'lucide-react'
import { useGoals } from '../contexts/GoalsContext'

export default function GoalsPage() {
  const { goals, addGoal, toggleGoal, deleteGoal } = useGoals()
  const [goalText, setGoalText] = useState('')

  const activeGoals = goals.filter((goal) => !goal.completed)
  const completedGoals = goals.filter((goal) => goal.completed)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = goalText.trim()
    if (!text) return
    addGoal(text)
    setGoalText('')
  }

  return (
    <div className="flex flex-col min-h-full bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 px-4 py-3">
          <Target size={17} className="text-g-blue" />
          <h2 className="text-sm font-semibold text-gray-700">Goals</h2>
          <span className="ml-auto text-xs text-gray-400">
            {activeGoals.length} active
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 pb-3">
          <input
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Add a goal"
            className="min-w-0 flex-1 text-base md:text-sm text-gray-800 bg-g-bg border border-gray-200 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-g-blue/20 focus:border-g-blue"
          />
          <button
            type="submit"
            disabled={!goalText.trim()}
            className="w-10 h-10 rounded-full bg-g-blue text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition"
            aria-label="Add goal"
          >
            <Plus size={19} />
          </button>
        </form>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 px-8">
          <Target size={42} className="text-gray-200" />
          <p className="text-sm text-center">No goals yet.</p>
          <p className="text-xs text-gray-300 text-center">Add one goal at a time and keep the list as long as you need.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {activeGoals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onDelete={deleteGoal} />
          ))}

          {completedGoals.length > 0 && (
            <div className="px-4 py-2 bg-g-bg border-y border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Completed
            </div>
          )}

          {completedGoals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onDelete={deleteGoal} />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalRow({ goal, onToggle, onDelete }: {
  goal: import('../contexts/GoalsContext').Goal
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 bg-white">
      <button
        onClick={() => onToggle(goal.id, !goal.completed)}
        className="mt-0.5 rounded-full text-g-blue active:scale-95 transition"
        aria-label={goal.completed ? 'Mark goal incomplete' : 'Mark goal complete'}
      >
        {goal.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>
      <p className={`flex-1 min-w-0 text-sm leading-relaxed break-words ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
        {goal.text}
      </p>
      <button
        onClick={() => onDelete(goal.id)}
        className="mt-0.5 p-1 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        aria-label="Delete goal"
      >
        <Trash2 size={17} />
      </button>
    </div>
  )
}
