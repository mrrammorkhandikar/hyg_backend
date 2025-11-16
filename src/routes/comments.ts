import express from 'express'
import { supabase } from '../db/supabaseClient'

const router = express.Router()

// GET /comments/:postId - Get all comments for a post
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// POST /comments - Create a new comment
router.post('/', async (req, res) => {
  try {
    const { post_id, comment, username, email, unique_user_id } = req.body

    if (!post_id || !comment || !username || !email) {
      return res.status(400).json({ error: 'post_id, comment, username, and email are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const commentData: any = {
      post_id,
      comment: comment.trim(),
      username: username.trim(),
      email: email.trim(),
      liked: 0
    }

    // Add unique_user_id if provided
    if (unique_user_id) {
      commentData.unique_user_id = unique_user_id
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([commentData])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// DELETE /comments/:id - Delete a comment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ deleted: id })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /comments/count/:postId - Get comment count for a post
router.get('/count/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ count: count || 0 })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

export default router
