import { supabase } from '../db/supabaseClient'
import { sendEmail } from './emailService'
import { sendNewsletterWelcomeEmail } from './newsletterWelcomeEmail'

// Email scheduler to handle automated sending of scheduled emails
export class EmailScheduler {
  private static instance: EmailScheduler
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private checkInterval = 60000 // Check every minute (60 seconds)

  private constructor() {}

  public static getInstance(): EmailScheduler {
    if (!EmailScheduler.instance) {
      EmailScheduler.instance = new EmailScheduler()
    }
    return EmailScheduler.instance
  }

  public start(): void {
    if (this.isRunning) {
      console.log('Email scheduler is already running')
      return
    }

    console.log('Starting email scheduler...')
    this.isRunning = true

    // Initial check
    this.checkScheduledEmails()

    // Set up interval to check for scheduled emails
    this.intervalId = setInterval(() => {
      this.checkScheduledEmails()
    }, this.checkInterval)

    console.log(`Email scheduler started. Checking every ${this.checkInterval / 1000} seconds.`)
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Email scheduler is not running')
      return
    }

    console.log('Stopping email scheduler...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('Email scheduler stopped.')
  }

  private async checkScheduledEmails(): Promise<void> {
    try {
      const now = new Date().toISOString()

      // Get emails that are scheduled and need to be sent
      const { data: scheduledEmails, error } = await supabase
        .from('the_emails')
        .select('*')
        .eq('status', 'Scheduled')
        .lte('scheduled_time', now)

      if (error) {
        console.error('Error fetching scheduled emails:', error)
        return
      }

      if (!scheduledEmails || scheduledEmails.length === 0) {
        return
      }

      console.log(`Found ${scheduledEmails.length} scheduled emails to send`)

      // Process each scheduled email
      for (const email of scheduledEmails) {
        try {
          await this.sendScheduledEmail(email)
        } catch (error) {
          console.error(`Error sending scheduled email ${email.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error in checkScheduledEmails:', error)
    }
  }

  private async sendScheduledEmail(email: any): Promise<void> {
    console.log(`Sending scheduled email: ${email.title} (${email.id})`)

    try {
      // Check if email has recipients
      if (!email.emails || !email.emails.list || email.emails.list.length === 0) {
        console.warn(`Email ${email.id} has no recipients, skipping`)
        return
      }

      const recipients = email.emails.list
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
            successCount++

            // Small delay between individual emails
            if (i + batch.length < recipients.length) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS))
            }
          } catch (emailError: any) {
            console.error(`❌ Failed to send email to ${recipient.email}:`, emailError.message)
            failureCount++
          }
        }

        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < recipients.length) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
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
        console.error(`Failed to update email ${email.id} status:`, error)
        throw error
      }

      console.log(`🎉 Email ${email.id} sent successfully!`)
      console.log(`   ✅ Success: ${successCount} recipients`)
      console.log(`   ❌ Failed: ${failureCount} recipients`)
      console.log(`   📊 Total: ${recipients.length} recipients`)

    } catch (error) {
      console.error(`Failed to send scheduled email ${email.id}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const emailScheduler = EmailScheduler.getInstance()

// Auto-start scheduler when module is imported (in production)
if (process.env.NODE_ENV === 'production') {
  emailScheduler.start()
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping email scheduler...')
  emailScheduler.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping email scheduler...')
  emailScheduler.stop()
  process.exit(0)
})
