import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('enrollments')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)
  if (req.query.termId) q = q.where('term_id', req.query.termId as string)

  if (req.userRole === 'teacher' && req.userSchoolId) {
    q = q.whereIn('class_id', function () {
      this.select('id').from('classes').where('school_id', req.userSchoolId!)
    })
  }

  const rows = await q
  res.json(rows)
})

router.post('/', requireRole('admin', 'super_admin', 'teacher'), async (req, res) => {
  const { enrollments } = req.body
  if (!Array.isArray(enrollments)) {
    res.status(400).json({ error: 'enrollments must be an array' })
    return
  }
  if (enrollments.length > 500) {
    res.status(400).json({ error: 'Maximum 500 enrollments per batch' })
    return
  }
  const toInsert = enrollments.map((e: { id: string; studentId: string; classId: string; termId?: string; schoolId?: string }) => ({
    id: e.id, student_id: e.studentId, class_id: e.classId,
    term_id: e.termId || null, school_id: e.schoolId || null,
  }))
  await db('enrollments').insert(toInsert).onConflict('id').ignore()
  res.status(201).json({ count: enrollments.length })
})

router.delete('/:id', requireRole('admin', 'super_admin', 'teacher'), async (req, res) => {
  await db('enrollments').where('id', req.params.id).del()
  res.json({ success: true })
})

router.post('/batch-delete', requireRole('admin', 'super_admin', 'teacher'), async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids must be an array' })
    return
  }
  await db('enrollments').whereIn('id', ids).del()
  res.json({ deleted: ids.length })
})

export default router
