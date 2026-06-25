import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('drive_links')
  if (req.query.classId) q = q.where('class_id', req.query.classId as string)
  if (req.query.teacherId) q = q.where('teacher_id', req.query.teacherId as string)
  const rows = await q.orderBy('created_at', 'desc')
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, classId, teacherId, title, driveUrl, driveFileId, mimeType, schoolId } = req.body
  await db('drive_links').insert({
    id, class_id: classId, teacher_id: teacherId,
    title, drive_url: driveUrl, drive_file_id: driveFileId,
    mime_type: mimeType || null, school_id: schoolId, created_at: Date.now(),
  })
  const row = await db('drive_links').where('id', id).first()
  res.status(201).json(row)
})

router.delete('/:id', async (req, res) => {
  await db('drive_links').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
