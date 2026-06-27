import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || resolve(__dirname, '../../serviceAccountKey.json')

  if (serviceAccountBase64) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
      )
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    } catch (err) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err)
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'school-a1540' })
    }
  } else if (existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    } catch (err) {
      console.warn('Failed to load service account file:', err)
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'school-a1540' })
    }
  } else {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'school-a1540' })
  }
}

export const firebaseAuth = admin.auth()
export default admin
