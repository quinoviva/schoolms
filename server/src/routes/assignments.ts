import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('assignments')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { id, classId, teacherId, title, description, dueDate, maxScore, schoolId } = req.body
  if (!id || !title) {
    res.status(400).json({ error: 'id and title are required' })
    return
  }
  await db('assignments').insert({
    id, class_id: classId, teacher_id: teacherId,
    title, description: description || '', due_date: dueDate || '',
    max_score: maxScore || 100, school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('assignments').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const allowed = ['title', 'description', 'dueDate', 'maxScore']
  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = req.body[f]
    }
  }
  await db('assignments').where('id', req.params.id).update(updates)
  const row = await db('assignments').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  await db('submissions').where('assignment_id', req.params.id).del()
  await db('assignments').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
