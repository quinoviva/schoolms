import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const sa = JSON.parse(readFileSync('serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(sa) })

const auth = getAuth()
const db = getFirestore()

async function main() {
  // 1. Create new admin Auth user
  let newUid
  try {
    const user = await auth.createUser({
      email: 'dev-cyril@schoolms.edu',
      password: 'cyril2026',
      displayName: 'Dev Cyril',
    })
    newUid = user.uid
    console.log('✓ Created Auth user: dev-cyril@schoolms.edu')
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const user = await auth.getUserByEmail('dev-cyril@schoolms.edu')
      newUid = user.uid
      console.log('~ Auth user already exists: dev-cyril@schoolms.edu')
    } else {
      throw err
    }
  }

  // 2. Create Firestore user doc with admin role
  await db.collection('users').doc(newUid).set({
    email: 'dev-cyril@schoolms.edu',
    name: 'Dev Cyril',
    role: 'admin',
    section: '',
    nfcUid: '',
  })
  console.log('✓ Created Firestore user doc with role: admin')

  // 3. Delete old admin account if it exists
  try {
    const oldUser = await auth.getUserByEmail('admin@schoolms.edu')
    await auth.deleteUser(oldUser.uid)
    console.log('✓ Deleted old admin: admin@schoolms.edu')
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('~ Old admin not found, skipping deletion')
    } else {
      throw err
    }
  }

  // 4. Clean up Firestore doc for old admin if it exists
  try {
    const oldAdminQuery = await db.collection('users').where('email', '==', 'admin@schoolms.edu').get()
    for (const doc of oldAdminQuery.docs) {
      await doc.ref.delete()
      console.log('✓ Deleted old Firestore user doc: admin@schoolms.edu')
    }
  } catch (err) {
    console.log('~ Error cleaning old Firestore doc:', err.message)
  }

  console.log('\n✓ Admin credentials updated!')
  console.log('   Login: dev-cyril')
  console.log('   Password: cyril2026')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
