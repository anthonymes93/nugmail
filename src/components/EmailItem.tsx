import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Star, Paperclip, Pin, Archive, Reply, Forward, MailOpen, FolderInput, Tag, Ban, Flame, X, Gamepad2, Sparkles } from 'lucide-react'
import type { ParsedEmail } from '../types/gmail'
import { formatEmailDate, getInitials, getAvatarColor } from '../utils/formatters'
import { useEmailActions } from '../hooks/useEmailDetail'
import { useAuth } from '../contexts/AuthContext'
import { usePinned } from '../contexts/PinnedContext'
import { useHott } from '../contexts/HottContext'
import SenderAvatar from './SenderAvatar'

interface EmailItemProps {
  email: ParsedEmail
  inPinnedSection?: boolean
}

const SWIPE_THRESHOLD = 80
const LONG_PRESS_MS = 500
const DOUBLE_TAP_MS = 300

const MENU_ITEMS = [
  { icon: Reply,       label: 'Reply' },
  { icon: Forward,     label: 'Forward' },
  { icon: MailOpen,    label: 'Mark as unread' },
  { icon: Archive,     label: 'Archive' },
  { icon: FolderInput, label: 'Move to' },
  { icon: Tag,         label: 'Label as' },
  { icon: Ban,         label: 'Block sender' },
  { icon: Gamepad2,    label: 'Get your game on!' },
  { icon: Sparkles,    label: 'I am cool' },
]

function ContextMenu({ email, onClose }: { email: ParsedEmail; onClose: () => void }) {
  const openedAt = useRef(Date.now())
  const { addToHott, removeFromHott, isHott } = useHott()
  const hott = isHott(email.id)

  const handleBackdropClick = () => {
    if (Date.now() - openedAt.current < 350) return
    onClose()
  }

  const handleHott = () => {
    if (hott) removeFromHott(email.id)
    else addToHott(email)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={handleBackdropClick} />
      <div className="relative bg-white rounded-t-2xl shadow-xl overflow-hidden animate-slide-up">
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

        {/* Hott action */}
        <button
          onClick={handleHott}
          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-orange-50 active:bg-orange-100 text-left border-b border-gray-100"
        >
          <Flame size={20} className={hott ? 'text-orange-500' : 'text-gray-400'} />
          <span className={`text-sm font-medium ${hott ? 'text-orange-500' : 'text-gray-800'}`}>
            {hott ? 'Remove from Hott' : 'Add to Hott'}
          </span>
        </button>

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

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const currentX = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const touchMoved = useRef(false)
  const wasSwipe = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressActivated = useRef(false)
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTime = useRef(0)

  const openEmail = () => {
    const scrollEl = document.getElementById('mail-scroll')
    if (scrollEl) sessionStorage.setItem(`scroll_${window.location.pathname}`, String(scrollEl.scrollTop))
    if (email.isUnread) markRead.mutate({ id: email.id, read: true, accountEmail: email.accountEmail })
    navigate(`/email/${email.id}?acc=${encodeURIComponent(email.accountEmail)}`)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }
  const cancelSingleTap = () => {
    if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    currentX.current = 0
    isHorizontal.current = null
    touchMoved.current = false
    wasSwipe.current = false
    longPressActivated.current = false
    if (contentRef.current) contentRef.current.style.transition = 'none'

    longPressTimer.current = setTimeout(() => {
      cancelLongPress()
      cancelSingleTap()
      lastTapTime.current = 0
      longPressActivated.current = true
      wasSwipe.current = true
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

    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      touchMoved.current = true
      wasSwipe.current = true
      cancelLongPress()
    }
    if (inPinnedSection) return

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
    const direction = isHorizontal.current // true=horizontal, false=vertical, null=no movement
    const moved = touchMoved.current
    isHorizontal.current = null
    touchMoved.current = false
    currentX.current = 0

    if (!inPinnedSection && direction === true && Math.abs(dx) >= SWIPE_THRESHOLD) {
      // Full swipe → archive
      wasSwipe.current = true
      const dir = dx > 0 ? 1 : -1
      contentRef.current.style.transition = 'transform 0.18s ease, opacity 0.18s ease'
      contentRef.current.style.transform = `translateX(${dir * 110}vw)`
      contentRef.current.style.opacity = '0'
      // Collapse the row height immediately after content slides off — no waiting for refetch
      if (containerRef.current) {
        const h = containerRef.current.offsetHeight
        containerRef.current.style.height = `${h}px`
        containerRef.current.style.overflow = 'hidden'
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.transition = 'height 0.18s ease'
            containerRef.current.style.height = '0'
          }
        }, 160)
      }
      setTimeout(() => archive.mutate({ id: email.id, accountEmail: email.accountEmail }), 320)
    } else if (direction === true) {
      // Short horizontal swipe → snap back
      contentRef.current.style.transition = 'transform 0.2s ease'
      contentRef.current.style.transform = 'translateX(0)'
    } else if (direction === false) {
      // Vertical scroll — do nothing, let the browser handle it
    } else {
      // direction === null: finger barely moved → genuine tap
      if (moved) return
      if (longPressActivated.current) { longPressActivated.current = false; return }

      // Tap — check for double-tap; delay single-tap navigation
      wasSwipe.current = true // suppress onClick so we control navigation timing
      const now = Date.now()
      if (now - lastTapTime.current < DOUBLE_TAP_MS) {
        cancelSingleTap()
        lastTapTime.current = 0
        setMenuOpen(true)
      } else {
        lastTapTime.current = now
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null
          openEmail()
        }, DOUBLE_TAP_MS)
      }
    }
  }

  // Fallback for mouse clicks (desktop)
  const handleClick = () => {
    if (wasSwipe.current) return
    openEmail()
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

  const accountColor = getAvatarColor(email.accountEmail)

  return (
    <>
      <div ref={containerRef} className="relative overflow-hidden border-b border-gray-100">
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

        <div
          ref={contentRef}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`
            relative flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none
            ${inPinnedSection ? 'bg-amber-50/60 hover:bg-amber-50' : email.isUnread ? 'bg-white hover:bg-gray-50' : 'bg-g-bg hover:bg-gray-100'}
          `}
        >
          <div className="relative flex-shrink-0">
            <SenderAvatar email={email.fromEmail} name={email.fromName} size={36} />
            {multipleAccounts && (
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-white font-bold ${accountColor}`}
                style={{ fontSize: '7px' }}
              >
                {email.accountEmail[0].toUpperCase()}
              </div>
            )}
          </div>

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
            <div className="mt-0.5 space-y-0.5">
              <p className={`text-sm leading-snug overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] ${email.isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                {email.subject}
              </p>
              <p className="text-sm leading-snug text-gray-500 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">{email.snippet}</p>
            </div>
            {multipleAccounts && (
              <p className="text-xs text-gray-400 truncate">{email.accountEmail}</p>
            )}
          </div>

          <button
            onClick={handlePin}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0 transition-colors mt-0.5"
            aria-label={pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={15} className={pinned ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
          </button>

          <button
            onClick={handleStar}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0 transition-colors mt-0.5"
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
