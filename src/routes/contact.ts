import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// POST /contact - Send a contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, unique_user_id } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const contactData: any = {
      username: name.trim(),
      email: email.trim(),
      message: message.trim()
    }

    // Add subject if provided
    if (subject && subject.trim()) {
      contactData.subject = subject.trim()
    }

    // Add unique_user_id if provided
    if (unique_user_id) {
      contactData.unique_user_id = unique_user_id
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .insert([contactData])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /contact - Get all contact messages (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /contact/user/:uniqueUserId - Get contact messages for a specific user
router.get('/user/:uniqueUserId', async (req, res) => {
  try {
    const { uniqueUserId } = req.params
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('unique_user_id', uniqueUserId)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// DELETE /contact/:id - Delete a contact message (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Contact message not found' })

    res.json({ message: 'Contact message deleted successfully' })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

export default router
