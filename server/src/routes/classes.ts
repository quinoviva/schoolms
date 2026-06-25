import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('classes')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  if (req.query.termId) q = q.where('term_id', req.query.termId as string)
  if (req.query.section) q = q.where('section', req.query.section as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db('classes').where('id', req.params.id).first()
  res.json(row || null)
})

router.post('/', async (req, res) => {
  const { id, subjectId, section, teacherId, schedule, room, termId, schoolId } = req.body
  await db('classes').insert({
    id, subject_id: subjectId, section, teacher_id: teacherId,
    schedule, room, term_id: termId, school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('classes').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const updates: Record<string, unknown> = {}
  if (req.body.subjectId !== undefined) updates.subject_id = req.body.subjectId
  if (req.body.section !== undefined) updates.section = req.body.section
  if (req.body.teacherId !== undefined) updates.teacher_id = req.body.teacherId
  if (req.body.schedule !== undefined) updates.schedule = req.body.schedule
  if (req.body.room !== undefined) updates.room = req.body.room
  if (req.body.termId !== undefined) updates.term_id = req.body.termId
  await db('classes').where('id', req.params.id).update(updates)
  const row = await db('classes').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db('classes').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
