const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''
const PREF_KEY = 'nugmail_notif_prefs'

// Module-level subscription cache shared across all hook instances
let cachedSubscription: PushSubscription | null = null

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)))
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    setTimeout(() => ctx.close(), 1000)
  } catch {
    // AudioContext unavailable
  }
}

interface Prefs {
  enabled: boolean
  sound: boolean
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (raw) return JSON.parse(raw) as Prefs
  } catch {}
  return { enabled: false, sound: true }
}

function savePrefs(prefs: Prefs) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
}

async function fetchSubscription(): Promise<PushSubscription | null> {
  if (cachedSubscription) return cachedSubscription
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    cachedSubscription = sub
    return sub
  } catch {
    return null
  }
}

async function createSubscription(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    })
    cachedSubscription = sub
    return sub
  } catch {
    return null
  }
}

import { useCallback, useEffect, useState } from 'react'

export function usePushNotifications() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const isSupported =
    typeof Notification !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  // Restore cached subscription on mount if already enabled
  useEffect(() => {
    if (prefs.enabled && permission === 'granted') {
      void fetchSubscription()
    }
  }, []) // intentionally only on mount

  const enable = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return false
    const sub = await createSubscription()
    if (!sub) return false
    updatePrefs({ enabled: true })
    return true
  }, [isSupported, updatePrefs])

  const disable = useCallback(async () => {
    try { await cachedSubscription?.unsubscribe() } catch {}
    cachedSubscription = null
    updatePrefs({ enabled: false })
  }, [updatePrefs])

  const toggleSound = useCallback(
    (on: boolean) => updatePrefs({ sound: on }),
    [updatePrefs]
  )

  // notify() reads fresh prefs from localStorage so it always reflects
  // the latest enabled/sound state regardless of which component calls it
  const notify = useCallback(
    async (payload: { title: string; body?: string; messageId?: string }) => {
      const currentPrefs = loadPrefs()
      if (!currentPrefs.enabled) return
      const currentPermission =
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
      if (currentPermission !== 'granted') return

      if (currentPrefs.sound) playBeep()

      const sub = cachedSubscription ?? (await fetchSubscription())
      if (!sub) return

      try {
        await fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            payload: { ...payload, silent: !currentPrefs.sound },
          }),
        })
      } catch {}
    },
    []
  )

  return { enabled: prefs.enabled, sound: prefs.sound, permission, isSupported, enable, disable, toggleSound, notify }
}
