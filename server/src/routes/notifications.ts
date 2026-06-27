import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('notifications')
  if (req.query.userId) q = q.where('user_id', req.query.userId as string)
  if (req.userRole === 'student' || req.userRole === 'teacher') {
    q = q.where('user_id', req.userId!)
  }
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { id, userId, type, message, relatedId, schoolId } = req.body
  if (!id || !userId || !type || !message) {
    res.status(400).json({ error: 'id, userId, type, and message are required' })
    return
  }
  await db('notifications').insert({
    id, user_id: userId, type, message, related_id: relatedId || '',
    read: false, school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('notifications').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id/read', async (req, res) => {
  await db('notifications').where('id', req.params.id).update({ read: true })
  res.json({ success: true })
})

export default router
