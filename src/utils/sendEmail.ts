import { createTransporter, refreshAccessTokenIfNeeded } from './mailer';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
  attachments?: any[];
}

/**
 * Generic email sender function with improved error handling and fallback
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Create the best available transporter (SMTP first, OAuth2 fallback)
    const transporter = createTransporter();

    // Set default from address if not provided
    const from = options.from || process.env.SMTP_USER || process.env.GMAIL_USER || 'your-email@gmail.com';

    // Prepare email options
    const mailOptions = {
      from: `"${from}" <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    // Verify transporter before sending
    try {
      await transporter.verify();
      console.log('✅ Transporter verified successfully');
    } catch (verifyError) {
      console.log('⚠️  Transporter verification failed, attempting to refresh credentials...');
      if (transporter.options.auth && transporter.options.auth.type === 'OAuth2') {
        await refreshAccessTokenIfNeeded(transporter);
      }
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to ${options.to}`);
    console.log(`📧 Message ID: ${info.messageId}`);

  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email');
  }
}
