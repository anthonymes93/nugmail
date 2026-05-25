import { useEffect, useRef } from 'react'
import { isAccountActive, useAuth } from '../contexts/AuthContext'
import { useGoogleAuth } from '../hooks/useGoogleAuth'

const REFRESH_BUFFER_MS = 5 * 60 * 1000
const RETRY_AFTER_MS = 30 * 60 * 1000

function shouldRefresh(tokenExpiry: number) {
  return Date.now() >= tokenExpiry - REFRESH_BUFFER_MS
}

export default function AuthSessionKeeper() {
  const { accounts, removeAccount } = useAuth()
  const { refreshAccount } = useGoogleAuth()
  const attemptedAt = useRef<Record<string, number>>({})

  useEffect(() => {
    const refreshDueAccounts = async () => {
      const account = accounts.find((item) => {
        if (isAccountActive(item) && !shouldRefresh(item.tokenExpiry)) return false
        const lastAttempt = attemptedAt.current[item.user.email] ?? 0
        return Date.now() - lastAttempt >= RETRY_AFTER_MS
      })

      if (account) {
        attemptedAt.current[account.user.email] = Date.now()
        const token = await refreshAccount(account.user.email)
        if (!token) {
          // Server has no refresh token (e.g. pre-dates background push setup) — force re-login
          removeAccount(account.user.email)
        }
      }
    }

    void refreshDueAccounts()
    const id = window.setInterval(() => void refreshDueAccounts(), 60_000)
    return () => window.clearInterval(id)
  }, [accounts, refreshAccount, removeAccount])

  return null
}
