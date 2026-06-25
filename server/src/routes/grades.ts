import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('grade_scores')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)
  if (req.query.componentId) q = q.where('component_id', req.query.componentId as string)
  const rows = await q
  res.json(rows)
})

router.post('/batch', async (req, res) => {
  const { scores } = req.body
  if (!Array.isArray(scores)) {
    res.status(400).json({ error: 'scores must be an array' })
    return
  }
  for (const s of scores) {
    await db('grade_scores').insert({
      id: s.id, student_id: s.studentId, class_id: s.classId,
      component_id: s.componentId, score: s.score, max_score: s.maxScore,
      school_id: s.schoolId,
    }).onConflict('id').merge()
  }
  res.json({ count: scores.length })
})

export default router
