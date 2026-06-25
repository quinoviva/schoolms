import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('notifications')
  if (req.query.userId) q = q.where('user_id', req.query.userId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, userId, type, message, relatedId, schoolId } = req.body
  await db('notifications').insert({
    id, user_id: userId, type, message, related_id: relatedId,
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
