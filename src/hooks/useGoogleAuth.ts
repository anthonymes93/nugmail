import { useGoogleLogin } from '@react-oauth/google'
import { signInAnonymously } from 'firebase/auth'
import { useCallback, useRef } from 'react'
import { auth } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/gmail'

const GMAIL_SCOPE = 'https://mail.google.com/'

export function useGoogleAuth() {
  const { addAccount, updateAccountToken } = useAuth()
  const refreshEmailRef = useRef<string | null>(null)

  const login = useGoogleLogin({
    scope: GMAIL_SCOPE,
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      const profile = (await res.json()) as { email: string; name: string; picture: string }
      const user: User = { email: profile.email, name: profile.name, picture: profile.picture }

      // Sign in anonymously so we get a stable Firebase uid for Firestore pins.
      // Anonymous auth persists in IndexedDB — uid survives page refreshes.
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth)
        } catch (err) {
          console.error('Firebase anonymous sign-in failed:', err)
        }
      }

      addAccount(tokenResponse.access_token, tokenResponse.expires_in ?? 3600, user)
    },
    onError: (err) => console.error('Login failed', err),
  })

  const refreshLogin = useGoogleLogin({
    scope: GMAIL_SCOPE,
    flow: 'implicit',
    prompt: 'none',
    onSuccess: (tokenResponse) => {
      const email = refreshEmailRef.current
      refreshEmailRef.current = null
      if (!email) return
      updateAccountToken(email, tokenResponse.access_token, tokenResponse.expires_in ?? 3600)
    },
    onError: (err) => {
      refreshEmailRef.current = null
      console.warn('Silent token refresh failed', err)
    },
    onNonOAuthError: (err) => {
      refreshEmailRef.current = null
      console.warn('Silent token refresh was not available', err)
    },
  })

  const refreshAccount = useCallback((email: string) => {
    refreshEmailRef.current = email
    refreshLogin({ prompt: 'none', hint: email })
  }, [refreshLogin])

  return { login, refreshAccount }
}
