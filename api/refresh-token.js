import { getDb } from './_firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body ?? {}
  if (!email) return res.status(400).json({ error: 'Missing email' })

  console.log('[refresh-token] Refresh request for', email)

  let db
  try {
    db = getDb()
  } catch (err) {
    console.error('[refresh-token] Firestore init failed:', err.message)
    // 503 = transient; client should retry, not remove the account.
    return res.status(503).json({ error: 'Storage unavailable' })
  }

  let doc
  try {
    doc = await db.collection('push-registrations').doc(email).get()
  } catch (err) {
    console.error('[refresh-token] Firestore read failed:', err.message)
    return res.status(503).json({ error: 'Storage read failed' })
  }

  if (!doc.exists) {
    // No record at all — user never completed login through this server, or record was deleted.
    // 404 = permanent from the client's perspective; user must sign in again.
    console.warn('[refresh-token] No Firestore record for', email, '— user must re-login')
    return res.status(404).json({ error: 'No record found — user must re-login' })
  }

  const data = doc.data() ?? {}
  const { refresh_token, access_token, access_token_expiry } = data

  // Return cached access token if it is still valid for more than 60 seconds.
  if (access_token && Date.now() < (access_token_expiry ?? 0) - 60_000) {
    const remainingSecs = Math.floor(((access_token_expiry ?? 0) - Date.now()) / 1000)
    console.log('[refresh-token] Returning cached token for', email, '— valid for', remainingSecs, 's')
    return res.json({ access_token, expires_in: remainingSecs })
  }

  if (!refresh_token) {
    // Record exists but has no refresh token — this happens when the original OAuth
    // flow did not request access_type=offline. 404 = permanent; user must re-login.
    console.warn('[refresh-token] No refresh_token in record for', email, '— user must re-login')
    return res.status(404).json({ error: 'No refresh token stored — user must re-login' })
  }

  console.log('[refresh-token] Requesting new access_token from Google for', email)

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

  if (!tokens.access_token) {
    // 'invalid_grant' means the refresh token was revoked or expired — permanent failure.
    // Any other Google error is treated as transient (Google may be temporarily unavailable).
    const isRevoked = tokens.error === 'invalid_grant'
    console.error('[refresh-token] Google refused refresh for', email, '— error:', tokens.error, '| permanent:', isRevoked)
    if (isRevoked) {
      // 401 = permanent; client will remove the account and show login screen.
      return res.status(401).json({ error: 'Refresh token revoked — user must re-login', google_error: tokens.error })
    }
    // 502 = transient upstream error; client should retry later.
    return res.status(502).json({ error: 'Google token refresh failed', google_error: tokens.error })
  }

  const newExpiry = Date.now() + (tokens.expires_in ?? 3600) * 1000
  try {
    await db.collection('push-registrations').doc(email).update({
      access_token: tokens.access_token,
      access_token_expiry: newExpiry,
    })
  } catch (err) {
    // Cache update failed — still return the new token; worst case is we re-call Google next time.
    console.warn('[refresh-token] Failed to cache new access_token for', email, ':', err.message)
  }

  console.log('[refresh-token] Refresh succeeded for', email, '— expires_in:', tokens.expires_in)
  return res.json({ access_token: tokens.access_token, expires_in: tokens.expires_in ?? 3600 })
}
