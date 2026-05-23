import { useGoogleLogin } from '@react-oauth/google'
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
      addAccount(tokenResponse.access_token, tokenResponse.expires_in ?? 3600, user)
    },
    onError: (err) => console.error('Login failed', err),
  })

  return { login }
}
