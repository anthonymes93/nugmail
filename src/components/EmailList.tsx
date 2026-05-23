import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { CalendarClock, RefreshCw, Loader2, Mail, Pin, SquarePen, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEmailList } from '../hooks/useEmailList'
import { useQuotes, type Quote } from '../hooks/useQuotes'
import { usePinned } from '../contexts/PinnedContext'
import EmailItem from './EmailItem'

interface EmailListProps {
  labelId?: string
  isSearch?: boolean
}

const LABEL_NAMES: Record<string, string> = {
  INBOX: 'Inbox',
  STARRED: 'Starred',
  SENT: 'Sent',
  DRAFT: 'Drafts',
  SPAM: 'Spam',
  TRASH: 'Trash',
}

function QuoteDivider({ quote }: { quote?: Quote }) {
  const { pinQuote, unpin, isPinned } = usePinned()
  const pinned = quote ? isPinned('quote', quote.id) : false

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!quote) return
    if (pinned) unpin('quote', quote.id)
    else pinQuote(quote)
  }

  return (
    <div className="flex items-start gap-3 px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 select-none">
      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-base">
        ✦
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-indigo-400">{quote?.author ?? '…'}</span>
          <span className="text-xs text-purple-300 flex-shrink-0">inspiration</span>
        </div>
        <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
          {quote?.quote ?? 'Life is good'}
        </p>
      </div>
      {quote && (
        <button
          onClick={handlePin}
          className="p-1 rounded-full hover:bg-indigo-100 flex-shrink-0 transition-colors"
          aria-label={pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={15} className={pinned ? 'fill-amber-400 text-amber-400' : 'text-indigo-200'} />
        </button>
      )}
    </div>
  )
}

type EmailOrQuote = import('../contexts/PinnedContext').PinnedEmail | import('../contexts/PinnedContext').PinnedQuote

function formatNoteDueAt(dueAt: string) {
  const date = new Date(dueAt)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SortablePinnedItem({ item }: { item: EmailOrQuote }) {
  const { unpin } = usePinned()
  const sortableId = item.type === 'email' ? `email_${item.id}` : `quote_${item.id}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    touchAction: 'none' as const,
  }

  if (item.type === 'email') {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <EmailItem email={item.data} inPinnedSection />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="flex items-center gap-3 px-3 py-2 border-b border-amber-100 bg-gradient-to-r from-amber-50/80 to-orange-50/80 select-none">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-400 text-white text-base">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-amber-500">{item.data.author}</span>
            <span className="text-xs text-orange-300 flex-shrink-0">pinned quote</span>
          </div>
          <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
            {item.data.quote}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); unpin('quote', item.id) }}
          className="p-1 rounded-full hover:bg-amber-200 flex-shrink-0 transition-colors"
          aria-label="Unpin"
        >
          <Pin size={15} className="fill-amber-400 text-amber-400" />
        </button>
      </div>
    </div>
  )
}

function PinnedSection() {
  const { pinned, reorder, pinNote, unpin } = usePinned()
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteDueAt, setNoteDueAt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleNoteOpen = () => {
    setNoteOpen(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleNoteSubmit = () => {
    const text = noteText.trim()
    if (text) {
      pinNote(text, noteDueAt ? new Date(noteDueAt).toISOString() : undefined)
      setNoteText('')
      setNoteDueAt('')
      setNoteOpen(false)
    }
  }

  const handleNoteCancel = () => {
    setNoteOpen(false)
    setNoteText('')
    setNoteDueAt('')
  }

  const ids = pinned.map((item) =>
    item.type === 'email' ? `email_${item.id}` : item.type === 'quote' ? `quote_${item.id}` : `note_${item.id}`
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    reorder(arrayMove(pinned, oldIndex, newIndex))
  }

  if (pinned.length === 0 && !noteOpen) {
    return (
      <div className="border-b border-amber-100">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50">
          <Pin size={14} className="fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex-1">Pinned</span>
          <button onClick={handleNoteOpen} className="p-1 rounded-full hover:bg-amber-100 transition-colors" aria-label="Add note">
            <SquarePen size={15} className="text-amber-500" />
          </button>
        </div>
        {noteOpen && (
          <NoteCompose
            textareaRef={textareaRef}
            value={noteText}
            dueAt={noteDueAt}
            onChange={setNoteText}
            onDueAtChange={setNoteDueAt}
            onSubmit={handleNoteSubmit}
            onCancel={handleNoteCancel}
          />
        )}
      </div>
    )
  }

  return (
    <div className="border-b-2 border-amber-200">
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50">
        <Pin size={14} className="fill-amber-400 text-amber-400" />
        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex-1">Pinned</span>
        <button onClick={handleNoteOpen} className="p-1 rounded-full hover:bg-amber-100 transition-colors" aria-label="Add note">
          <SquarePen size={15} className="text-amber-500" />
        </button>
      </div>

      {noteOpen && (
        <NoteCompose
          textareaRef={textareaRef}
          value={noteText}
          dueAt={noteDueAt}
          onChange={setNoteText}
          onDueAtChange={setNoteDueAt}
          onSubmit={handleNoteSubmit}
          onCancel={handleNoteCancel}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {pinned.map((item) => {
            const key = item.type === 'email' ? `email_${item.id}` : item.type === 'quote' ? `quote_${item.id}` : `note_${item.id}`
            if (item.type === 'note') {
              return <SortableNoteItem key={key} item={item} onUnpin={() => unpin('note', item.id)} />
            }
            return <SortablePinnedItem key={key} item={item as EmailOrQuote} />
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}

function NoteCompose({ textareaRef, value, dueAt, onChange, onDueAtChange, onSubmit, onCancel }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  dueAt: string
  onChange: (v: string) => void
  onDueAtChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="px-3 py-2 bg-amber-50/80 border-b border-amber-100">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
        placeholder="Write a note…"
        rows={2}
        className="w-full text-base md:text-sm text-gray-800 bg-white border border-amber-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-amber-300 placeholder-gray-400"
      />
      <label className="mt-1.5 flex items-center gap-2 text-xs text-amber-700">
        <CalendarClock size={14} className="text-amber-500 flex-shrink-0" />
        <span className="font-medium flex-shrink-0">Due</span>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => onDueAtChange(e.target.value)}
          className="min-w-0 flex-1 text-base md:text-xs text-gray-700 bg-white border border-amber-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300"
        />
      </label>
      <div className="flex justify-end gap-2 mt-1.5">
        <button onClick={onCancel} className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 rounded hover:bg-amber-100">
          <X size={12} /> Cancel
        </button>
        <button onClick={onSubmit} disabled={!value.trim()} className="text-xs font-medium text-white bg-amber-400 px-3 py-1 rounded hover:bg-amber-500 disabled:opacity-40 transition-colors">
          Pin note
        </button>
      </div>
    </div>
  )
}

function SortableNoteItem({ item, onUnpin }: { item: import('../contexts/PinnedContext').PinnedNote; onUnpin: () => void }) {
  const sortableId = `note_${item.id}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 10 : undefined, touchAction: 'none' as const }
  const dueAt = item.data.dueAt ? formatNoteDueAt(item.data.dueAt) : null

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="flex items-start gap-3 px-3 py-2.5 border-b border-amber-100 bg-amber-50/40">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-amber-100 text-amber-500 mt-0.5">
          <SquarePen size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-500 mb-0.5">Note</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.data.text}</p>
          {dueAt && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
              <CalendarClock size={12} className="flex-shrink-0" />
              <span>Due {dueAt}</span>
            </p>
          )}
        </div>
        <button onClick={onUnpin} className="p-1 rounded-full hover:bg-amber-200 flex-shrink-0 transition-colors mt-0.5" aria-label="Unpin">
          <Pin size={15} className="fill-amber-400 text-amber-400" />
        </button>
      </div>
    </div>
  )
}

