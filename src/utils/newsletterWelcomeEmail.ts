import { emailQueue } from './emailQueue';

interface NewsletterWelcomeEmailOptions {
  email: string;
  name?: string;
  from?: string;
}

/**
 * Send an attractive welcome email to new newsletter subscribers
 */
export async function sendNewsletterWelcomeEmail(options: NewsletterWelcomeEmailOptions): Promise<void> {
  const subject = 'Welcome to Hygiene Shelf 🌿 You\'re officially in';
  const from = options.from || process.env.GMAIL_USER || 'hygieneshelf.news@gmail.com';

  // HygieneShelf brand colors
  const primaryColor = '#0f766e';
  const secondaryColor = '#06b6d4';
  const accentColor = '#10b981';
  const textColor = '#1f2937';
  const lightText = '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to HygieneShelf</title>
      <style>
        /* Reset styles */
        body, table, td, div, p, a { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { margin: 0; padding: 0; background-color: #f8fafc; }
        table { border-collapse: collapse; width: 100%; }
        img { display: block; border: 0; height: auto; outline: none; text-decoration: none; }
        
        /* Main container */
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .footer { background-color: #f1f5f9; padding: 30px; text-align: center; color: ${lightText}; font-size: 14px; }
        
        /* Typography */
        h1 { margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        h2 { margin: 0 0 15px 0; font-size: 24px; font-weight: 700; color: ${textColor}; }
        h3 { margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: ${primaryColor}; }
        p { margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${textColor}; }
        .highlight { color: ${primaryColor}; font-weight: 700; }
        
        /* Buttons */
        .btn { display: inline-block; padding: 16px 32px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(15, 118, 110, 0.3); transition: all 0.3s ease; }
        .btn:hover { background-color: #0d5e59; transform: translateY(-2px); box-shadow: 0 8px 15px -3px rgba(15, 118, 110, 0.4); }
        .btn-secondary { background-color: #ffffff; color: ${primaryColor}; border: 2px solid ${primaryColor}; box-shadow: none; }
        .btn-secondary:hover { background-color: ${primaryColor}; color: #ffffff; }
        
        /* Cards */
        .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
        .card-icon { font-size: 24px; margin-bottom: 10px; }
        .benefit-item { display: flex; align-items: flex-start; margin-bottom: 15px; }
        .benefit-icon { color: ${accentColor}; font-size: 20px; margin-right: 15px; margin-top: 2px; }
        .benefit-content h4 { margin: 0 0 5px 0; font-size: 16px; font-weight: 700; color: ${textColor}; }
        .benefit-content p { margin: 0; font-size: 14px; color: ${lightText}; }
        
        /* Badges */
        .badge { display: inline-block; background-color: #ecfdf5; color: ${accentColor}; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #d1fae5; }
        .tag { display: inline-block; background-color: #f1f5f9; color: ${textColor}; padding: 4px 8px; border-radius: 6px; font-size: 12px; margin-right: 8px; }
        
        /* Social icons */
        .social-links { margin-top: 20px; }
        .social-link { display: inline-block; margin: 0 10px; }
        .social-link img { width: 24px; height: 24px; }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
          .header { padding: 30px 20px; }
          h1 { font-size: 24px; }
          .content { padding: 30px 20px; }
          .btn { padding: 14px 24px; font-size: 14px; }
        }
      </style>
    </head>
    <body>
      <table role="presentation" class="container">
        <tr>
          <td>
            <!-- Header with HygieneShelf branding -->
            <table role="presentation" class="header">
              <tr>
                <td>
                  <div style="text-align: center; margin-bottom: 20px;">
                    <!-- HygieneShelf Logo -->
                    <img src="https://hygieneshelf.in/Images/thelogohy.jpeg" alt="HygieneShelf Logo" style="width: 80px; height: 80px; border-radius: 50%; background: white; padding: 8px;">
                  </div>
                  <h1>✨ Welcome to HygieneShelf!</h1>
                  <p style="margin: 15px 0 0 0; font-size: 18px; color: rgba(255,255,255,0.9); font-weight: 600;">
                    Your trusted partner in health & wellness
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main Content -->
            <table role="presentation" class="content">
              <tr>
                <td>
                  <p style="font-size: 18px; line-height: 1.7;">
                    Hi there,
                  </p>

                  <p style="font-size: 18px; line-height: 1.7;">
                    Welcome to <strong>Hygiene Shelf</strong> — I'm genuinely glad you're here.
                  </p>

                  <p style="font-size: 18px; line-height: 1.7;">
                    You've just joined a growing community of people who believe that <strong>better hygiene leads to better health, calmer minds, and stronger daily habits</strong> — without fear, fluff, or confusion.
                  </p>

                  <p style="font-size: 18px; line-height: 1.7;">
                    At Hygiene Shelf, you'll find:
                  </p>

                  <ul style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    <li style="margin-bottom: 10px;"><strong>Evidence-based hygiene & wellness guidance</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Practical routines you can actually follow</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Honest product recommendations (no hype, no pressure)</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Simple tools to improve oral, mental, personal, and home hygiene</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Insights designed especially for busy Indian lifestyles</strong></li>
                  </ul>

                  <p style="font-size: 18px; line-height: 1.7;">
                    Think of this newsletter as your <strong>weekly reset button</strong> — a space where health feels clear, doable, and grounded in science.
                  </p>

                  <h3 style="font-size: 20px; font-weight: 700; color: ${primaryColor}; margin: 30px 0 15px 0;">What to expect from me:</h3>

                  <ul style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    <li style="margin-bottom: 10px;"><strong>Short, useful reads (not spammy emails)</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Actionable hygiene habits you can apply the same day</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Early access to planners, checklists, and challenges</strong></li>
                    <li style="margin-bottom: 10px;"><strong>Occasional product guides that save you time and money</strong></li>
                  </ul>

                  <p style="font-size: 18px; line-height: 1.7;">
                    As a healthcare professional, my goal is simple:
                    to help you make <strong>small, consistent hygiene choices</strong> that protect your long-term health.
                  </p>

                  <div style="text-align: center; margin: 40px 0;">
                    <p style="font-size: 18px; line-height: 1.7; margin-bottom: 20px;">
                      <strong>👉 Start here:</strong>
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                      If you haven't already, download your <strong>free 7-Day Morning Hygiene Reset Planner</strong> and try it for the next week. It's designed to fit into real mornings, not ideal ones.
                    </p>
                  </div>

                  <p style="font-size: 18px; line-height: 1.7;">
                    If you ever have a question, topic request, or hygiene struggle you want covered — just reply to this email. I read them personally.
                  </p>

                  <p style="font-size: 18px; line-height: 1.7;">
                    Thank you for trusting Hygiene Shelf.
                    This is just the beginning.
                  </p>

                  <div style="text-align: center; margin-top: 30px;">
                    <p style="font-size: 18px; line-height: 1.7; font-weight: 600;">
                      Warmly,<br>
                      <strong>Dr. Bushra Mirza</strong>
                    </p>
                    <p style="font-size: 16px; color: ${lightText}; margin-top: 10px;">
                      Founder, Hygiene Shelf<br>
                      Healthcare Professional & Medical Writer
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table role="presentation" class="footer">
              <tr>
                <td>
                  <div style="margin-bottom: 15px;">
                    <img src="https://hygieneshelf.in/Images/thelogohy.jpeg" alt="HygieneShelf Logo" style="width: 50px; height: 50px; border-radius: 50%; background: white; padding: 6px; border: 1px solid #e2e8f0;">
                  </div>
                  <p style="margin: 0 0 10px 0; font-weight: 700;">HygieneShelf</p>
                  <p style="margin: 0 0 15px 0; font-size: 14px;">Your Partner in Health & Wellness</p>
                  <div style="margin-bottom: 15px;">
                    <span class="tag">🌿 Natural</span>
                    <span class="tag">🔬 Evidence-Based</span>
                    <span class="tag">💖 Trusted</span>
                  </div>
                  <p style="margin: 0; font-size: 12px;">
                    © ${new Date().getFullYear()} HygieneShelf. All rights reserved.<br>
                    You're receiving this because you subscribed to our newsletter.<br>
                    <a href="#" style="color: ${primaryColor}; text-decoration: none;">Unsubscribe</a> | 
                    <a href="https://hygieneshef.com/privacy" style="color: ${primaryColor}; text-decoration: none;">Privacy Policy</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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

  console.log(`🎉 HygieneShelf welcome email queued for ${options.email}`);
};
