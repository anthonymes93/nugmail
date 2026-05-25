import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function getDb() {
  if (!getApps().length) {
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!keyJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set')
    initializeApp({ credential: cert(JSON.parse(keyJson)) })
  }
  return getFirestore()
}
