import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, onSnapshot, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useAuth } from './AuthContext'

export interface Goal {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt?: number
}

interface GoalsContextType {
  goals: Goal[]
  addGoal: (text: string) => void
  toggleGoal: (id: string, completed: boolean) => void
  deleteGoal: (id: string) => void
}

const GoalsContext = createContext<GoalsContextType | null>(null)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [firebaseReady, setFirebaseReady] = useState(!!auth.currentUser)
  const { activeAccounts } = useAuth()

  const primaryEmail = activeAccounts[0]?.user.email ?? null
  const docKey = primaryEmail ? encodeURIComponent(primaryEmail) : null

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setFirebaseReady(!!user))
  }, [])

  useEffect(() => {
    if (!docKey || !firebaseReady) { setGoals([]); return }
    const ref = collection(db, 'users', docKey, 'goals')
    return onSnapshot(
      ref,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Goal)
        items.sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt)
        setGoals(items)
      },
      (err) => console.error('Firestore goals error:', err)
    )
  }, [docKey, firebaseReady])

  const addGoal = useCallback((text: string) => {
    const cleanText = text.trim()
    if (!docKey || !firebaseReady || !cleanText) return
    const id = Date.now().toString()
    const goal: Goal = { id, text: cleanText, completed: false, createdAt: Date.now() }
    setDoc(doc(db, 'users', docKey, 'goals', id), goal).catch(console.error)
  }, [docKey, firebaseReady])

  const toggleGoal = useCallback((id: string, completed: boolean) => {
    if (!docKey || !firebaseReady) return
    updateDoc(doc(db, 'users', docKey, 'goals', id), {
      completed,
      completedAt: completed ? Date.now() : null,
    }).catch(console.error)
  }, [docKey, firebaseReady])

  const deleteGoal = useCallback((id: string) => {
    if (!docKey || !firebaseReady) return
    deleteDoc(doc(db, 'users', docKey, 'goals', id)).catch(console.error)
  }, [docKey, firebaseReady])

  return (
    <GoalsContext.Provider value={{ goals, addGoal, toggleGoal, deleteGoal }}>
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals() {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error('useGoals must be inside GoalsProvider')
  return ctx
}
