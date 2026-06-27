import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const VALID_STATUSES = ['P', 'A', 'T', 'E']

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('attendance')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.studentId) q = q.where('student_id', req.query.studentId as string)
  if (req.query.date) q = q.where('date', req.query.date as string)

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
  const { records } = req.body
  if (!Array.isArray(records)) {
    res.status(400).json({ error: 'records must be an array' })
    return
  }
  for (const r of records) {
    if (!VALID_STATUSES.includes(r.status)) continue
    await db('attendance').insert({
      id: r.id, student_id: r.studentId, class_id: r.classId,
      date: r.date, status: r.status, remarks: r.remarks || '',
      recorded_by: r.recordedBy, school_id: r.schoolId,
    }).onConflict('id').merge()
  }
  res.json({ count: records.length })
})

export default router
