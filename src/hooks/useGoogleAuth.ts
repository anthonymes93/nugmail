import { useGoogleLogin } from '@react-oauth/google'
import { signInAnonymously } from 'firebase/auth'
import { useCallback } from 'react'
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

  const login = useGoogleLogin({
    scope: GMAIL_SCOPE,
    flow: 'auth-code',
    // GIS auth-code flow includes access_type=offline internally — it is designed for
    // server-side authorization and always issues a refresh token on first authorization.
    // select_account: true adds prompt=select_account so the account picker is shown,
    // which is important when the user is re-logging in after a session reset.
    select_account: true,
    onSuccess: async (codeResponse) => {
      console.log('[auth] OAuth code received — exchanging for tokens…')
      const res = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeResponse.code }),
      })

      if (!res.ok) {
        console.error('[auth] Token exchange failed:', res.status, await res.text())
        return
      }

      const { access_token, expires_in, user, has_refresh_token } = await res.json()
      console.log(
        '[auth] Token exchange succeeded for', user?.email,
        '| expires_in:', expires_in,
        '| has_refresh_token:', has_refresh_token,
      )
      if (!has_refresh_token) {
        console.warn(
          '[auth] WARNING: No refresh token received from Google. ' +
          'The session will expire in ~1 hour and cannot be silently renewed. ' +
          'This should not happen — check that access_type=offline and prompt=consent are set.',
        )
      }

      const typedUser: User = { email: user.email, name: user.name, picture: user.picture }

      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth)
          console.log('[auth] Firebase anonymous sign-in succeeded')
        } catch (err) {
          console.error('[auth] Firebase anonymous sign-in failed:', err)
        }
      }

      addAccount(access_token, expires_in ?? 3600, typedUser)
      console.log('[auth] Account added to context for', user?.email)
    },
    onError: (err) => console.error('[auth] Google login error:', err),
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

  return { login, refreshAccount }
}
