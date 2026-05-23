import { useNavigate } from 'react-router-dom'
import { Star, Paperclip, Pin } from 'lucide-react'
import type { ParsedEmail } from '../types/gmail'
import { formatEmailDate, getInitials, getAvatarColor } from '../utils/formatters'
import { useEmailActions } from '../hooks/useEmailDetail'
import { useAuth } from '../contexts/AuthContext'
import { usePinned } from '../contexts/PinnedContext'

interface EmailItemProps {
  email: ParsedEmail
  inPinnedSection?: boolean
}

export default function EmailItem({ email, inPinnedSection }: EmailItemProps) {
  const navigate = useNavigate()
  const { star, markRead } = useEmailActions()
  const { accounts } = useAuth()
  const { pinEmail, unpin, isPinned } = usePinned()
  const multipleAccounts = accounts.length > 1
  const pinned = isPinned('email', email.id)

  const handleClick = () => {
    if (email.isUnread) {
      markRead.mutate({ id: email.id, read: true, accountEmail: email.accountEmail })
    }
    navigate(`/email/${email.id}?acc=${encodeURIComponent(email.accountEmail)}`)
  }

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation()
    star.mutate({ id: email.id, starred: !email.isStarred, accountEmail: email.accountEmail })
  }

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pinned) unpin('email', email.id)
    else pinEmail(email)
  }

  const senderColor = getAvatarColor(email.fromEmail)
  const accountColor = getAvatarColor(email.accountEmail)
  const initials = getInitials(email.fromName)

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none
        border-b border-gray-100
        ${inPinnedSection ? 'bg-amber-50/60 hover:bg-amber-50' : email.isUnread ? 'bg-white hover:bg-gray-50' : 'bg-g-bg hover:bg-gray-100'}
      `}
    >
      {/* Sender avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${senderColor}`}>
          {initials}
        </div>
        {multipleAccounts && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-white font-bold ${accountColor}`}
            style={{ fontSize: '7px' }}
          >
            {email.accountEmail[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${email.isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
            {email.fromName}
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
            {email.hasAttachments && <Paperclip size={12} />}
            {formatEmailDate(email.internalDate)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <p className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {email.subject}
          </p>
          <span className="text-gray-400 text-sm flex-shrink-0">—</span>
          <p className="text-sm text-gray-500 truncate flex-1">{email.snippet}</p>
        </div>
        {multipleAccounts && (
          <p className="text-xs text-gray-400 truncate">{email.accountEmail}</p>
        )}
      </div>

      {/* Pin */}
      <button
        onClick={handlePin}
        className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0 transition-colors"
        aria-label={pinned ? 'Unpin' : 'Pin'}
      >
        <Pin
          size={15}
          className={pinned ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      </button>

      {/* Star */}
      <button
        onClick={handleStar}
        className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0 transition-colors"
        aria-label={email.isStarred ? 'Unstar' : 'Star'}
      >
        <Star
          size={18}
          className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
        />
      </button>
    </div>
  )
}
