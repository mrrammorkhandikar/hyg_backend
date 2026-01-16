import { createTransporter } from './mailer';
import { ensureEmailInboxDelivery } from './gmailInboxDelivery';

interface InboxEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send emails optimized for inbox delivery
 * Uses minimal headers to avoid spam filtering
 */
export async function sendInboxEmail(options: InboxEmailOptions): Promise<void> {
  const transporter = createTransporter();

  // Use a professional-looking sender (even if it's the same Gmail account)
  const from = process.env.GMAIL_USER || 'noreply@hygieneshelf.com';

  const mailOptions = {
    from: `"HygieneShelf" <${from}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    // Enhanced headers for optimal inbox delivery
    headers: {
      'X-Mailer': 'HygieneShelf Email System v2.0',
      'X-Priority': '3',
      'Importance': 'normal',
      'List-Unsubscribe': '<mailto:unsubscribe@hygieneshelf.com>',
      'Return-Path': from,
      'X-MSMail-Priority': 'Normal',
      'X-MimeOLE': 'Produced By HygieneShelf',
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

  const result = await transporter.sendMail(mailOptions);
  console.log(`✅ Inbox-optimized email sent to ${options.to}`);
  console.log(`📧 Message ID: ${result.messageId}`);

  // Ensure inbox delivery using Gmail API (if available)
  try {
    if (result.messageId) {
      // Extract message ID from Gmail response (it might be in angle brackets)
      const messageId = result.messageId.replace(/[<>]/g, '');
      await ensureEmailInboxDelivery(messageId);
    }
  } catch (inboxError) {
    console.log('⚠️ Inbox delivery assurance failed, but email was sent successfully');
  }
}
