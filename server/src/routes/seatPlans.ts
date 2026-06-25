import { Router } from 'express'
import db from '../database.js'
import { verifyToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(verifyToken)

router.get('/:classId', async (req, res) => {
  const row = await db('seat_plans').where('class_id', req.params.classId).first()
  res.json(row || null)
})

router.put('/:classId', async (req, res) => {
  const { id, canvasWidth, canvasHeight, elements, schoolId } = req.body
  const now = Date.now()
  const existing = await db('seat_plans').where('class_id', req.params.classId).first()
  if (existing) {
    await db('seat_plans').where('class_id', req.params.classId).update({
      canvas_width: canvasWidth, canvas_height: canvasHeight,
      elements: JSON.stringify(elements || []), updated_at: now,
    })
  } else {
    await db('seat_plans').insert({
      id, class_id: req.params.classId, canvas_width: canvasWidth, canvas_height: canvasHeight,
      elements: JSON.stringify(elements || []), school_id: schoolId, created_at: now, updated_at: now,
    })
  }
  const row = await db('seat_plans').where('class_id', req.params.classId).first()
  res.json(row)
})

export default router
