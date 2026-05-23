import { useGoogleLogin } from '@react-oauth/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/gmail'

export function useGoogleAuth() {
  const { addAccount, accounts } = useAuth()

  const login = useGoogleLogin({
    scope: 'https://mail.google.com/',
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      const profile = (await res.json()) as { email: string; name: string; picture: string }
      const user: User = { email: profile.email, name: profile.name, picture: profile.picture }

      // Sign into Firebase for the primary account only (first sign-in)
      // Firebase Auth persists across refreshes via IndexedDB automatically
      if (accounts.length === 0 && !auth.currentUser) {
        try {
          const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token)
          await signInWithCredential(auth, credential)
        } catch (err) {
          // Non-fatal — app works without Firebase Auth, just no Firestore
          console.warn('Firebase sign-in failed:', err)
        }
      }

      addAccount(tokenResponse.access_token, tokenResponse.expires_in ?? 3600, user)
    },
    onError: (err) => console.error('Login failed', err),
  })

  return { login }
}
