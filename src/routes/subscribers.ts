import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// GET /subscribers - Get all newsletter subscribers with pagination and filtering
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      sort = 'subscribed_at', 
      order = 'desc', 
      search 
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })
      .order(sort as string, { ascending: order === 'asc' })

    // Apply search filter
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,name.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
      .range(offset, offset + limitNum - 1)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      data: data || [],
      pagination: {
        total: count || 0,
        page: pageNum,
        totalPages: Math.ceil((count || 0) / limitNum),
        limit: limitNum
      }
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /subscribers/stats - Get subscriber statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, subscribed_at')

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const totalSubscribers = subscribers?.length || 0
    const recentSubscribers = subscribers?.filter(sub => {
      const subDate = new Date(sub.subscribed_at)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return subDate >= oneWeekAgo
    }).length || 0

    res.json({
      total: totalSubscribers,
      recent: recentSubscribers,
      growth: recentSubscribers > 0 ? Math.round((recentSubscribers / totalSubscribers) * 100) : 0
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /subscribers/emails - Get all subscriber emails for email campaigns
router.get('/emails', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, name')
      .order('subscribed_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const subscribers = data || []
    const emails = subscribers.map(sub => ({
      email: sub.email,
      name: sub.name || ''
    }))

    res.json({
      count: emails.length,
      emails: emails
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// POST /subscribers - Add a new subscriber (for testing purposes)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, name } = req.body

    // Validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: email.trim().toLowerCase(),
        name: name ? name.trim() : null,
        subscribed_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({
      message: 'Subscriber added successfully',
      subscriber: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// DELETE /subscribers/:id - Delete a subscriber (for testing purposes)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      message: 'Subscriber deleted successfully',
      subscriber: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

export default router
