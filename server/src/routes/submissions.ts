import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('submissions')
  if (req.query.assignmentId) q = q.where('assignment_id', req.query.assignmentId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)

  if (req.userRole === 'student') {
    q = q.where('student_id', req.userId!)
  }

  const rows = await q
  res.json(rows)
})

router.post('/', requireRole('student', 'teacher'), async (req, res) => {
  const { id, assignmentId, studentId, fileUrl, fileName, schoolId } = req.body
  if (!id || !assignmentId || !fileUrl) {
    res.status(400).json({ error: 'id, assignmentId, and fileUrl are required' })
    return
  }
  await db('submissions').insert({
    id, assignment_id: assignmentId, student_id: studentId,
    file_url: fileUrl, file_name: fileName || '',
    school_id: schoolId, submitted_at: Date.now(), score: null, graded_at: null,
  })
  const row = await db('submissions').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id/grade', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { score } = req.body
  if (score === undefined || isNaN(Number(score))) {
    res.status(400).json({ error: 'A valid score is required' })
    return
  }
  await db('submissions').where('id', req.params.id).update({ score: Number(score), graded_at: Date.now() })
  const row = await db('submissions').where('id', req.params.id).first()
  res.json(row)
})

export default router
