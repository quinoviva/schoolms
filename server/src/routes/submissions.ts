import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('submissions')
  if (req.query.assignmentId) q = q.where('assignment_id', req.query.assignmentId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)
  const rows = await q
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, assignmentId, studentId, fileUrl, fileName, schoolId } = req.body
  await db('submissions').insert({
    id, assignment_id: assignmentId, student_id: studentId,
    file_url: fileUrl, file_name: fileName,
    school_id: schoolId, submitted_at: Date.now(), score: null, graded_at: null,
  })
  const row = await db('submissions').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id/grade', async (req, res) => {
  const { score } = req.body
  await db('submissions').where('id', req.params.id).update({ score, graded_at: Date.now() })
  const row = await db('submissions').where('id', req.params.id).first()
  res.json(row)
})

export default router
