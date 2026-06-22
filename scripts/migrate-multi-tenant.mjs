import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const sa = JSON.parse(readFileSync('serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(sa) })

const db = getFirestore()
const auth = getAuth()

async function main() {
  // 1. Create default school
  const schoolRef = db.collection('schools').doc('default')
  const schoolSnap = await schoolRef.get()
  if (!schoolSnap.exists) {
    await schoolRef.set({
      name: 'Default School',
      slug: 'default',
      plan: 'free',
      isActive: true,
      ownerName: 'System',
      ownerEmail: 'dev-cyril@schoolms.edu',
      createdAt: Date.now(),
    })
    console.log('✓ Created default school')
  } else {
    console.log('~ Default school already exists')
  }
  const schoolId = schoolRef.id

  // 2. Update all existing users with schoolId
  const usersSnap = await db.collection('users').get()
  let updated = 0
  for (const doc of usersSnap.docs) {
    if (!doc.data().schoolId) {
      await doc.ref.update({ schoolId })
      updated++
    }
  }
  console.log(`✓ Updated ${updated} user(s) with schoolId`)

  // 3. Update all other collections with schoolId
  const collections = ['terms', 'subjects', 'classes', 'enrollments', 'grades', 'attendance', 'announcements', 'assignments', 'sections', 'auditLogs', 'gradeReleases', 'driveLinks', 'materials', 'seatPlans']
  for (const col of collections) {
    const snap = await db.collection(col).get()
    let c = 0
    for (const doc of snap.docs) {
      if (!doc.data().schoolId) {
        await doc.ref.update({ schoolId })
        c++
      }
    }
    if (c > 0) console.log(`  ✓ ${col}: updated ${c} document(s)`)
  }

  // 4. Make dev-cyril a super_admin
  try {
    const user = await auth.getUserByEmail('dev-cyril@schoolms.edu')
    await db.collection('users').doc(user.uid).update({ role: 'super_admin' })
    console.log('✓ dev-cyril role changed to super_admin')
  } catch (err) {
    console.error('✗ Failed to update dev-cyril role:', err.message)
  }

  console.log('\nMigration complete!')
}

main().catch(console.error)