export default function EmailList({ labelId = 'INBOX', isSearch }: EmailListProps) {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const searchQuery = isSearch ? (searchParams.get('q') ?? '') : undefined

  const { emails, isLoading, isRefetching, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useEmailList(labelId, searchQuery)
  const { data: quotes } = useQuotes()

  // Restore scroll position when returning from email detail
  useEffect(() => {
    if (emails.length === 0) return
    const key = `scroll_${pathname}`
    const saved = sessionStorage.getItem(key)
    if (!saved) return
    sessionStorage.removeItem(key)
    requestAnimationFrame(() => {
      const el = document.getElementById('mail-scroll')
      if (el) el.scrollTop = parseInt(saved, 10)
    })
  }, [emails.length, pathname])

  const title = isSearch ? `Search: "${searchQuery}"` : (LABEL_NAMES[labelId] ?? labelId)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 size={32} className="animate-spin" />
        <span className="text-sm">Loading {title.toLowerCase()}…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500 px-6">
        <Mail size={40} className="text-gray-300" />
        <p className="text-sm text-center">Failed to load emails. Check your connection.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-g-blue text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PinnedSection />

      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-600">{title}</h2>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 disabled:opacity-40 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
          <Mail size={40} className="text-gray-200" />
          <p className="text-sm">{isSearch ? 'No results found.' : `${title} is empty.`}</p>
        </div>
      ) : (
        <>
          {emails.map((email, i) => (
            <div key={email.id}>
              {i > 0 && <QuoteDivider quote={quotes ? quotes[(i - 1) % quotes.length] : undefined} />}
              <EmailItem email={email} />
            </div>
          ))}

          {hasNextPage && (
            <div className="flex justify-center py-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 text-g-blue text-sm font-medium px-5 py-2 rounded-full hover:bg-g-hover disabled:opacity-50 transition-colors"
              >
                {isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
