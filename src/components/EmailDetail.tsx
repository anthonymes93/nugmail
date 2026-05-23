import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Star, Archive, Trash2, MoreVertical,
  Reply, ReplyAll, Forward, Loader2, Mail
} from 'lucide-react'
import { useEmailDetail, useEmailActions } from '../hooks/useEmailDetail'
import { useGoalRelevance } from '../hooks/useGoalRelevance'
import { useGoalLabels } from '../hooks/useGoalLabels'
import { formatFullDate, getInitials, getAvatarColor } from '../utils/formatters'
import { useGoals, type Goal } from '../contexts/GoalsContext'
import ComposeModal from './ComposeModal'
import DOMPurify from 'dompurify'

const GOAL_COLORS = ['#1a73e8', '#16a34a', '#eab308', '#dc2626', '#9333ea', '#0891b2', '#f97316', '#db2777']

function fallbackGoalLabel(goal: Goal) {
  return goal.text
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
    .replace(/[^a-z0-9 ]/gi, '')
    .slice(0, 24) || 'Goal'
}

function GoalRelevanceBar({ goals, scores, labels, isLoading }: {
  goals: Goal[]
  scores: { goalId: string; score: number }[] | undefined
  labels: { goalId: string; label: string }[] | undefined
  isLoading: boolean
}) {
  const activeGoals = goals.filter((goal) => !goal.completed)
  const scoreByGoal = new Map((scores ?? []).map((score) => [score.goalId, score.score]))
  const labelByGoal = new Map((labels ?? []).map((label) => [label.goalId, label.label]))

  if (activeGoals.length === 0) {
    return <div className="h-5 w-28 rounded-full bg-gray-100" aria-label="No active goals" />
  }

  return (
    <div className="flex items-start gap-1 w-36 sm:w-52" aria-label="Goal relevance">
      {activeGoals.map((goal, index) => {
        const score = isLoading ? 0 : Math.max(0, Math.min(100, scoreByGoal.get(goal.id) ?? 0))
        const color = GOAL_COLORS[index % GOAL_COLORS.length]
        const label = labelByGoal.get(goal.id) ?? fallbackGoalLabel(goal)

        return (
          <div
            key={goal.id}
            className="min-w-0 flex-1"
            title={`${goal.text}: ${score}% relevant`}
          >
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isLoading ? 'animate-pulse' : ''}`}
                style={{ width: `${score}%`, backgroundColor: color }}
              />
            </div>
            <div className="mt-0.5 line-clamp-2 break-words text-center text-[7px] leading-[0.65rem] text-gray-500">
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function EmailDetail() {
  const { messageId } = useParams<{ messageId: string }>()
  const [searchParams] = useSearchParams()
  const accountEmail = searchParams.get('acc') ?? ''
  const navigate = useNavigate()

  const { data: email, isLoading, isError } = useEmailDetail(messageId, accountEmail)
  const { star, archive, trash } = useEmailActions()
  const { goals } = useGoals()
  const relevance = useGoalRelevance(email, goals)
  const goalLabels = useGoalLabels(goals)
  const [replyOpen, setReplyOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !email?.bodyHtml) return
    const onLoad = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 40 + 'px'
      }
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [email?.bodyHtml])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (isError || !email) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Mail size={32} />
        <p className="text-sm">Failed to load email.</p>
        <button onClick={() => navigate(-1)} className="text-g-blue text-sm">Go back</button>
      </div>
    )
  }

  const avatarColor = getAvatarColor(email.fromEmail)
  const initials = getInitials(email.fromName)
  const bodyContent = email.bodyHtml
    ? DOMPurify.sanitize(email.bodyHtml, { USE_PROFILES: { html: true } })
    : (email.bodyText ?? email.snippet)

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100">
          <div className="px-2">
            <GoalRelevanceBar
              goals={goals}
              scores={relevance.data}
              labels={goalLabels.data}
              isLoading={relevance.isLoading}
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={() => star.mutate({ id: email.id, starred: !email.isStarred, accountEmail: email.accountEmail })}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Star size={20} className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'} />
          </button>
          <button
            onClick={() => archive.mutate({ id: email.id, accountEmail: email.accountEmail }, { onSuccess: () => navigate(-1) })}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Archive"
          >
            <Archive size={20} className="text-gray-500" />
          </button>
          <button
            onClick={() => trash.mutate({ id: email.id, accountEmail: email.accountEmail }, { onSuccess: () => navigate(-1) })}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Delete"
          >
            <Trash2 size={20} className="text-gray-500" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMore(!showMore)} className="p-2 rounded-full hover:bg-gray-100">
              <MoreVertical size={20} className="text-gray-500" />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-40">
                  <button
                    onClick={() => { setShowMore(false); setReplyOpen(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Forward size={16} />
                    Forward
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-auto px-4 pt-4 max-w-3xl mx-auto w-full" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
          <h1 className="text-xl font-normal text-gray-900 mb-4 leading-snug">{email.subject}</h1>

          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${avatarColor}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 text-sm">{email.fromName}</span>
                <span className="text-xs text-gray-500">{formatFullDate(email.internalDate)}</span>
              </div>
              <p className="text-xs text-gray-500">
                to {email.to}
                {email.cc && `, cc: ${email.cc}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">via {email.accountEmail}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            {email.bodyHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={bodyContent}
                sandbox="allow-same-origin"
                className="w-full border-none overflow-hidden"
                style={{ minHeight: '200px' }}
                title="Email body"
              />
            ) : (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {bodyContent}
              </pre>
            )}
          </div>
        </div>

        {/* Reply bar */}
        <div
          className="fixed left-0 right-0 md:relative md:bottom-auto bg-white border-t border-gray-200 px-4 py-3 flex gap-2"
          style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Reply size={16} />
            Reply
          </button>
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ReplyAll size={16} />
            Reply all
          </button>
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Forward size={16} />
            Forward
          </button>
        </div>
      </div>

      {replyOpen && (
        <ComposeModal
          onClose={() => setReplyOpen(false)}
          replyTo={email.replyTo ?? email.from}
          replySubject={email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`}
          inReplyTo={email.id}
          fromAccountEmail={email.accountEmail}
        />
      )}
    </>
  )
}
