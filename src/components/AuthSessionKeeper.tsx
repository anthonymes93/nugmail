import { useEffect, useRef } from 'react'
import { isAccountActive, useAuth } from '../contexts/AuthContext'
import { useGoogleAuth } from '../hooks/useGoogleAuth'

// Start refreshing 5 minutes before the token actually expires.
const REFRESH_BUFFER_MS = 5 * 60 * 1000
// After a transient failure (network error, 5xx), wait 5 minutes before retrying.
// This is much shorter than the old 30-minute window so a blip doesn't leave the
// user with an expired token for half an hour.
const RETRY_AFTER_TEMP_MS = 5 * 60 * 1000

function shouldRefresh(tokenExpiry: number) {
  return Date.now() >= tokenExpiry - REFRESH_BUFFER_MS
}

export default function AuthSessionKeeper() {
  const { accounts, removeAccount } = useAuth()
  const { refreshAccount } = useGoogleAuth()
  // Tracks the last time we attempted a refresh for each email (to throttle retries).
  const attemptedAt = useRef<Record<string, number>>({})
  // Tracks emails that have permanently failed (no refresh token / revoked).
  // These accounts are already removed; tracking here prevents double-remove races.
  const permanentlyFailed = useRef<Set<string>>(new Set())

  useEffect(() => {
    console.log(
      '[AuthSessionKeeper] Tick — accounts:',
      accounts.map((a) => `${a.user.email} (expires in ${Math.round((a.tokenExpiry - Date.now()) / 1000)}s)`),
    )

    const refreshDueAccounts = async () => {
      for (const account of accounts) {
        const email = account.user.email
        if (permanentlyFailed.current.has(email)) continue

        const active = isAccountActive(account)
        const needsRefresh = !active || shouldRefresh(account.tokenExpiry)
        if (!needsRefresh) continue

        const lastAttempt = attemptedAt.current[email] ?? 0
        if (Date.now() - lastAttempt < RETRY_AFTER_TEMP_MS) continue

        console.log('[AuthSessionKeeper] Refreshing token for', email, {
          active,
          expiresIn: `${Math.round((account.tokenExpiry - Date.now()) / 1000)}s`,
        })

        attemptedAt.current[email] = Date.now()
        const result = await refreshAccount(email)

        if (result.ok) {
          console.log('[AuthSessionKeeper] Token refresh succeeded for', email)
        } else if (result.permanent) {
          // No refresh token stored or Google has revoked it — nothing we can do silently.
          // Remove the account so the user sees the login screen instead of silent failures.
          console.warn(
            '[AuthSessionKeeper] Permanent refresh failure for', email,
            '— removing account so user can re-login. Reason:', result.reason,
          )
          permanentlyFailed.current.add(email)
          removeAccount(email)
        } else {
          // Transient failure (network error, 5xx). Keep the account; the user will
          // either succeed on the next tick or see a query error with a Retry button.
          console.warn(
            '[AuthSessionKeeper] Transient refresh failure for', email,
            `— will retry in ${RETRY_AFTER_TEMP_MS / 60_000} min. Reason:`, result.reason,
          )
        }
      }
    }

    void refreshDueAccounts()
    const id = window.setInterval(() => void refreshDueAccounts(), 60_000)
    return () => window.clearInterval(id)
  }, [accounts, refreshAccount, removeAccount])

  return null
}
