import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('terms')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, label, semester, schoolId } = req.body
  await db('terms').insert({
    id, label, semester, school_id: schoolId,
    is_active: false, is_archived: false,
    created_at: Date.now(),
  })
  const row = await db('terms').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const updates: Record<string, unknown> = {}
  if (req.body.label !== undefined) updates.label = req.body.label
  if (req.body.semester !== undefined) updates.semester = req.body.semester
  if (req.body.isActive !== undefined) updates.is_active = req.body.isActive
  if (req.body.isArchived !== undefined) updates.is_archived = req.body.isArchived
  await db('terms').where('id', req.params.id).update(updates)
  const row = await db('terms').where('id', req.params.id).first()
  res.json(row)
})

export default router
