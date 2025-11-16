import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { supabase } from '../db/supabaseClient'
dotenv.config()

const COOKIE_NAME = process.env.COOKIE_NAME || 'admin_token'
const SECRET = process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'dev-insecure-secret'

export interface UserPayload {
  id?: string // author id (optional for admin)
  username: string
  role: 'admin' | 'author'
  authorName?: string // for authors
}

// Middleware to check if user can access posts
export function requirePostAccess(req: Request, res: Response, next: NextFunction) {
  // Prefer cookie, fallback to Authorization: Bearer
  const cookieToken = req.cookies?.[COOKIE_NAME]
  const headerAuth = req.headers.authorization
  const bearerToken = headerAuth?.startsWith('Bearer ') ? headerAuth.slice('Bearer '.length) : undefined
  const token = cookieToken || bearerToken

  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const payload = jwt.verify(token, SECRET) as UserPayload
    ;(req as any).user = payload

    // Admin can do anything
    if (payload.role === 'admin') {
      return next()
    }

    // Authors can only access their own posts for specific operations
    if (payload.role === 'author') {
      // For POST (create) - always allow authors to create their own posts
      if (req.method === 'POST') {
        return next()
      }

      // For other operations, check if they own the post
      const postId = req.params.id
      if (!postId) {
        return res.status(400).json({ error: 'Post ID required' })
      }

      // Check if the author owns this post
      return checkPostOwnership(req, res, next, payload.authorName!, postId)
    }

    return res.status(403).json({ error: 'Invalid role' })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Middleware for author-specific post restrictions
export function restrictAuthorActions(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as UserPayload

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Admin can do anything
  if (user.role === 'admin') {
    return next()
  }

  // For authors, restrict certain actions
  if (user.role === 'author') {
    const body = req.body

    // Authors cannot set published or featured
    if (body.published !== undefined || body.featured !== undefined) {
      return res.status(403).json({ error: 'Authors cannot set published or featured status' })
    }

    // Authors must have their author name fixed
    if (body.author && body.author !== user.authorName) {
      return res.status(403).json({ error: 'Authors can only create posts with their own author name' })
    }

    // For updates, ensure they can only update their own posts
    const postId = req.params.id
    if (postId && req.method === 'PUT') {
      return checkPostOwnership(req, res, next, user.authorName!, postId)
    }
  }

  next()
}

async function checkPostOwnership(req: Request, res: Response, next: NextFunction, authorName: string, postId: string) {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('author')
      .eq('id', postId)
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: 'Database error' })
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.author !== authorName) {
      return res.status(403).json({ error: 'You can only access your own posts' })
    }

    next()
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}
