import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('grade_scores')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)
  if (req.query.componentId) q = q.where('component_id', req.query.componentId as string)

  if (req.userRole === 'teacher' && req.userSchoolId) {
    q = q.whereIn('class_id', function () {
      this.select('id').from('classes').where('school_id', req.userSchoolId!)
    })
  }
  if (req.userRole === 'student') {
    q = q.where('student_id', req.userId!)
  }

  const rows = await q
  res.json(rows)
})

router.post('/batch', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { scores } = req.body
  if (!Array.isArray(scores)) {
    res.status(400).json({ error: 'scores must be an array' })
    return
  }
  for (const s of scores) {
    const score = Number(s.score)
    const maxScore = Number(s.maxScore)
    if (isNaN(score) || isNaN(maxScore) || score < 0 || maxScore <= 0) {
      continue
    }
    await db('grade_scores').insert({
      id: s.id, student_id: s.studentId, class_id: s.classId,
      component_id: s.componentId, score, max_score: maxScore,
      school_id: s.schoolId,
    }).onConflict('id').merge()
  }
  res.json({ count: scores.length })
})

export default router
