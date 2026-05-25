import webpush from 'web-push'
import { getDb } from './_firebase-admin.js'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`
  // External services (cron-job.org) can send `x-cron-secret: <CRON_SECRET>`
  return (
    req.headers.authorization === `Bearer ${secret}` ||
    req.headers['x-cron-secret'] === secret
  )
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  let db
  try {
    db = getDb()
  } catch {
    return res.status(503).json({ error: 'Storage unavailable' })
  }

  const snapshot = await db.collection('push-registrations').get()
  const results = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const {
      email,
      subscription,
      refresh_token,
      access_token,
      access_token_expiry,
      last_seen_ids = [],
      sound = true,
    } = data

    if (!subscription?.endpoint || !refresh_token) continue

    try {
      let token = access_token

      // Refresh token if expired or expiring within 60s
      if (!token || Date.now() > (access_token_expiry ?? 0) - 60_000) {
        const refreshed = await refreshAccessToken(refresh_token)
        if (refreshed.access_token) {
          token = refreshed.access_token
          await doc.ref.update({
            access_token: token,
            access_token_expiry: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
          })
        }
      }

      if (!token) {
        results.push({ email, error: 'no valid token' })
        continue
      }

      // Fetch recent inbox messages
      const listRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=20',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const listData = await listRes.json()

      if (listData.error) {
        results.push({ email, error: listData.error.message })
        continue
      }

      const messages = listData.messages ?? []

      // First run — initialize without notifying
      if (last_seen_ids.length === 0) {
        await doc.ref.update({ last_seen_ids: messages.map((m) => m.id) })
        results.push({ email, sent: 0, initialized: true })
        continue
      }

      const seenSet = new Set(last_seen_ids)
      const newMessages = messages.filter((m) => !seenSet.has(m.id))

      if (newMessages.length === 0) {
        results.push({ email, sent: 0 })
        continue
      }

      let sent = 0
      for (const msg of newMessages.slice(0, 3)) {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const detail = await detailRes.json()
        const headers = detail.payload?.headers ?? []
        const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
        const from = headers.find((h) => h.name === 'From')?.value ?? ''

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({ title: subject, body: from, messageId: msg.id, silent: !sound })
          )
          sent++
        } catch (pushErr) {
          if (pushErr.statusCode === 410) {
            // Subscription is gone — clear it so we stop trying
            await doc.ref.update({ subscription: null })
          }
        }
      }

      // Update seen IDs to the current page of messages
      await doc.ref.update({ last_seen_ids: messages.map((m) => m.id) })
      results.push({ email, sent })
    } catch (err) {
      results.push({ email, error: err.message })
    }
  }

  return res.json({ processed: results, at: new Date().toISOString() })
}
