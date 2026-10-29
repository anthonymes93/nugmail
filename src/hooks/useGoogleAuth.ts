import { useGoogleLogin } from '@react-oauth/google'
import { signInAnonymously } from 'firebase/auth'
import { useCallback, useState } from 'react'
import { auth } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/gmail'

const GMAIL_SCOPE = 'https://mail.google.com/'

/**
 * ok: true  → refresh succeeded; token is the new access token
 * ok: false → refresh failed
 *   permanent: true  → no refresh token stored or token revoked; user must re-login
 *   permanent: false → transient error (network, 5xx); safe to retry later
 */
export type RefreshResult =
  | { ok: true; token: string }
  | { ok: false; permanent: boolean; reason: string }

export function useGoogleAuth() {
  const { addAccount, updateAccountToken } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const login = useGoogleLogin({
    scope: GMAIL_SCOPE,
    flow: 'auth-code',
    // GIS auth-code flow includes access_type=offline internally — it is designed for
    // server-side authorization and always issues a refresh token on first authorization.
    // select_account: true adds prompt=select_account so the account picker is shown,
    // which is important when the user is re-logging in after a session reset.
    select_account: true,
    onSuccess: async (codeResponse) => {
      setIsLoggingIn(true)
      setLoginError(null)
      try {
        console.log('[auth] OAuth code received — exchanging for tokens…')
        const res = await fetch('/api/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        })

        const raw = await res.text()
        let data: {
          access_token?: string
          expires_in?: number
          has_refresh_token?: boolean
          user?: User
          error?: string
          details?: { error?: string; error_description?: string }
        }
        try {
          data = JSON.parse(raw)
        } catch {
          throw new Error(
            'The token exchange endpoint did not return JSON. Check that /api/exchange-token is deployed as a serverless function and not rewritten to index.html.',
          )
        }
        if (!res.ok || !data.access_token || !data.user?.email) {
          console.error('[auth] Token exchange failed:', res.status, data)
          const reason = data.details?.error_description ?? data.details?.error ?? data.error
          throw new Error(reason ? `Google sign-in failed: ${reason}` : `Google sign-in failed (HTTP ${res.status}).`)
        }

        console.log('[auth] Token exchange succeeded for', data.user.email,
          '| expires_in:', data.expires_in, '| has_refresh_token:', data.has_refresh_token)
        if (!data.has_refresh_token) {
          console.warn('[auth] No new refresh token received. Sign-in works, but background renewal requires a previously saved refresh token.')
        }

        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth)
            console.log('[auth] Firebase anonymous sign-in succeeded')
          } catch (err) {
            // Gmail login is independent of Firestore authentication.
            console.warn('[auth] Firebase anonymous sign-in failed:', err)
          }
        }

        addAccount(data.access_token, data.expires_in ?? 3600, data.user)
        console.log('[auth] Account added to context for', data.user.email)
      } catch (err) {
        console.error('[auth] Sign-in could not be completed:', err)
        setLoginError(err instanceof Error ? err.message : 'An unexpected sign-in error occurred.')
      } finally {
        setIsLoggingIn(false)
      }
    },
    onError: (err) => {
      console.error('[auth] Google login error:', err)
      setIsLoggingIn(false)
      setLoginError('Google authorization was cancelled or blocked. Please try again.')
    },
  })

  const refreshAccount = useCallback(
    async (email: string): Promise<RefreshResult> => {
      console.log('[auth] Silent token refresh attempt for', email)
      try {
        const res = await fetch('/api/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        if (res.ok) {
          const { access_token, expires_in } = await res.json()
          if (!access_token) {
            console.warn('[auth] Refresh endpoint returned 200 but no access_token for', email)
            return { ok: false, permanent: false, reason: 'missing_token_in_response' }
          }
          updateAccountToken(email, access_token, expires_in ?? 3600)
          console.log('[auth] Silent refresh succeeded for', email, '| expires_in:', expires_in)
          return { ok: true, token: access_token }
        }

        // 404 → no Firestore record or no refresh token stored (permanent)
        // 401 → Google revoked the refresh token (permanent)
        // 5xx / 503 → transient server/infrastructure error (temporary)
        const permanent = res.status === 404 || res.status === 401
        const body = await res.json().catch(() => ({}))
        console.warn(
          '[auth] Refresh failed for', email,
          '| status:', res.status,
          '| permanent:', permanent,
          '| reason:', (body as { error?: string }).error ?? res.statusText,
        )
        return {
          ok: false,
          permanent,
          reason: (body as { error?: string }).error ?? String(res.status),
        }
      } catch (err) {
        console.warn('[auth] Refresh request threw (likely network error) for', email, err)
        return { ok: false, permanent: false, reason: 'network_error' }
      }
    },
    [updateAccountToken],
  )

  return { login, refreshAccount, loginError, isLoggingIn, clearLoginError: () => setLoginError(null) }
}
