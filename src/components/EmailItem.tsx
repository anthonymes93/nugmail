import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Star, Paperclip, Pin, Archive, Reply, Forward, MailOpen, FolderInput, Tag, Ban, X } from 'lucide-react'
import type { ParsedEmail } from '../types/gmail'
import { formatEmailDate, getInitials, getAvatarColor } from '../utils/formatters'
import { useEmailActions } from '../hooks/useEmailDetail'
import { useAuth } from '../contexts/AuthContext'
import { usePinned } from '../contexts/PinnedContext'

interface EmailItemProps {
  email: ParsedEmail
  inPinnedSection?: boolean
}

const SWIPE_THRESHOLD = 80
const LONG_PRESS_MS = 3000

const MENU_ITEMS = [
  { icon: Reply,      label: 'Reply' },
  { icon: Forward,    label: 'Forward' },
  { icon: MailOpen,   label: 'Mark as unread' },
  { icon: Archive,    label: 'Archive' },
  { icon: FolderInput,label: 'Move to' },
  { icon: Tag,        label: 'Label as' },
  { icon: Ban,        label: 'Block sender' },
]

function ContextMenu({ email, onClose }: { email: ParsedEmail; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-xl pb-safe overflow-hidden animate-slide-up">
        {/* Email preview header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(email.fromEmail)}`}>
            {getInitials(email.fromName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{email.fromName}</p>
            <p className="text-xs text-gray-500 truncate">{email.subject}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Menu items */}
        {MENU_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={onClose}
            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 text-left"
          >
            <Icon size={20} className="text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-800">{label}</span>
          </button>
        ))}

        <div className="h-6" />
      </div>
    </div>,
    document.body,
  )
}

export default function EmailItem({ email, inPinnedSection }: EmailItemProps) {
  const navigate = useNavigate()
  const { star, markRead, archive } = useEmailActions()
  const { accounts } = useAuth()
  const { pinEmail, unpin, isPinned } = usePinned()
  const multipleAccounts = accounts.length > 1
  const pinned = isPinned('email', email.id)
  const [menuOpen, setMenuOpen] = useState(false)

  // Swipe + long-press state in refs (no re-renders during gesture)
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const currentX = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const wasSwipe = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTime = useRef(0)

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    currentX.current = 0
    isHorizontal.current = null
    wasSwipe.current = false
    if (contentRef.current) contentRef.current.style.transition = 'none'

    longPressTimer.current = setTimeout(() => {
      cancelLongPress()
      wasSwipe.current = true // prevent click after menu opens
      // Snap back if mid-swipe
      if (contentRef.current) {
        contentRef.current.style.transition = 'transform 0.2s ease'
        contentRef.current.style.transform = 'translateX(0)'
      }
      setMenuOpen(true)
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!contentRef.current) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    // Cancel long press on any real movement
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancelLongPress()

    if (inPinnedSection) return // no swipe in pinned section

    if (isHorizontal.current === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (!isHorizontal.current) return

    currentX.current = dx
    contentRef.current.style.transform = `translateX(${dx}px)`
  }

  const handleTouchEnd = () => {
    cancelLongPress()
    if (!contentRef.current) return
    const dx = currentX.current

    if (!inPinnedSection && isHorizontal.current && Math.abs(dx) >= SWIPE_THRESHOLD) {
      wasSwipe.current = true
      const dir = dx > 0 ? 1 : -1
      contentRef.current.style.transition = 'transform 0.2s ease, opacity 0.2s ease'
      contentRef.current.style.transform = `translateX(${dir * 110}vw)`
      contentRef.current.style.opacity = '0'
      setTimeout(() => {
        archive.mutate({ id: email.id, accountEmail: email.accountEmail })
      }, 180)
    } else {
      contentRef.current.style.transition = 'transform 0.2s ease'
      contentRef.current.style.transform = 'translateX(0)'
    }

    isHorizontal.current = null
    currentX.current = 0

    // Double-tap detection
    if (!wasSwipe.current && !isHorizontal.current) {
      const now = Date.now()
      if (now - lastTapTime.current < 300) {
        lastTapTime.current = 0
        wasSwipe.current = true // suppress the click
        setMenuOpen(true)
      } else {
        lastTapTime.current = now
      }
    }
  }

  const handleClick = () => {
    if (wasSwipe.current) return
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
    <>
      <div className="relative overflow-hidden border-b border-gray-100">
        {/* Swipe background — hidden for pinned items */}
        {!inPinnedSection && (
          <div className="absolute inset-0 bg-green-500 flex items-center justify-between px-5">
            <div className="flex items-center gap-2 text-white">
              <Archive size={20} />
              <span className="text-sm font-medium">Archive</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-medium">Archive</span>
              <Archive size={20} />
            </div>
          </div>
        )}

        {/* Email row */}
        <div
          ref={contentRef}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`
            relative flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none
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
            <Pin size={15} className={pinned ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
          </button>

          {/* Star */}
          <button
            onClick={handleStar}
            className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0 transition-colors"
            aria-label={email.isStarred ? 'Unstar' : 'Star'}
          >
            <Star size={18} className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'} />
          </button>
        </div>
      </div>

      {menuOpen && <ContextMenu email={email} onClose={() => setMenuOpen(false)} />}
    </>
  )
}
