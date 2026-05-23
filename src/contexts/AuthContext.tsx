import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { Account, User } from '../types/gmail'

const STORAGE_KEY = 'nugmail_accounts_v1'

function loadFromStorage(): Account[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Account[]
  } catch {
    return []
  }
}

function saveToStorage(accounts: Account[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function isAccountActive(account: Account) {
  return Date.now() < account.tokenExpiry - 60_000
}

interface AuthContextType {
  accounts: Account[]
  activeAccounts: Account[]
  isAuthenticated: boolean
  addAccount: (token: string, expiresIn: number, user: User) => void
  removeAccount: (email: string) => void
  clearAll: () => void
  getToken: (email: string) => string | undefined
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(loadFromStorage)

  const addAccount = useCallback((token: string, expiresIn: number, user: User) => {
    setAccounts((prev) => {
      // Replace if same email already exists
      const filtered = prev.filter((a) => a.user.email !== user.email)
      const next = [
        ...filtered,
        { accessToken: token, tokenExpiry: Date.now() + expiresIn * 1000, user },
      ]
      saveToStorage(next)
      return next
    })
  }, [])

  const removeAccount = useCallback((email: string) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.user.email !== email)
      saveToStorage(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setAccounts([])
    signOut(auth).catch(console.error)
  }, [])

  const getToken = useCallback(
    (email: string) => {
      const account = accounts.find((a) => a.user.email === email)
      if (!account || !isAccountActive(account)) return undefined
      return account.accessToken
    },
    [accounts]
  )

  const activeAccounts = accounts.filter(isAccountActive)

  return (
    <AuthContext.Provider
      value={{
        accounts,
        activeAccounts,
        isAuthenticated: activeAccounts.length > 0,
        addAccount,
        removeAccount,
        clearAll,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
