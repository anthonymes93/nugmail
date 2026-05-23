import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import type { ParsedEmail } from '../types/gmail'

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

const PinnedContext = createContext<PinnedContextType | null>(null)

export function PinnedProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<PinnedItem[]>([])
  const [uid, setUid] = useState<string | null>(null)

  // Single effect: track auth state and ensure anonymous session exists
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      console.log('[PIN] auth state:', user ? `uid=${user.uid} anon=${user.isAnonymous}` : 'null')
      if (user) {
        setUid(user.uid)
      } else {
        setUid(null)
        console.log('[PIN] no user — signing in anonymously')
        signInAnonymously(auth)
          .then(() => console.log('[PIN] anonymous sign-in OK'))
          .catch((err) => console.error('[PIN] anonymous sign-in FAILED:', err))
      }
    })
  }, [])

  // Real-time Firestore listener — reconnects whenever uid changes
  useEffect(() => {
    if (!uid) { setPinned([]); return }
    console.log('[PIN] attaching Firestore listener for uid:', uid)

    const ref = collection(db, 'users', uid, 'pinned')
    return onSnapshot(
      ref,
      (snap) => {
        console.log('[PIN] snapshot received, docs:', snap.docs.length)
        const items = snap.docs.map((d) => d.data() as PinnedItem)
        items.sort((a, b) => b.pinnedAt - a.pinnedAt)
        setPinned(items)
      },
      (err) => console.error('[PIN] Firestore snapshot error:', err)
    )
  }, [uid])

  const pinEmail = useCallback((email: ParsedEmail) => {
    console.log('[PIN] pinEmail uid:', uid)
    if (!uid) return
    const item: PinnedEmail = { type: 'email', id: email.id, data: email, pinnedAt: Date.now() }
    setDoc(doc(db, 'users', uid, 'pinned', `email_${email.id}`), item)
      .then(() => console.log('[PIN] setDoc OK'))
      .catch((err) => console.error('[PIN] setDoc FAILED:', err))
  }, [uid])

  const pinQuote = useCallback((quote: { id: number; quote: string; author: string }) => {
    if (!uid) return
    const item: PinnedQuote = { type: 'quote', id: quote.id, data: quote, pinnedAt: Date.now() }
    setDoc(doc(db, 'users', uid, 'pinned', `quote_${quote.id}`), item).catch(console.error)
  }, [uid])

  const unpin = useCallback((type: 'email' | 'quote', id: string | number) => {
    if (!uid) return
    deleteDoc(doc(db, 'users', uid, 'pinned', `${type}_${id}`)).catch(console.error)
  }, [uid])

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
