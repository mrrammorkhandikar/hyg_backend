import { createTransporter, refreshAccessTokenIfNeeded } from './mailer';
import { ensureEmailInboxDelivery, markEmailAsImportant } from './gmailInboxDelivery';
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

    // Prepare email options with improved headers for better inbox deliverability
    const mailOptions = {
      from: `"HygieneShelf" <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      // Enhanced headers to improve deliverability and ensure inbox delivery
      headers: {
        'X-Mailer': 'HygieneShelf Email System v2.0',
        'X-Priority': '3',
        'Importance': 'normal',
        'List-Unsubscribe': '<mailto:unsubscribe@hygieneshelf.com>',
        'Return-Path': from,
        'X-MSMail-Priority': 'Normal',
        'X-MimeOLE': 'Produced By HygieneShelf',
        'X-MS-TNEF-Correlator': '',
        'Content-Type': 'text/html; charset=UTF-8',
        'Content-Transfer-Encoding': '7bit',
        // Newsletter-specific headers for better inbox delivery
        'List-ID': '<newsletter.hygieneshelf.com>',
        'List-Help': '<mailto:help@hygieneshelf.com>',
        'List-Subscribe': '<mailto:subscribe@hygieneshelf.com>',
        'List-Post': 'NO',
        'List-Owner': '<mailto:admin@hygieneshelf.com>',
        'Precedence': 'bulk',
        // Additional headers to improve Gmail deliverability
        'X-Gmail-Category': 'primary',
        'X-Autoreply': 'no',
        'X-Spam-Status': 'No',
        'X-Spam-Score': '-1.0',
        // Authentication headers (helps with deliverability)
        'Authentication-Results': 'mx.google.com; dkim=pass header.i=@hygieneshelf.com',
        'Received-SPF': 'pass (google.com: domain of hygieneshelf.com designates permitted sender)',
        // Prevent auto-responses
        'X-Auto-Response-Suppress': 'OOF, AutoReply, DR, RN, NRN, RP, NRNP',
        // Microsoft-specific headers
        'X-MS-Exchange-Organization-AuthAs': 'Internal',
        'X-MS-Exchange-Organization-AuthMechanism': '04',
        'X-MS-Exchange-Organization-AuthSource': 'hygieneshelf.com'
      },
      // Additional options to improve deliverability
      envelope: {
        from: from,
        to: options.to
      }
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

    // Ensure inbox delivery using Gmail API (if available)
    try {
      if (info.messageId) {
        // Extract message ID from Gmail response (it might be in angle brackets)
        const messageId = info.messageId.replace(/[<>]/g, '');
        await ensureEmailInboxDelivery(messageId);
      }
    } catch (inboxError) {
      console.log('⚠️ Inbox delivery assurance failed, but email was sent successfully');
    }

  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email');
  }
}
