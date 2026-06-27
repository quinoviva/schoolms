import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('terms')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', requireRole('admin', 'super_admin'), async (req, res) => {
  const { id, label, semester, schoolId } = req.body
  if (!id || !label || !semester) {
    res.status(400).json({ error: 'id, label, and semester are required' })
    return
  }
  await db('terms').insert({
    id, label, semester, school_id: schoolId,
    is_active: false, is_archived: false,
    created_at: Date.now(),
  })
  const row = await db('terms').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const allowed = ['label', 'semester', 'isActive', 'isArchived']
  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = req.body[f]
    }
  }
  await db('terms').where('id', req.params.id).update(updates)
  const row = await db('terms').where('id', req.params.id).first()
  res.json(row)
})

export default router
