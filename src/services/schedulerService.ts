import { supabase } from '../db/supabaseClient'
import { sendEmail } from '../utils/emailService'
import { BlogSchedulerService } from './blogSchedulerService'

// Enhanced Email Scheduler Service
export class SchedulerService {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private checkInterval = 60000 // Check every minute (60 seconds)

  constructor() {
    this.start()
  }

  public start(): void {
    if (this.isRunning) {
      console.log('Scheduler service is already running')
      return
    }

    console.log('🚀 Starting Email Scheduler Service...')
    this.isRunning = true

    // Initial check
    this.checkScheduledEmails()

    // Set up interval to check for scheduled emails every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkScheduledEmails()
    }, this.checkInterval)

    console.log(`✅ Email Scheduler Service started. Checking every ${this.checkInterval / 1000} seconds.`)
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Scheduler service is not running')
      return
    }

    console.log('🛑 Stopping Email Scheduler Service...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('✅ Email Scheduler Service stopped.')
  }

  private async checkScheduledEmails(): Promise<void> {
    try {
      const now = new Date().toISOString()
      console.log(`⏰ Checking for scheduled emails and posts at ${new Date().toLocaleString()}`)

      // Check for scheduled blog posts first
      await BlogSchedulerService.processScheduledPosts()

      // Get emails that are scheduled and need to be sent (scheduled_time <= now)
      const { data: scheduledEmails, error } = await supabase
        .from('the_emails')
        .select('*')
        .eq('status', 'Scheduled')
        .lte('scheduled_time', now)

      if (error) {
        console.error('❌ Error fetching scheduled emails:', error)
        return
      }

      if (!scheduledEmails || scheduledEmails.length === 0) {
        console.log('📭 No scheduled emails found to send')
        return
      }

      console.log(`📨 Found ${scheduledEmails.length} scheduled emails to send`)

      // Process each scheduled email
      for (const email of scheduledEmails) {
        try {
          await this.processScheduledEmail(email)
        } catch (error) {
          console.error(`❌ Error processing scheduled email ${email.id}:`, error)
        }
      }
    } catch (error) {
      console.error('❌ Error in checkScheduledEmails:', error)
    }
  }

  private async processScheduledEmail(email: any): Promise<void> {
    console.log(`📤 Processing scheduled email: ${email.title} (${email.id})`)

    try {
      // Check if email has recipients
      if (!email.emails || !email.emails.list || email.emails.list.length === 0) {
        console.warn(`⚠️  Email ${email.id} has no recipients, skipping`)
        return
      }

      const recipients = email.emails.list
      let successCount = 0
      let failureCount = 0

      console.log(`📧 Sending email to ${recipients.length} recipients...`)

      // Send email to all recipients
      for (const recipient of recipients) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: email.the_mail.subject,
            html: email.the_mail.html
          })
          successCount++
          console.log(`✅ Successfully sent to ${recipient.email}`)
        } catch (emailError: any) {
          console.error(`❌ Failed to send email to ${recipient.email}:`, emailError.message)
          failureCount++
        }
      }

      // Update email status and sent time
      const { error } = await supabase
        .from('the_emails')
        .update({
          status: 'Sent',
          sent_time: new Date().toISOString()
        })
        .eq('id', email.id)

      if (error) {
        console.error(`❌ Failed to update email ${email.id} status:`, error)
        throw error
      }

      console.log(`🎉 Email ${email.id} sent successfully!`)
      console.log(`   ✅ Success: ${successCount} recipients`)
      console.log(`   ❌ Failed: ${failureCount} recipients`)
      console.log(`   📊 Total: ${recipients.length} recipients`)

    } catch (error) {
      console.error(`💥 Failed to process scheduled email ${email.id}:`, error)
      throw error
    }
  }
}

// Create and export singleton instance
export const schedulerService = new SchedulerService()

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`\n📡 Received ${signal}, shutting down gracefully...`)
  schedulerService.stop()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  schedulerService.stop()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  schedulerService.stop()
  process.exit(1)
})

console.log('🔧 Email Scheduler Service module loaded')
