import { useNavigate } from 'react-router-dom'
import { Flame, SquarePen, CalendarClock } from 'lucide-react'
import { useHott } from '../contexts/HottContext'
import { formatEmailDate, getInitials, getAvatarColor } from '../utils/formatters'

export default function HottPage() {
  const { hott, removeFromHott } = useHott()
  const navigate = useNavigate()

  if (hott.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Flame size={40} className="text-gray-200" />
        <p className="text-sm">Nothing hott yet.</p>
        <p className="text-xs text-gray-300">Long-press any email and tap "Add to Hott"</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Flame size={16} className="text-orange-500" />
        <h2 className="text-sm font-semibold text-gray-700">Hott</h2>
        <span className="text-xs text-gray-400 ml-auto">{hott.length} item{hott.length !== 1 ? 's' : ''}</span>
      </div>

      {hott.map((item) => {
        if (item.type === 'note') {
          const dueAt = item.data.dueAt ? new Date(item.data.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null
          return (
            <div
              key={`note_${item.id}`}
              className="flex items-start gap-3 px-3 py-2 border-b border-gray-100 bg-white"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-100 text-amber-500 flex-shrink-0 mt-0.5">
                <SquarePen size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-500">Note</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.data.text}</p>
                {dueAt && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-600">
                    <CalendarClock size={11} className="flex-shrink-0" />
                    <span>Due {dueAt}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => removeFromHott(item.id, 'note')}
                className="p-1.5 rounded-full hover:bg-orange-100 flex-shrink-0 transition-colors mt-0.5"
                aria-label="Remove from Hott"
              >
                <Flame size={16} className="text-orange-400" />
              </button>
            </div>
          )
        }

        const { data: email } = item
        return (
          <div
            key={`email_${item.id}`}
            onClick={() => navigate(`/email/${email.id}?acc=${encodeURIComponent(email.accountEmail)}`)}
            className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 bg-white hover:bg-orange-50 active:bg-orange-100 cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(email.fromEmail)}`}>
              {getInitials(email.fromName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">{email.fromName}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatEmailDate(email.internalDate)}</span>
              </div>
              <p className="text-sm text-gray-600 truncate">{email.subject}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeFromHott(item.id) }}
              className="p-1.5 rounded-full hover:bg-orange-100 flex-shrink-0 transition-colors"
              aria-label="Remove from Hott"
            >
              <Flame size={16} className="text-orange-400" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
