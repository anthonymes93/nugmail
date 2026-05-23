import { useGoogleLogin } from '@react-oauth/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/gmail'

export function useGoogleAuth() {
  const { addAccount } = useAuth()

  const login = useGoogleLogin({
    scope: 'https://mail.google.com/',
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      const profile = (await res.json()) as { email: string; name: string; picture: string }
      const user: User = { email: profile.email, name: profile.name, picture: profile.picture }

      // Sign into Firebase whenever we don't already have an active Firebase session.
      // Firebase persists its own auth state via IndexedDB, so this is usually a no-op
      // on refresh. It only runs when Firebase session is missing or expired.
      if (!auth.currentUser) {
        try {
          const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token)
          await signInWithCredential(auth, credential)
        } catch (err) {
          console.error('Firebase sign-in failed:', err)
        }
      }

      addAccount(tokenResponse.access_token, tokenResponse.expires_in ?? 3600, user)
    },
    onError: (err) => console.error('Login failed', err),
  })

  return { login }
}
