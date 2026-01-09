import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'
import { sendEmail } from '../utils/emailService'

const router = express.Router()

// GET /email-manager - Get all emails with pagination and filtering
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      sort = 'created_at', 
      order = 'desc', 
      status,
      type,
      search 
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    let query = supabase
      .from('the_emails')
      .select('*', { count: 'exact' })
      .order(sort as string, { ascending: order === 'asc' })

    // Apply filters
    if (status) {
      query = query.eq('status', status as string)
    }

    if (type) {
      query = query.eq('type', type as string)
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,type.ilike.%${search}%`
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

// GET /email-manager/stats - Get email statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('the_emails')
      .select('status')
      .not('status', 'is', null)

    // Get counts by type
    const { data: typeCounts, error: typeError } = await supabase
      .from('the_emails')
      .select('type')
      .not('type', 'is', null)

    if (statusError || typeError) {
      return res.status(500).json({ error: 'Failed to fetch statistics' })
    }

    // Calculate status counts
    const statusStats = {
      draft: statusCounts?.filter(e => e.status === 'Draft').length || 0,
      scheduled: statusCounts?.filter(e => e.status === 'Scheduled').length || 0,
      sent: statusCounts?.filter(e => e.status === 'Sent').length || 0
    }

    // Calculate type counts
    const typeStats = {
      welcome: typeCounts?.filter(e => e.type === 'Welcome').length || 0,
      newPost: typeCounts?.filter(e => e.type === 'New Post').length || 0,
      newsletter: typeCounts?.filter(e => e.type === 'Newsletter').length || 0,
      template: typeCounts?.filter(e => e.type === 'Template').length || 0,
      other: typeCounts?.filter(e => e.type === 'Other').length || 0
    }

    res.json({
      total: statusCounts?.length || 0,
      status: statusStats,
      types: typeStats
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /email-manager/:id - Get single email by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('the_emails')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Email not found' })
    }

    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// POST /email-manager - Create new email
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, type, the_mail, emails, scheduled_time } = req.body

    // Validation
    if (!title || !type || !the_mail) {
      return res.status(400).json({ error: 'Title, type, and email content are required' })
    }

    // Validate email type
    const validTypes = ['Welcome', 'New Post', 'Newsletter', 'Template', 'Other']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid email type' })
    }

    // Validate the_mail structure
    if (!the_mail.subject || !the_mail.html) {
      return res.status(400).json({ error: 'Email content must include subject and html' })
    }

    // Validate scheduled_time if provided
    let processedScheduledTime = null
    if (scheduled_time) {
      // Handle different date formats
      let scheduledDate: Date;
      
      // Try to parse as ISO string first
      if (typeof scheduled_time === 'string' && scheduled_time.includes('T')) {
        scheduledDate = new Date(scheduled_time);
      } else {
        // Handle datetime-local format (YYYY-MM-DDTHH:mm)
        scheduledDate = new Date(scheduled_time);
      }
      
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled time format' })
      }
      processedScheduledTime = scheduledDate.toISOString()
    }

    // Prepare email data
    const emailData: any = {
      title: title.trim(),
      type,
      the_mail,
      status: scheduled_time ? 'Scheduled' : 'Draft'
    }

    if (emails) {
      emailData.emails = emails
    }

    if (processedScheduledTime) {
      emailData.scheduled_time = processedScheduledTime
    }

    const { data, error } = await supabase
      .from('the_emails')
      .insert([emailData])
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({
      message: 'Email created successfully',
      email: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// PUT /email-manager/:id - Update email
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { title, type, the_mail, emails, scheduled_time, status } = req.body

    // Check if email exists
    const { data: existingEmail, error: checkError } = await supabase
      .from('the_emails')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingEmail) {
      return res.status(404).json({ error: 'Email not found' })
    }

    // Prepare update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title.trim()
    if (type !== undefined) updateData.type = type
    if (the_mail !== undefined) updateData.the_mail = the_mail
    if (emails !== undefined) updateData.emails = emails

    // Handle scheduled_time
    if (scheduled_time !== undefined) {
      if (scheduled_time) {
        // Handle different date formats
        let scheduledDate: Date;
        
        // Try to parse as ISO string first
        if (typeof scheduled_time === 'string' && scheduled_time.includes('T')) {
          scheduledDate = new Date(scheduled_time);
        } else {
          // Handle datetime-local format (YYYY-MM-DDTHH:mm)
          scheduledDate = new Date(scheduled_time);
        }
        
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({ error: 'Invalid scheduled time format' })
        }
        updateData.scheduled_time = scheduledDate.toISOString()
      } else {
        updateData.scheduled_time = null
      }
    }

    // Handle status changes
    if (status !== undefined) {
      // Prevent invalid status transitions
      if (existingEmail.status === 'Sent' && status !== 'Sent') {
        return res.status(400).json({ error: 'Cannot change status of sent email' })
      }
      updateData.status = status
    }

    const { data, error } = await supabase
      .from('the_emails')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      message: 'Email updated successfully',
      email: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// DELETE /email-manager/:id - Delete email
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Check if email exists and is not sent
    const { data: existingEmail, error: checkError } = await supabase
      .from('the_emails')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingEmail) {
      return res.status(404).json({ error: 'Email not found' })
    }

    if (existingEmail.status === 'Sent') {
      return res.status(400).json({ error: 'Cannot delete sent email' })
    }

    const { data, error } = await supabase
      .from('the_emails')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      message: 'Email deleted successfully',
      email: data
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// POST /email-manager/:id/send - Send email immediately
router.post('/:id/send', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Get email details
    const { data: email, error: emailError } = await supabase
      .from('the_emails')
      .select('*')
      .eq('id', id)
      .single()

    if (emailError || !email) {
      return res.status(404).json({ error: 'Email not found' })
    }

    if (email.status === 'Sent') {
      return res.status(400).json({ error: 'Email has already been sent' })
    }

    if (!email.emails || !email.emails.list || email.emails.list.length === 0) {
      return res.status(400).json({ error: 'No recipients found for this email' })
    }

    // Send email to all recipients
    const recipients = email.emails.list
    const results = []
    let successCount = 0
    let failureCount = 0

    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          subject: email.the_mail.subject,
          html: email.the_mail.html
        })
        results.push({ email: recipient.email, status: 'success' })
        successCount++
      } catch (emailError: any) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError)
        results.push({ email: recipient.email, status: 'failed', error: emailError.message })
        failureCount++
      }
    }

    // Update email status and sent time
    const { data, error } = await supabase
      .from('the_emails')
      .update({
        status: 'Sent',
        sent_time: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      message: 'Email sending completed',
      email: data,
      results: {
        total: recipients.length,
        sent: successCount,
        failed: failureCount,
        details: results
      }
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /email-manager/types - Get available email types
router.get('/types', requireAdmin, (req, res) => {
  const types = [
    { value: 'Welcome', label: 'Welcome emails' },
    { value: 'New Post', label: 'New Post notification email' },
    { value: 'Newsletter', label: 'Newsletter email' },
    { value: 'Template', label: 'Template' },
    { value: 'Other', label: 'Other' }
  ]
  res.json(types)
})

export default router
