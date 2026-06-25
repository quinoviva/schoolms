import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('sections')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.gradeLevel) q = q.where('grade_level', req.query.gradeLevel as string)
  const rows = await q.orderBy('name')
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, name, gradeLevel, schoolId } = req.body
  await db('sections').insert({ id, name, grade_level: gradeLevel, school_id: schoolId })
  const row = await db('sections').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const updates: Record<string, unknown> = {}
  if (req.body.name !== undefined) updates.name = req.body.name
  if (req.body.gradeLevel !== undefined) updates.grade_level = req.body.gradeLevel
  await db('sections').where('id', req.params.id).update(updates)
  const row = await db('sections').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db('sections').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
