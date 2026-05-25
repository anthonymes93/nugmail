import { getDb } from './_firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code } = req.body ?? {}
  if (!code) return res.status(400).json({ error: 'Missing code' })

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
    return res.status(400).json({ error: 'Token exchange failed', details: tokens })
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await userRes.json()
  const email = profile.email
  if (!email) return res.status(400).json({ error: 'Could not fetch user email' })

  try {
    const db = getDb()
    const update = {
      email,
      access_token: tokens.access_token,
      access_token_expiry: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      updated_at: Date.now(),
    }
    if (tokens.refresh_token) update.refresh_token = tokens.refresh_token
    await db.collection('push-registrations').doc(email).set(update, { merge: true })
  } catch (err) {
    // Firestore not configured — still return the access token so login works
    console.error('Firestore store failed:', err.message)
  }

  return res.json({
    access_token: tokens.access_token,
    expires_in: tokens.expires_in ?? 3600,
    user: { email, name: profile.name, picture: profile.picture },
  })
}
