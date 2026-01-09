import { sendEmail as newSendEmail } from './sendEmail';
import * as dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Use the new email system with rate limiting and automatic token refresh
    await newSendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      from: options.from || process.env.GMAIL_USER || 'morkhandikars@gmail.com'
    });

    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const subject = 'Welcome to HygieneShelf Newsletter!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0f766e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { background-color: #0f766e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to HygieneShelf Newsletter!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name || 'there'},</h2>
          <p>Thank you for subscribing to HygieneShelf newsletter! We're thrilled to have you join our community.</p>

          <h3>What to expect:</h3>
          <ul>
            <li>📰 Weekly health tips and hygiene insights from Dr. Bushra Mirza</li>
            <li>💡 Exclusive wellness advice and practical health recommendations</li>
            <li>🎁 Special offers and early access to new resources</li>
            <li>🤝 Invitations to community events and Q&A sessions</li>
          </ul>

          <p>As a thank you for joining, here are some perks you'll enjoy:</p>
          <ul>
            <li>📚 Access to subscriber-only content and in-depth health guides</li>
            <li>🔍 Early access to new articles and research findings</li>
            <li>🎓 Priority registration for webinars and workshops</li>
            <li>💌 Personalized health recommendations based on your interests</li>
          </ul>

          <p>We're committed to providing you with valuable, evidence-based health information that can help you live a healthier, happier life.</p>

          <p>Stay tuned for our first newsletter coming soon!</p>

          <p>Warm regards,<br/>
          Dr. Bushra Mirza and the HygieneShelf Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} HygieneShelf. All rights reserved.</p>
          <p>You're receiving this email because you subscribed to our newsletter. If you didn't subscribe, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    from: 'morkhandikars@gmail.com'
  });
}
