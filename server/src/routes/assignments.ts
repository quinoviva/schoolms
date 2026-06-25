import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('assignments')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, classId, teacherId, title, description, dueDate, maxScore, schoolId } = req.body
  await db('assignments').insert({
    id, class_id: classId, teacher_id: teacherId,
    title, description, due_date: dueDate, max_score: maxScore,
    school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('assignments').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const updates: Record<string, unknown> = {}
  if (req.body.title !== undefined) updates.title = req.body.title
  if (req.body.description !== undefined) updates.description = req.body.description
  if (req.body.dueDate !== undefined) updates.due_date = req.body.dueDate
  if (req.body.maxScore !== undefined) updates.max_score = req.body.maxScore
  await db('assignments').where('id', req.params.id).update(updates)
  const row = await db('assignments').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db('assignments').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
