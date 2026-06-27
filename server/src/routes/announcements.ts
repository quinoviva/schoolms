import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('announcements')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { id, classId, teacherId, title, content, schoolId } = req.body
  if (!id || !title || !content) {
    res.status(400).json({ error: 'id, title, and content are required' })
    return
  }
  await db('announcements').insert({
    id, class_id: classId, teacher_id: teacherId,
    title, content, school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('announcements').where('id', id).first()
  res.status(201).json(row)
})

export default router
