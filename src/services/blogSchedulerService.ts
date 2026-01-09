import { supabase } from '../db/supabaseClient';
import { sendEmail } from '../utils/emailService';

export interface ScheduledPost {
  id: string;
  title: string;
  slug: string;
  shedule_publish: string;
  
}

export class BlogSchedulerService {
  /**
   * Check for posts that need to be published and publish them
   */
  static async processScheduledPosts(): Promise<void> {
    try {
      console.log('Checking for scheduled posts to publish...');

      const now = new Date().toISOString();

      // Find posts that are scheduled to be published now or in the past
      const { data: scheduledPosts, error } = await supabase
        .from('posts')
        .select('id, title, slug, shedule_publish')
        .eq('published', false)
        .not('shedule_publish', 'is', null)
        .lte('shedule_publish', now);

      if (error) {
        console.error('Error fetching scheduled posts:', error);
        return;
      }

      if (!scheduledPosts || scheduledPosts.length === 0) {
        console.log('No scheduled posts to publish');
        return;
      }

      console.log(`Found ${scheduledPosts.length} scheduled posts to publish`);

      for (const post of scheduledPosts) {
        await this.publishScheduledPost(post);
      }
    } catch (error) {
      console.error('Error in processScheduledPosts:', error);
    }
  }

  /**
   * Publish a single scheduled post and send notification email if configured
   */
  private static async publishScheduledPost(post: ScheduledPost): Promise<void> {
    try {
      console.log(`Publishing scheduled post: ${post.title}`);

      // Update the post to published
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          published: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (updateError) {
        console.error(`Error publishing post ${post.id}:`, updateError);
        return;
      }

   

      console.log(`Successfully published post: ${post.title}`);
    } catch (error) {
      console.error(`Error publishing scheduled post ${post.id}:`, error);
    }
  }

  /**
   * Send notification email for a published post
   */
  private static async sendNotificationEmail(emailId: string): Promise<void> {
    try {
      console.log(`Sending notification email: ${emailId}`);

      // Get email details
      const { data: email, error: emailError } = await supabase
        .from('the_emails')
        .select('*')
        .eq('id', emailId)
        .single();

      if (emailError || !email) {
        console.error(`Email not found: ${emailId}`);
        return;
      }

      if (email.status === 'Sent') {
        console.log(`Email ${emailId} has already been sent`);
        return;
      }

      if (!email.emails || !email.emails.list || email.emails.list.length === 0) {
        console.error(`No recipients found for email ${emailId}`);
        return;
      }

      // Send email to all recipients
      const recipients = email.emails.list;
      let successCount = 0;
      let failureCount = 0;

      for (const recipient of recipients) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: email.the_mail.subject,
            html: email.the_mail.html
          });
          successCount++;
        } catch (emailError: any) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
          failureCount++;
        }
      }

      // Update email status and sent time
      const { error: updateError } = await supabase
        .from('the_emails')
        .update({
          status: 'Sent',
          sent_time: new Date().toISOString()
        })
        .eq('id', emailId);

      if (updateError) {
        console.error(`Error updating email status: ${updateError}`);
      }

      console.log(`Email sent to ${successCount} recipients, ${failureCount} failures`);
    } catch (error) {
      console.error(`Error sending notification email ${emailId}:`, error);
    }
  }

  /**
   * Get upcoming scheduled posts (for monitoring/debugging)
   */
  static async getUpcomingScheduledPosts(limit: number = 10): Promise<ScheduledPost[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, shedule_publish')
        .eq('published', false)
        .not('shedule_publish', 'is', null)
        .gt('shedule_publish', now)
        .order('shedule_publish', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching upcoming scheduled posts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUpcomingScheduledPosts:', error);
      return [];
    }
  }
}
