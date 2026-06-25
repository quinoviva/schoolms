import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('enrollments')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)
  if (req.query.termId) q = q.where('term_id', req.query.termId as string)
  const rows = await q
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { enrollments } = req.body
  if (!Array.isArray(enrollments)) {
    res.status(400).json({ error: 'enrollments must be an array' })
    return
  }
  await db('enrollments').insert(enrollments.map((e: any) => ({
    id: e.id, student_id: e.studentId, class_id: e.classId,
    term_id: e.termId, school_id: e.schoolId,
  })))
  res.status(201).json({ count: enrollments.length })
})

router.delete('/:id', async (req, res) => {
  await db('enrollments').where('id', req.params.id).del()
  res.json({ success: true })
})

router.post('/batch-delete', async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids must be an array' })
    return
  }
  await db('enrollments').whereIn('id', ids).del()
  res.json({ deleted: ids.length })
})

export default router
