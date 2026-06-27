import type { Request, Response, NextFunction } from 'express'
import { firebaseAuth } from '../firebase.js'
import db from '../database.js'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
  userEmail?: string
  userSchoolId?: string
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const decoded = await firebaseAuth.verifyIdToken(token)
    req.userId = decoded.uid
    req.userEmail = decoded.email

    const dbUser = await db('users').where('id', decoded.uid).first()
    if (dbUser) {
      req.userRole = dbUser.role
      req.userSchoolId = dbUser.school_id
    }

    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userRole) {
        const dbUser = await db('users').where('id', req.userId!).first()
        if (!dbUser) {
          res.status(403).json({ error: 'User not found' })
          return
        }
        req.userRole = dbUser.role
        req.userSchoolId = dbUser.school_id
      }
      if (!roles.includes(req.userRole)) {
        res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` })
        return
      }
      next()
    } catch (err) {
      console.error('requireRole error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
