import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('grade_releases')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  const rows = await q
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, classId, teacherId, isReleased, schoolId } = req.body
  const existing = await db('grade_releases').where({ class_id: classId, teacher_id: teacherId }).first()
  if (existing) {
    await db('grade_releases').where('id', existing.id).update({
      is_released: isReleased, released_at: Date.now(),
    })
    const row = await db('grade_releases').where('id', existing.id).first()
    res.json(row)
  } else {
    await db('grade_releases').insert({
      id, class_id: classId, teacher_id: teacherId,
      is_released: isReleased, released_at: Date.now(), school_id: schoolId,
    })
    const row = await db('grade_releases').where('id', id).first()
    res.status(201).json(row)
  }
})

export default router
