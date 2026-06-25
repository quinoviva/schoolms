import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('users')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.role) q = q.where('role', req.query.role as string)
  if (req.query.section) q = q.where('section', req.query.section as string)
  const rows = await q.orderBy('name')
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db('users').where('id', req.params.id).first()
  res.json(row || null)
})

router.post('/', async (req, res) => {
  const { id, email, name, role, schoolId, section, nfcUid, lrn } = req.body
  await db('users').insert({
    id, email, name, role,
    school_id: schoolId,
    section: section || null,
    nfc_uid: nfcUid || null,
    lrn: lrn || null,
    created_at: Date.now(),
  })
  const row = await db('users').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const updates: Record<string, unknown> = {}
  if (req.body.name !== undefined) updates.name = req.body.name
  if (req.body.section !== undefined) updates.section = req.body.section || null
  if (req.body.role !== undefined) updates.role = req.body.role
  if (req.body.nfcUid !== undefined) updates.nfc_uid = req.body.nfcUid || null
  if (req.body.lrn !== undefined) updates.lrn = req.body.lrn || null
  await db('users').where('id', req.params.id).update(updates)
  const row = await db('users').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db('users').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
