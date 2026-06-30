import { getDb } from './_firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code } = req.body ?? {}
  if (!code) return res.status(400).json({ error: 'Missing code' })

  console.log('[exchange-token] Exchanging OAuth code for tokens…')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'postmessage',
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    console.error('[exchange-token] Google token exchange failed:', tokens)
    return res.status(400).json({ error: 'Token exchange failed', details: tokens })
  }

  const hasRefreshToken = !!tokens.refresh_token
  console.log('[exchange-token] Google responded — has_refresh_token:', hasRefreshToken, 'expires_in:', tokens.expires_in)
  if (!hasRefreshToken) {
    // This should never happen when the client sends access_type=offline + prompt=consent.
    // If it does, the stored refresh token (if any) will continue to be used, but if
    // this is a new user there will be no stored token and silent refresh will not work.
    console.warn('[exchange-token] WARNING: No refresh_token in Google response. Silent re-auth will fail after token expiry.')
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await userRes.json()
  const email = profile.email
  if (!email) {
    console.error('[exchange-token] Could not read email from userinfo:', profile)
    return res.status(400).json({ error: 'Could not fetch user email' })
  }

  console.log('[exchange-token] User email resolved:', email)

  try {
    const db = getDb()
    const update = {
      email,
      access_token: tokens.access_token,
      access_token_expiry: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      updated_at: Date.now(),
    }
    if (tokens.refresh_token) {
      update.refresh_token = tokens.refresh_token
      console.log('[exchange-token] Storing new refresh_token for', email)
    } else {
      // No new refresh token — preserve any existing one already in Firestore.
      console.log('[exchange-token] No new refresh_token received; preserving any existing record for', email)
    }
    await db.collection('push-registrations').doc(email).set(update, { merge: true })
    console.log('[exchange-token] Firestore record saved for', email)
  } catch (err) {
    // Firestore not configured or unavailable — still return the access token so login works,
    // but silent refresh will not work without the stored refresh token.
    console.error('[exchange-token] Firestore store failed (silent refresh will not work):', err.message)
  }

  return res.json({
    access_token: tokens.access_token,
    expires_in: tokens.expires_in ?? 3600,
    has_refresh_token: hasRefreshToken,
    user: { email, name: profile.name, picture: profile.picture },
  })
}
