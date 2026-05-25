import { getDb } from './_firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body ?? {}
  if (!email) return res.status(400).json({ error: 'Missing email' })

  let db
  try {
    db = getDb()
  } catch {
    return res.status(503).json({ error: 'Storage unavailable' })
  }

  const doc = await db.collection('push-registrations').doc(email).get()
  const data = doc.data() ?? {}
  const { refresh_token, access_token, access_token_expiry } = data

  // Return cached token if still valid for more than 60 seconds
  if (access_token && Date.now() < (access_token_expiry ?? 0) - 60_000) {
    return res.json({
      access_token,
      expires_in: Math.floor(((access_token_expiry ?? 0) - Date.now()) / 1000),
    })
  }

  if (!refresh_token) return res.status(404).json({ error: 'No refresh token stored' })

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.access_token) return res.status(400).json({ error: 'Refresh failed' })

  const newExpiry = Date.now() + (tokens.expires_in ?? 3600) * 1000
  await db.collection('push-registrations').doc(email).update({
    access_token: tokens.access_token,
    access_token_expiry: newExpiry,
  })

  return res.json({ access_token: tokens.access_token, expires_in: tokens.expires_in ?? 3600 })
}
