import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('classes')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  if (req.query.termId) q = q.where('term_id', req.query.termId as string)
  if (req.query.section) q = q.where('section', req.query.section as string)

  if (req.userRole === 'teacher' && req.userSchoolId) {
    q = q.where('school_id', req.userSchoolId)
  }

  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db('classes').where('id', req.params.id).first()
  res.json(row || null)
})

router.post('/', requireRole('admin', 'super_admin', 'teacher'), async (req, res) => {
  const { id, subjectId, section, teacherId, schedule, room, termId, schoolId } = req.body
  if (!id || !subjectId || !section) {
    res.status(400).json({ error: 'id, subjectId, and section are required' })
    return
  }
  await db('classes').insert({
    id, subject_id: subjectId, section, teacher_id: teacherId,
    schedule: schedule || '', room: room || '', term_id: termId || null,
    school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('classes').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', requireRole('admin', 'super_admin', 'teacher'), async (req, res) => {
  const allowed = ['subjectId', 'section', 'teacherId', 'schedule', 'room', 'termId']
  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = req.body[f]
    }
  }
  await db('classes').where('id', req.params.id).update(updates)
  const row = await db('classes').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const enrollments = await db('enrollments').where('class_id', req.params.id).first()
  if (enrollments) {
    res.status(400).json({ error: 'Cannot delete class with active enrollments' })
    return
  }
  await db('classes').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
