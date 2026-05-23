import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, onSnapshot, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useAuth } from './AuthContext'
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
  reorder: (items: PinnedItem[]) => void
}

const PinnedContext = createContext<PinnedContextType | null>(null)

export function PinnedProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<PinnedItem[]>([])
  const [firebaseReady, setFirebaseReady] = useState(false)
  const { activeAccounts } = useAuth()

  // Use the primary Gmail account email as the stable cross-device key
  const primaryEmail = activeAccounts[0]?.user.email ?? null
  // Encode email so it's safe as a Firestore document ID
  const docKey = primaryEmail ? encodeURIComponent(primaryEmail) : null

  // Ensure anonymous Firebase session exists (required to write to Firestore)
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseReady(true)
      } else {
        setFirebaseReady(false)
        signInAnonymously(auth).catch(console.error)
      }
    })
  }, [])

  // Real-time Firestore listener keyed by email — same data on all devices
  useEffect(() => {
    if (!docKey || !firebaseReady) { setPinned([]); return }

    const ref = collection(db, 'users', docKey, 'pinned')
    return onSnapshot(
      ref,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as PinnedItem)
        items.sort((a, b) => b.pinnedAt - a.pinnedAt)
        setPinned(items)
      },
      (err) => console.error('Firestore pinned error:', err)
    )
  }, [docKey, firebaseReady])

  const pinEmail = useCallback((email: ParsedEmail) => {
    if (!docKey || !firebaseReady) return
    const item: PinnedEmail = { type: 'email', id: email.id, data: email, pinnedAt: Date.now() }
    const sanitized = JSON.parse(JSON.stringify(item))
    setDoc(doc(db, 'users', docKey, 'pinned', `email_${email.id}`), sanitized).catch(console.error)
  }, [docKey, firebaseReady])

  const pinQuote = useCallback((quote: { id: number; quote: string; author: string }) => {
    if (!docKey || !firebaseReady) return
    const item: PinnedQuote = { type: 'quote', id: quote.id, data: quote, pinnedAt: Date.now() }
    setDoc(doc(db, 'users', docKey, 'pinned', `quote_${quote.id}`), item).catch(console.error)
  }, [docKey, firebaseReady])

  const unpin = useCallback((type: 'email' | 'quote', id: string | number) => {
    if (!docKey || !firebaseReady) return
    deleteDoc(doc(db, 'users', docKey, 'pinned', `${type}_${id}`)).catch(console.error)
  }, [docKey, firebaseReady])

  const reorder = useCallback((items: PinnedItem[]) => {
    if (!docKey || !firebaseReady) return
    const now = Date.now()
    items.forEach((item, i) => {
      const id = item.type === 'email' ? `email_${item.id}` : `quote_${item.id}`
      const pinnedAt = now + (items.length - i) * 1000
      updateDoc(doc(db, 'users', docKey, 'pinned', id), { pinnedAt }).catch(console.error)
    })
  }, [docKey, firebaseReady])

  const isPinned = useCallback(
    (type: 'email' | 'quote', id: string | number) =>
      pinned.some((p) => p.type === type && p.id === id),
    [pinned]
  )

  return (
    <PinnedContext.Provider value={{ pinned, pinEmail, pinQuote, unpin, isPinned, reorder }}>
      {children}
    </PinnedContext.Provider>
  )
}

export function usePinned() {
  const ctx = useContext(PinnedContext)
  if (!ctx) throw new Error('usePinned must be inside PinnedProvider')
  return ctx
}
