import webpush from 'web-push'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Method not allowed' })
  }

  const { subscription, payload } = req.body ?? {}

  if (!subscription?.endpoint || !payload) {
    return send(res, 400, { error: 'Missing subscription or payload' })
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    send(res, 200, { success: true })
  } catch (err) {
    // 410 Gone means the subscription is expired/invalid
    const status = err.statusCode === 410 ? 410 : 500
    send(res, status, { error: err.message })
  }
}
