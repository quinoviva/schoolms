import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('subjects')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  if (req.query.termId) q = q.where('term_id', req.query.termId as string)
  if (req.query.gradeLevel) q = q.where('grade_level', req.query.gradeLevel as string)
  const rows = await q.orderBy('code')
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, code, title, teacherId, termId, gradeLevel, gradingComponents, schoolId } = req.body
  await db('subjects').insert({
    id, code, title, teacher_id: teacherId, term_id: termId,
    grade_level: gradeLevel, grading_components: JSON.stringify(gradingComponents || []),
    school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('subjects').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const updates: Record<string, unknown> = {}
  if (req.body.code !== undefined) updates.code = req.body.code
  if (req.body.title !== undefined) updates.title = req.body.title
  if (req.body.teacherId !== undefined) updates.teacher_id = req.body.teacherId
  if (req.body.termId !== undefined) updates.term_id = req.body.termId
  if (req.body.gradeLevel !== undefined) updates.grade_level = req.body.gradeLevel
  if (req.body.gradingComponents !== undefined) updates.grading_components = JSON.stringify(req.body.gradingComponents)
  await db('subjects').where('id', req.params.id).update(updates)
  const row = await db('subjects').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db('subjects').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
