import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('subjects')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  if (req.query.termId) q = q.where('term_id', req.query.termId as string)
  if (req.query.gradeLevel) q = q.where('grade_level', req.query.gradeLevel as string)

  if (req.userRole === 'teacher' && req.userSchoolId) {
    q = q.where('school_id', req.userSchoolId)
  }

  const rows = await q.orderBy('code')
  res.json(rows)
})

router.post('/', requireRole('admin', 'super_admin'), async (req, res) => {
  const { id, code, title, teacherId, termId, gradeLevel, gradingComponents, schoolId } = req.body
  if (!id || !code || !title || !gradeLevel) {
    res.status(400).json({ error: 'id, code, title, and gradeLevel are required' })
    return
  }
  await db('subjects').insert({
    id, code, title, teacher_id: teacherId || null, term_id: termId || null,
    grade_level: gradeLevel, grading_components: JSON.stringify(gradingComponents || []),
    school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('subjects').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const allowed = ['code', 'title', 'teacherId', 'termId', 'gradeLevel', 'gradingComponents']
  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = f === 'gradingComponents' ? JSON.stringify(req.body[f]) : req.body[f]
    }
  }
  await db('subjects').where('id', req.params.id).update(updates)
  const row = await db('subjects').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const enrollments = await db('enrollments').where('class_id', req.params.id).first()
  if (enrollments) {
    res.status(400).json({ error: 'Cannot delete subject with active enrollments' })
    return
  }
  await db('subjects').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
