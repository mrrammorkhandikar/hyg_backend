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
      from: options.from || process.env.GMAIL_USER || 'hygieneshelf.news@gmail.com'
    });

    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const subject = 'Welcome to HygieneShelf - Your Health Journey Starts Here';
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to HygieneShelf</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 20px; font-weight: 600; color: #0f766e; margin-bottom: 20px; }
        .text { margin-bottom: 25px; font-size: 16px; line-height: 1.7; }
        .features { background-color: #f8fafc; padding: 30px; border-radius: 8px; margin: 30px 0; }
        .features h3 { color: #0f766e; margin-top: 0; margin-bottom: 20px; font-size: 20px; }
        .features ul { padding-left: 20px; }
        .features li { margin-bottom: 10px; font-size: 15px; }
        .button { background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; text-align: center; margin: 20px 0; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .footer p { margin: 5px 0; }
        .unsubscribe { font-size: 12px; color: #94a3b8; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to HygieneShelf</h1>
          <p>Your trusted source for health and hygiene guidance</p>
        </div>

        <div class="content">
          <div class="greeting">Hello ${name || 'Valued Subscriber'},</div>

          <div class="text">
            Thank you for joining the HygieneShelf community! We're excited to have you as part of our mission to promote better health and hygiene practices.
          </div>

          <div class="features">
            <h3>What You'll Receive:</h3>
            <ul>
              <li>📧 Regular health tips and hygiene insights from Dr. Bushra Mirza</li>
              <li>💡 Evidence-based wellness advice and practical recommendations</li>
              <li>📰 Updates on the latest health research and findings</li>
              <li>🎯 Personalized health guidance for your lifestyle</li>
            </ul>
          </div>

          <div class="text">
            Our newsletters are designed to provide you with reliable, doctor-approved information to help you maintain optimal health and wellness.
          </div>

          <div class="text">
            Stay tuned for our upcoming newsletters with valuable insights and tips!
          </div>

          <div style="text-align: center;">
            <a href="#" class="button">Explore Our Health Resources</a>
          </div>

          <div class="text">
            Best regards,<br/>
            <strong>Dr. Bushra Mirza</strong><br/>
            Founder, HygieneShelf
          </div>
        </div>

        <div class="footer">
          <p><strong>HygieneShelf</strong></p>
          <p>Promoting Health, Hygiene, and Wellness</p>
          <p>© ${new Date().getFullYear()} HygieneShelf. All rights reserved.</p>

          <div class="unsubscribe">
            <p>You're receiving this email because you subscribed to our newsletter.</p>
            <p><a href="mailto:unsubscribe@hygieneshelf.com">Unsubscribe</a> | <a href="#">Update Preferences</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    from: process.env.GMAIL_USER || 'hygieneshelf.news@gmail.com'
  });
}
