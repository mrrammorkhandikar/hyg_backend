import express from 'express'
import { supabase } from '../db/supabaseClient'
import { sendNewsletterWelcomeEmail } from '../utils/newsletterWelcomeEmail'
import { requireAdmin } from '../middleware/requireAdmin'

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = express.Router()

// POST /newsletter/subscribe - Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { name, email, unique_user_id } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if user is already subscribed
    const { data: existingSubscribers, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', email)
      .limit(1)

    if (checkError) {
      // Only return error if it's not a "no rows" error
      if (!checkError.message.includes('no rows') && !checkError.message.includes('relation') && !checkError.message.includes('does not exist')) {
        return res.status(500).json({ error: checkError.message })
      }
    }

    if (existingSubscribers && existingSubscribers.length > 0) {
      return res.status(200).json({
        message: 'Already subscribed',
        subscriber: existingSubscribers[0]
      })
    }

    // Create new subscriber
    const subscriberData: any = {
      email: email.trim(),
      subscribed_at: new Date().toISOString()
    }

    // Add name if provided
    if (name && name.trim()) {
      subscriberData.name = name.trim()
    }

    // Validate and process unique_user_id if provided
    let processedUniqueUserId = null;
    if (unique_user_id) {
      // Validate UUID format
      if (!uuidRegex.test(unique_user_id)) {
        return res.status(400).json({ 
          error: 'Invalid unique_user_id format. Must be a valid UUID.' 
        });
      }
      
      processedUniqueUserId = unique_user_id;
      subscriberData.unique_user_id = processedUniqueUserId
    }

    // Check if this unique_user_id already has a subscription
    if (processedUniqueUserId) {
      const { data: existingByUserId, error: userIdError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('unique_user_id', processedUniqueUserId)
        .limit(1)

      if (existingByUserId && existingByUserId.length > 0) {
        // Update existing subscription instead of creating new one
        const updateData: any = {
          email: email.trim(),
          subscribed_at: new Date().toISOString()
        }

        if (name && name.trim()) {
          updateData.name = name.trim()
        }

        const { data: updatedData, error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update(updateData)
          .eq('unique_user_id', processedUniqueUserId)
          .select()
          .single()

        if (updateError) return res.status(500).json({ error: updateError.message })

        res.json({
          message: 'Subscription updated successfully',
          subscriber: updatedData
        })
        return
      }
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert([subscriberData])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Send welcome email
    try {
      await sendNewsletterWelcomeEmail({ email, name: name || '' })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the subscription if email sending fails
    }

    res.json({
      message: 'Successfully subscribed to newsletter',
      subscriber: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /newsletter/check - Check if user is subscribed
router.get('/check', async (req, res) => {
  try {
    const { email, unique_user_id } = req.query

    if (!email && !unique_user_id) {
      return res.status(400).json({ error: 'Email or unique_user_id is required' })
    }

    let query = supabase
      .from('newsletter_subscribers')
      .select('*')

    if (email) {
      query = query.eq('email', email as string)
    } else if (unique_user_id) {
      // Validate UUID format in query parameter
      if (!uuidRegex.test(unique_user_id as string)) {
        return res.status(400).json({ 
          error: 'Invalid unique_user_id format. Must be a valid UUID.' 
        });
      }
      query = query.eq('unique_user_id', unique_user_id as string)
    }

    const { data, error } = await query.limit(1)

    if (error) {
      // Only return error if it's not a "no rows" error
      if (!error.message.includes('no rows') && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        return res.status(500).json({ error: error.message })
      }
    }

    if (data && data.length > 0) {
      res.json({
        isSubscribed: true,
        subscriber: data[0]
      })
    } else {
      res.status(200).json({ isSubscribed: false })
    }
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /newsletter/subscribers - Get all subscribers (Admin only)
router.get('/subscribers', requireAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20', sort = 'subscribed_at', order = 'desc', search } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })
      .order(sort as string, { ascending: order === 'asc' })

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,name.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
      .range(offset, offset + limitNum - 1)

    if (error) {
      // Only return error if it's not a "no rows" error
      if (!error.message.includes('no rows') && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        return res.status(500).json({ error: error.message })
      }
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

// PUT /newsletter/subscribers/:id - Update subscriber (Admin only)
router.put('/subscribers/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { email, name, unique_user_id } = req.body

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }
    }

    // Check if email already exists for a different subscriber
    if (email) {
      const { data: existingSubscribers, error: checkError } = await supabase
        .from('newsletter_subscribers')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .limit(1)

      if (checkError && !checkError.message.includes('no rows')) {
        return res.status(500).json({ error: checkError.message })
      }

      if (existingSubscribers && existingSubscribers.length > 0) {
        return res.status(400).json({ error: 'Email already exists for another subscriber' })
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (email !== undefined) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (unique_user_id !== undefined) updateData.unique_user_id = unique_user_id

    // Update the subscriber
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      message: 'Subscriber updated successfully',
      subscriber: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// DELETE /newsletter/subscribers/:id - Delete subscriber (Admin only)
router.delete('/subscribers/:id', requireAdmin, async (req, res) => {
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

// GET /newsletter/export - Export subscribers to CSV (Admin only)
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, name, subscribed_at')
      .order('subscribed_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No subscribers found' })
    }

    // Create CSV content with only Name, Email, Subscribed columns
    const headers = ['Name', 'Email', 'Subscribed']
    const csvContent = [
      headers.join(','),
      ...data.map(subscriber => [
        subscriber.name ? `"${subscriber.name}"` : '',
        `"${subscriber.email}"`,
        `"${subscriber.subscribed_at}"`
      ].join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(csvContent)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

export default router
