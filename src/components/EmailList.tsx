import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Loader2, Mail, Pin, GripVertical } from 'lucide-react'
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
import { usePinned, type PinnedItem } from '../contexts/PinnedContext'
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
    <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 select-none">
      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-base">
        ✦
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-indigo-400 truncate">{quote?.author ?? '…'}</span>
          <span className="text-xs text-purple-300 flex-shrink-0">inspiration</span>
        </div>
        <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 truncate">
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

function SortablePinnedItem({ item }: { item: PinnedItem }) {
  const { unpin } = usePinned()
  const sortableId = item.type === 'email' ? `email_${item.id}` : `quote_${item.id}`
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  }

  if (item.type === 'email') {
    return (
      <div ref={setNodeRef} style={style}>
        <div className="relative">
          <EmailItem email={item.data} inPinnedSection />
          {/* Drag handle — left edge, above the avatar */}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical size={15} className="text-amber-300" />
          </div>
        </div>
      </div>
    )
  }

  // Quote pinned item
  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative flex items-center gap-3 px-3 py-2 border-b border-amber-100 bg-gradient-to-r from-amber-50/80 to-orange-50/80 select-none">
        {/* Drag handle */}
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1"
          aria-label="Drag to reorder"
        >
          <GripVertical size={15} className="text-amber-300" />
        </div>
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-400 text-white text-base">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-amber-500 truncate">{item.data.author}</span>
            <span className="text-xs text-orange-300 flex-shrink-0">pinned quote</span>
          </div>
          <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 truncate">
            {item.data.quote}
          </p>
        </div>
        <button
          onClick={() => unpin('quote', item.id)}
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
  const { pinned, reorder } = usePinned()

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
  )

  if (pinned.length === 0) return null

  const ids = pinned.map((item) => (item.type === 'email' ? `email_${item.id}` : `quote_${item.id}`))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    reorder(arrayMove(pinned, oldIndex, newIndex))
  }

  return (
    <div className="border-b-2 border-amber-200">
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50">
        <Pin size={14} className="fill-amber-400 text-amber-400" />
        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pinned</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {pinned.map((item) => (
            <SortablePinnedItem
              key={item.type === 'email' ? `email_${item.id}` : `quote_${item.id}`}
              item={item}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default function EmailList({ labelId = 'INBOX', isSearch }: EmailListProps) {
  const [searchParams] = useSearchParams()
  const searchQuery = isSearch ? (searchParams.get('q') ?? '') : undefined

  const { emails, isLoading, isRefetching, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useEmailList(labelId, searchQuery)
  const { data: quotes } = useQuotes()

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
