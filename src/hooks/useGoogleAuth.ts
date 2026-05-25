import { useGoogleLogin } from '@react-oauth/google'
import { signInAnonymously } from 'firebase/auth'
import { useCallback } from 'react'
import { auth } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/gmail'

const GMAIL_SCOPE = 'https://mail.google.com/'

export function useGoogleAuth() {
  const { addAccount, updateAccountToken } = useAuth()

  const login = useGoogleLogin({
    scope: GMAIL_SCOPE,
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      const res = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeResponse.code }),
      })

      if (!res.ok) {
        console.error('Token exchange failed', await res.text())
        return
      }

      const { access_token, expires_in, user } = await res.json()
      const typedUser: User = { email: user.email, name: user.name, picture: user.picture }

      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth)
        } catch (err) {
          console.error('Firebase anonymous sign-in failed:', err)
        }
      }

      addAccount(access_token, expires_in ?? 3600, typedUser)
    },
    onError: (err) => console.error('Login failed', err),
  })

  const refreshAccount = useCallback(
    async (email: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) return null
        const { access_token, expires_in } = await res.json()
        if (!access_token) return null
        updateAccountToken(email, access_token, expires_in ?? 3600)
        return access_token
      } catch {
        return null
      }
    },
    [updateAccountToken]
  )

  return { login, refreshAccount }
}
