import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  let q = db('sections')
  if (req.query.schoolId) q = q.where('school_id', req.query.schoolId as string)
  if (req.query.gradeLevel) q = q.where('grade_level', req.query.gradeLevel as string)
  const rows = await q.orderBy('name')
  res.json(rows)
})

router.post('/', requireRole('admin', 'super_admin'), async (req, res) => {
  const { id, name, gradeLevel, schoolId } = req.body
  if (!id || !name || !gradeLevel) {
    res.status(400).json({ error: 'id, name, and gradeLevel are required' })
    return
  }
  await db('sections').insert({ id, name, grade_level: gradeLevel, school_id: schoolId })
  const row = await db('sections').where('id', id).first()
  res.status(201).json(row)
})

router.put('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const allowed = ['name', 'gradeLevel']
  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      const dbField = f.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
      updates[dbField] = req.body[f]
    }
  }
  await db('sections').where('id', req.params.id).update(updates)
  const row = await db('sections').where('id', req.params.id).first()
  res.json(row)
})

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  const classes = await db('classes').where('section', req.params.id).first()
  if (classes) {
    res.status(400).json({ error: 'Cannot delete section with active classes' })
    return
  }
  await db('sections').where('id', req.params.id).del()
  res.json({ success: true })
})

export default router
