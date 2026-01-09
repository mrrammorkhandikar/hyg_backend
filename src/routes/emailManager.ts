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
      // Store the datetime directly as received from frontend
      processedScheduledTime = scheduled_time
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
        // Store the datetime directly as received from frontend
        updateData.scheduled_time = scheduled_time
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

    // Send email to all recipients with rate limiting and better error handling
    const recipients = email.emails.list
    const results = []
    let successCount = 0
    let failureCount = 0

    console.log(`📧 Starting to send email "${email.the_mail.subject}" to ${recipients.length} recipients`)

    // Gmail rate limiting: max 50 emails per minute, 500 per day
    const BATCH_SIZE = 10 // Send in batches of 10
    const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds between batches
    const DELAY_BETWEEN_EMAILS = 500 // 0.5 seconds between individual emails

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recipients.length / BATCH_SIZE)} (${batch.length} emails)`)

      // Send emails in this batch
      for (const recipient of batch) {
        try {
          console.log(`📤 Sending to: ${recipient.email}`)
          await sendEmail({
            to: recipient.email,
            subject: email.the_mail.subject,
            html: email.the_mail.html
          })
          console.log(`✅ Successfully sent to: ${recipient.email}`)
          results.push({ email: recipient.email, status: 'success' })
          successCount++

          // Small delay between individual emails
          if (i + batch.length < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS))
          }
        } catch (emailError: any) {
          console.error(`❌ Failed to send email to ${recipient.email}:`, emailError.message)
          results.push({ email: recipient.email, status: 'failed', error: emailError.message })
          failureCount++
        }
      }

      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < recipients.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }

    console.log(`📊 Email sending completed: ${successCount} sent, ${failureCount} failed`)

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

// POST /email-manager/test-send - Test email sending through API
router.post('/test-send', requireAdmin, async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' })
    }

    console.log(`🧪 Testing email send to: ${email}`)
    console.log('Environment check:')
    console.log('- GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'NOT SET')
    console.log('- GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set' : 'NOT SET')
    console.log('- GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? 'Set (len: ' + process.env.GMAIL_REFRESH_TOKEN?.length + ')' : 'NOT SET')
    console.log('- SMTP_HOST:', process.env.SMTP_HOST ? 'Set' : 'NOT SET')

    await sendEmail({
      to: email,
      subject: 'HygieneShelf Email System Test - Please Check Your Inbox',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email System Test</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px; }
            .status { background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 20px; margin: 20px 0; }
            .status h3 { color: #0ea5e9; margin-top: 0; }
            .info { background-color: #f8fafc; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .success { color: #059669; font-weight: 600; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Email System Test</h1>
              <p>HygieneShelf Communication Verification</p>
            </div>

            <div class="content">
              <p>Hello,</p>

              <p>This is an automated test email from the HygieneShelf email system to verify that our communication channels are working properly.</p>

              <div class="status">
                <h3>✅ Email Delivery Successful</h3>
                <p>If you're reading this email, our email system is functioning correctly!</p>
              </div>

              <div class="info">
                <strong>Test Details:</strong><br/>
                • Sent: ${new Date().toISOString()}<br/>
                • From: HygieneShelf Email System<br/>
                • Method: ${process.env.SMTP_HOST ? 'SMTP' : 'OAuth2'}<br/>
                • Status: Delivery Confirmed
              </div>

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Check your inbox for this message</li>
                <li>If you see this in spam/junk, mark it as "Not Spam"</li>
                <li>Our system is now ready for regular newsletters</li>
              </ul>

              <p>Thank you for helping us test our email system!</p>

              <p>Best regards,<br/>
              <strong>HygieneShelf Team</strong></p>
            </div>

            <div class="footer">
              <p><strong>HygieneShelf</strong> - Promoting Health & Hygiene</p>
              <p>This is a system test email. No action required.</p>
              <p>© ${new Date().getFullYear()} HygieneShelf. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    console.log(`✅ Test email sent successfully to ${email}`)
    res.json({
      message: 'Test email sent successfully',
      recipient: email,
      timestamp: new Date().toISOString(),
      environment: {
        gmailUser: !!process.env.GMAIL_USER,
        gmailClientId: !!process.env.GMAIL_CLIENT_ID,
        gmailRefreshToken: !!process.env.GMAIL_REFRESH_TOKEN,
        smtpHost: !!process.env.SMTP_HOST
      }
    })

  } catch (error: any) {
    console.error('❌ Failed to send test email:', error)
    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message,
      stack: error.stack
    })
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
