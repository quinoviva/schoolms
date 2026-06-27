import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', requireRole('super_admin'), async (req, res) => {
  let q = db('audit_logs')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  const rows = await q.orderBy('timestamp', 'desc').limit(200)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { userId, userEmail, action, collection, documentId, details, schoolId } = req.body
  if (!action || !collection) {
    res.status(400).json({ error: 'action and collection are required' })
    return
  }
  const validActions = ['create', 'update', 'delete', 'login', 'logout', 'read', 'export']
  if (!validActions.includes(action)) {
    res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` })
    return
  }
  await db('audit_logs').insert({
    id: crypto.randomUUID(), user_id: userId || req.userId,
    user_email: userEmail || req.userEmail || '',
    action, collection, document_id: documentId || '',
    details: details || '', timestamp: Date.now(), school_id: schoolId,
  })
  res.status(201).json({ success: true })
})

export default router
