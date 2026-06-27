import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'
import { randomUUID, randomBytes } from 'crypto'

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY
const EMAIL_DOMAIN = process.env.VITE_EMAIL_DOMAIN || '@schoolms.edu'

async function createFirebaseAuthUser(email: string, password: string) {
  if (!FIREBASE_API_KEY) {
    console.warn('FIREBASE_API_KEY not set — skipping Firebase Auth user creation')
    return null
  }
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to create Firebase auth user')
  }
  return res.json()
}

function generatePassword(): string {
  return randomBytes(6).toString('hex')
}

const router = Router()
router.use(verifyToken)

router.get('/', requireRole('super_admin'), async (_req, res) => {
  const rows = await db('schools').orderBy('created_at', 'desc')
  res.json(rows)
})

router.get('/:id', requireRole('super_admin'), async (req, res) => {
  const row = await db('schools').where('id', req.params.id).first()
  res.json(row || null)
})

router.get('/slug/:slug', requireRole('super_admin'), async (req, res) => {
  const row = await db('schools').where('slug', req.params.slug).first()
  res.json(row || null)
})

router.post('/', requireRole('super_admin'), async (req, res) => {
  const { id, name, slug, ownerName, ownerEmail, levels } = req.body
  if (!id || !name || !slug) {
    res.status(400).json({ error: 'id, name, and slug are required' })
    return
  }
  const now = Date.now()

  const adminEmail = `admin+${slug}${EMAIL_DOMAIN}`
  const adminPassword = generatePassword()

  await db('schools').insert({
    id, name, slug,
    owner_name: ownerName || null,
    owner_email: ownerEmail || null,
    levels: Array.isArray(levels) ? levels : ['kinder', 'elementary', 'highschool', 'senior_highschool'],
    created_at: now,
  })

  let adminId = randomUUID()

  const fbResult = await createFirebaseAuthUser(adminEmail, adminPassword).catch(e => {
    console.warn('Firebase Auth creation failed (continuing):', e.message)
    return null
  })

  if (fbResult?.localId) {
    adminId = fbResult.localId
  }

  await db('users').insert({
    id: adminId, email: adminEmail,
    name: `${name} Admin`, role: 'admin',
    school_id: id, created_at: now,
  })

  const row = await db('schools').where('id', id).first()
  res.status(201).json({ ...row, adminEmail, adminPassword })
})

router.put('/:id', requireRole('super_admin'), async (req, res) => {
  const allowed = ['name', 'ownerName', 'ownerEmail', 'levels', 'isActive']
  const updates: Record<string, unknown> = { updated_at: Date.now() }
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = req.body[f]
    }
  }
  await db('schools').where('id', req.params.id).update(updates)
  const row = await db('schools').where('id', req.params.id).first()
  res.json(row)
})

export default router
