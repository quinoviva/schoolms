import { Router } from 'express'
import db from '../database.js'
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/:classId', async (req, res) => {
  const row = await db('seat_plans').where('class_id', req.params.classId).first()
  res.json(row || null)
})

router.put('/:classId', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const allowed = ['id', 'canvasWidth', 'canvasHeight', 'elements', 'schoolId']
  const body: Record<string, unknown> = {}
  for (const f of allowed) {
    if (req.body[f] !== undefined) body[f] = req.body[f]
  }
  const { id, canvasWidth, canvasHeight, elements, schoolId } = body as { id?: string; canvasWidth: number; canvasHeight: number; elements?: unknown[]; schoolId?: string }
  if (canvasWidth === undefined || canvasHeight === undefined) {
    res.status(400).json({ error: 'canvasWidth and canvasHeight are required' })
    return
  }
  const now = Date.now()
  const existing = await db('seat_plans').where('class_id', req.params.classId).first()
  if (existing) {
    await db('seat_plans').where('class_id', req.params.classId).update({
      canvas_width: canvasWidth, canvas_height: canvasHeight,
      elements: JSON.stringify(elements || []), updated_at: now,
    })
  } else {
    await db('seat_plans').insert({
      id: id || crypto.randomUUID(), class_id: req.params.classId,
      canvas_width: canvasWidth, canvas_height: canvasHeight,
      elements: JSON.stringify(elements || []), school_id: schoolId,
      created_at: now, updated_at: now,
    })
  }
  const row = await db('seat_plans').where('class_id', req.params.classId).first()
  res.json(row)
})

export default router
