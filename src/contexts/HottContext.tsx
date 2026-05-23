import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import type { ParsedEmail } from '../types/gmail'

export interface HottEmail {
  type: 'email'
  id: string
  data: ParsedEmail
  addedAt: number
}

export type HottItem = HottEmail

interface HottContextType {
  hott: HottItem[]
  addToHott: (email: ParsedEmail) => void
  removeFromHott: (id: string) => void
  isHott: (id: string) => boolean
}

const HottContext = createContext<HottContextType | null>(null)

export function HottProvider({ children }: { children: ReactNode }) {
  const [hott, setHott] = useState<HottItem[]>([])
  const [firebaseReady, setFirebaseReady] = useState(!!auth.currentUser)
  const { activeAccounts } = useAuth()

  const primaryEmail = activeAccounts[0]?.user.email ?? null
  const docKey = primaryEmail ? encodeURIComponent(primaryEmail) : null

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setFirebaseReady(!!user))
  }, [])

  useEffect(() => {
    if (!docKey || !firebaseReady) { setHott([]); return }
    const ref = collection(db, 'users', docKey, 'hott')
    return onSnapshot(
      ref,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as HottItem)
        items.sort((a, b) => b.addedAt - a.addedAt)
        setHott(items)
      },
      (err) => console.error('Firestore hott error:', err)
    )
  }, [docKey, firebaseReady])

  const addToHott = useCallback((email: ParsedEmail) => {
    if (!docKey || !firebaseReady) return
    const item: HottEmail = { type: 'email', id: email.id, data: email, addedAt: Date.now() }
    setDoc(doc(db, 'users', docKey, 'hott', `email_${email.id}`), JSON.parse(JSON.stringify(item))).catch(console.error)
  }, [docKey, firebaseReady])

  const removeFromHott = useCallback((id: string) => {
    if (!docKey || !firebaseReady) return
    deleteDoc(doc(db, 'users', docKey, 'hott', `email_${id}`)).catch(console.error)
  }, [docKey, firebaseReady])

  const isHott = useCallback((id: string) => hott.some((h) => h.id === id), [hott])

  return (
    <HottContext.Provider value={{ hott, addToHott, removeFromHott, isHott }}>
      {children}
    </HottContext.Provider>
  )
}

export function useHott() {
  const ctx = useContext(HottContext)
  if (!ctx) throw new Error('useHott must be inside HottProvider')
  return ctx
}
