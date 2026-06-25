import type { Request, Response, NextFunction } from 'express'
import { firebaseAuth } from '../firebase.js'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
  userEmail?: string
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
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = await firebaseAuth.getUser(req.userId!)
    const role = user.customClaims?.role || 'student'
    if (!roles.includes(role)) {
      res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` })
      return
    }
    req.userRole = role
    next()
  }
}
