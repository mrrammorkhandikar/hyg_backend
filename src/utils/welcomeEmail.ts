import { emailQueue } from './emailQueue';

interface WelcomeEmailOptions {
  email: string;
  name?: string;
  from?: string;
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(options: WelcomeEmailOptions): Promise<void> {
  const subject = 'Welcome to Our Service!';
  const from = options.from || process.env.GMAIL_USER || 'your-email@gmail.com';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 5px 5px; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Our Service!</h1>
      </div>
      <div class="content">
        <h2>Hello ${options.name || 'there'},</h2>
        <p>Thank you for joining our service! We're excited to have you on board.</p>

        <h3>What you can expect:</h3>
        <ul>
          <li>📰 Regular updates and news</li>
          <li>💡 Helpful tips and resources</li>
          <li>🎁 Exclusive offers and promotions</li>
          <li>🤝 Community events and opportunities</li>
        </ul>

        <p>We're committed to providing you with the best experience possible.</p>

        <p>If you have any questions, feel free to reply to this email. We're here to help!</p>

        <p>Best regards,<br/>
        The Team</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Our Service. All rights reserved.</p>
        <p>You're receiving this email because you signed up for our service.</p>
      </div>
    </body>
    </html>
  `;

  // Add to email queue (rate-limited)
  await emailQueue.enqueue({
    to: options.email,
    subject,
    html,
    from,
  });

  console.log(`🎉 Welcome email queued for ${options.email}`);
}
