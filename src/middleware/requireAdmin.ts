import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const COOKIE_NAME = process.env.COOKIE_NAME || 'admin_token'
const SECRET = process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'dev-insecure-secret'

export interface UserPayload {
  id?: string // author id (optional for admin)
  username: string
  role: 'admin' | 'author'
  authorName?: string // for authors
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Prefer cookie, fallback to Authorization: Bearer
  const cookieToken = req.cookies?.[COOKIE_NAME]
  const headerAuth = req.headers.authorization
  const bearerToken = headerAuth?.startsWith('Bearer ') ? headerAuth.slice('Bearer '.length) : undefined
  const token = cookieToken || bearerToken

  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const payload = jwt.verify(token, SECRET) as UserPayload
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    ;(req as any).admin = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Prefer cookie, fallback to Authorization: Bearer
  const cookieToken = req.cookies?.[COOKIE_NAME]
  const headerAuth = req.headers.authorization
  const bearerToken = headerAuth?.startsWith('Bearer ') ? headerAuth.slice('Bearer '.length) : undefined
  const token = cookieToken || bearerToken

  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const payload = jwt.verify(token, SECRET) as UserPayload
    ;(req as any).user = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
