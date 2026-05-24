import { useEffect, useRef } from 'react'
import { isAccountActive, useAuth } from '../contexts/AuthContext'
import { useGoogleAuth } from '../hooks/useGoogleAuth'

const REFRESH_BUFFER_MS = 5 * 60 * 1000
const RETRY_AFTER_MS = 30 * 60 * 1000

function shouldRefresh(tokenExpiry: number) {
  return Date.now() >= tokenExpiry - REFRESH_BUFFER_MS
}

export default function AuthSessionKeeper() {
  const { accounts } = useAuth()
  const { refreshAccount } = useGoogleAuth()
  const attemptedAt = useRef<Record<string, number>>({})

  useEffect(() => {
    const refreshDueAccounts = () => {
      const account = accounts.find((item) => {
        if (isAccountActive(item) && !shouldRefresh(item.tokenExpiry)) return false

        const lastAttempt = attemptedAt.current[item.user.email] ?? 0
        return Date.now() - lastAttempt >= RETRY_AFTER_MS
      })

      if (account) {
        attemptedAt.current[account.user.email] = Date.now()
        refreshAccount(account.user.email)
      }
    }

    refreshDueAccounts()
    const id = window.setInterval(refreshDueAccounts, 60_000)
    return () => window.clearInterval(id)
  }, [accounts, refreshAccount])

  return null
}
