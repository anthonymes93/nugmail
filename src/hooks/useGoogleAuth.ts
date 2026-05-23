import { useGoogleLogin } from '@react-oauth/google'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/gmail'

export function useGoogleAuth() {
  const { addAccount } = useAuth()

  // Used only when Firebase already has a session (adding a second Gmail account)
  const loginImplicit = useGoogleLogin({
    scope: 'https://mail.google.com/',
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      const profile = (await res.json()) as { email: string; name: string; picture: string }
      const user: User = { email: profile.email, name: profile.name, picture: profile.picture }
      addAccount(tokenResponse.access_token, tokenResponse.expires_in ?? 3600, user)
    },
    onError: (err) => console.error('Login failed', err),
  })

  const login = async () => {
    if (auth.currentUser) {
      // Additional account — keep existing Firebase session, just get Gmail token
      loginImplicit()
      return
    }

    // First account — signInWithPopup creates a real Firebase session that persists on refresh
    const provider = new GoogleAuthProvider()
    provider.addScope('https://mail.google.com/')
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (!credential?.accessToken) throw new Error('No access token from Firebase')
      const user: User = {
        email: result.user.email ?? '',
        name: result.user.displayName ?? '',
        picture: result.user.photoURL ?? '',
      }
      addAccount(credential.accessToken, 3600, user)
    } catch (err) {
      console.error('Firebase login failed:', err)
    }
  }

  return { login }
}
