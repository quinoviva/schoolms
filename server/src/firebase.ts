import admin from 'firebase-admin'

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64

if (!admin.apps.length) {
  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
    )
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'school-a1540' })
  }
}

export const firebaseAuth = admin.auth()
export default admin
