import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ParsedEmail } from '../types/gmail'

const STORAGE_KEY = 'nugmail_pinned_v1'

export interface PinnedEmail {
  type: 'email'
  id: string
  data: ParsedEmail
  pinnedAt: number
}

export interface PinnedQuote {
  type: 'quote'
  id: number
  data: { quote: string; author: string }
  pinnedAt: number
}

export type PinnedItem = PinnedEmail | PinnedQuote

interface PinnedContextType {
  pinned: PinnedItem[]
  pinEmail: (email: ParsedEmail) => void
  pinQuote: (quote: { id: number; quote: string; author: string }) => void
  unpin: (type: 'email' | 'quote', id: string | number) => void
  isPinned: (type: 'email' | 'quote', id: string | number) => boolean
}

function load(): PinnedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as PinnedItem[]
  } catch {
    return []
  }
}

function save(items: PinnedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const PinnedContext = createContext<PinnedContextType | null>(null)

export function PinnedProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<PinnedItem[]>(load)

  const pinEmail = useCallback((email: ParsedEmail) => {
    setPinned((prev) => {
      if (prev.some((p) => p.type === 'email' && p.id === email.id)) return prev
      const next: PinnedItem[] = [{ type: 'email', id: email.id, data: email, pinnedAt: Date.now() }, ...prev]
      save(next)
      return next
    })
  }, [])

  const pinQuote = useCallback((quote: { id: number; quote: string; author: string }) => {
    setPinned((prev) => {
      if (prev.some((p) => p.type === 'quote' && p.id === quote.id)) return prev
      const next: PinnedItem[] = [{ type: 'quote', id: quote.id, data: quote, pinnedAt: Date.now() }, ...prev]
      save(next)
      return next
    })
  }, [])

  const unpin = useCallback((type: 'email' | 'quote', id: string | number) => {
    setPinned((prev) => {
      const next = prev.filter((p) => !(p.type === type && p.id === id))
      save(next)
      return next
    })
  }, [])

  const isPinned = useCallback(
    (type: 'email' | 'quote', id: string | number) =>
      pinned.some((p) => p.type === type && p.id === id),
    [pinned]
  )

  return (
    <PinnedContext.Provider value={{ pinned, pinEmail, pinQuote, unpin, isPinned }}>
      {children}
    </PinnedContext.Provider>
  )
}

export function usePinned() {
  const ctx = useContext(PinnedContext)
  if (!ctx) throw new Error('usePinned must be inside PinnedProvider')
  return ctx
}
