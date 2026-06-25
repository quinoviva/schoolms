import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import knex from 'knex'
import dotenv from 'dotenv'

// Load environment variables from server/.env
dotenv.config({ path: 'server/.env' })

const sa = JSON.parse(readFileSync('serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(sa) })

const auth = getAuth()

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'academix',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  }
})

async function sync() {
  console.log('Fetching users from PostgreSQL database...')
  const users = await db('users').select('*')
  console.log(`Found ${users.length} users in database.\n`)

  for (const user of users) {
    if (!user.email) continue
    
    // Skip super-admin/admins that might already be configured manually if needed,
    // but we can try to sync them as well.
    const defaultPassword = 'test123'
    
    try {
      // Try to get user from Firebase
      let fbUser
      try {
        fbUser = await auth.getUserByEmail(user.email)
        console.log(`~ User already exists in Firebase Auth: ${user.email} (UID: ${fbUser.uid})`)
        
        // If UIDs don't match, we might need to delete and recreate or warn
        if (fbUser.uid !== user.id) {
          console.warn(`  [WARNING] UID mismatch! Firebase UID: ${fbUser.uid}, DB ID: ${user.id}. Re-creating...`)
          await auth.deleteUser(fbUser.uid)
          throw { code: 'auth/user-not-found' } // trigger catch block below to recreate
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          fbUser = await auth.createUser({
            uid: user.id,
            email: user.email,
            password: defaultPassword,
            displayName: user.name,
          })
          console.log(`✓ Created Firebase Auth user: ${user.email} with UID: ${user.id}`)
        } else {
          throw err
        }
      }

      // Ensure custom claims are set
      await auth.setCustomUserClaims(user.id, { role: user.role })
      console.log(`  Custom claim set: { role: "${user.role}" }`)
    } catch (error) {
      console.error(`✗ Error syncing user ${user.email}:`, error.message)
    }
  }

  console.log('\nSync completed successfully!')
  process.exit(0)
}

sync().catch(err => {
  console.error('Failed to sync users:', err)
  process.exit(1)
})
