import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', requireRole('admin', 'super_admin', 'teacher'), async (req, res) => {
  let q = db('users')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.role) q = q.where('role', req.query.role as string)
  if (req.query.section) q = q.where('section', req.query.section as string)

  if (req.userRole === 'teacher') {
    q = q.whereIn('role', ['student'])
    if (req.userSchoolId) q = q.where('school_id', req.userSchoolId)
  }
  if (req.userRole === 'admin' && req.userSchoolId) {
    q = q.where('school_id', req.userSchoolId)
  }

  const rows = await q.orderBy('name')
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db('users').where('id', req.params.id).first()
  if (!row) { res.json(null); return }
  if (req.userRole === 'teacher' && row.role !== 'student') {
    res.status(403).json({ error: 'Access denied' })
    return
  }
  res.json(row)
})

router.post('/', requireRole('admin', 'super_admin'), async (req, res) => {
  const { id, email, name, role, schoolId, section, nfcUid, lrn } = req.body
  if (!id || !email || !name || !role) {
    res.status(400).json({ error: 'id, email, name, and role are required' })
    return
  }
  const validRoles = ['student', 'teacher', 'admin']
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    return
  }
  await db('users').insert({
    id, email, name, role,
    school_id: schoolId || req.userSchoolId,
    section: section || null,
    nfc_uid: nfcUid || null,
    lrn: lrn || null,
    created_at: Date.now(),
  })
  const row = await db('users').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const allowed = ['name', 'section', 'role', 'nfcUid', 'lrn']
  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = req.body[f]
    }
  }
  if (updates.role && !['student', 'teacher', 'admin'].includes(updates.role as string)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  await db('users').where('id', req.params.id).update(updates)
  const row = await db('users').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  await db('users').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
