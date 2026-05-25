import { getDb } from './_firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, subscription, sound } = req.body ?? {}
  if (!email || !subscription?.endpoint) {
    return res.status(400).json({ error: 'Missing email or subscription' })
  }

  try {
    const db = getDb()
    await db.collection('push-registrations').doc(email).set(
      { subscription, sound: sound ?? true, updated_at: Date.now() },
      { merge: true }
    )
    return res.json({ success: true })
  } catch (err) {
    return res.status(503).json({ error: 'Storage unavailable' })
  }
}
