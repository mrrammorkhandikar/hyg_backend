import { sendInboxEmail } from './inboxEmail';

interface NewsletterWelcomeEmailOptions {
  email: string;
  name?: string;
  from?: string;
}

/**
 * Send an attractive welcome email to new newsletter subscribers
 */
export async function sendNewsletterWelcomeEmail(options: NewsletterWelcomeEmailOptions): Promise<void> {
  const subject = 'Welcome to HygieneShelf - Your Health Journey Begins';
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
    body, table, td, div, p, a {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    img {
      display: block;
      border: 0;
      height: auto;
    }

    /* Container */
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      padding: 45px 30px;
      text-align: center;
    }

    h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.4px;
    }

    .header p {
      margin-top: 14px;
      font-size: 18px;
      color: rgba(255,255,255,0.9);
      font-weight: 600;
    }

    /* Content */
    .content {
      padding: 40px 35px;
      background-color: #ffffff;
    }

    .content p {
      font-size: 17px;
      line-height: 1.7;
      color: ${textColor};
      margin-bottom: 22px;
    }

    .content strong {
      font-weight: 700;
    }

    /* Section Card */
    .section-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 28px;
      margin: 30px 0;
    }

    h3 {
      font-size: 20px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 16px;
    }

    ul {
      padding-left: 20px;
      margin: 0;
    }

    ul li {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 12px;
      color: ${textColor};
    }

    /* Callout */
    .callout {
      text-align: center;
      padding: 30px 20px;
      background: #f1f5f9;
      border-radius: 14px;
      margin: 35px 0;
    }

    .callout p {
      margin-bottom: 14px;
    }

    /* Signature */
    .signature {
      text-align: center;
      margin-top: 35px;
    }

    .signature p {
      margin-bottom: 6px;
    }

    /* Footer */
    .footer {
      background-color: #f1f5f9;
      padding: 30px 25px;
      text-align: center;
      color: ${lightText};
      font-size: 14px;
    }

    .tag {
      display: inline-block;
      background-color: #e5e7eb;
      color: ${textColor};
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      margin: 4px;
    }

    .footer a {
      color: ${primaryColor};
      text-decoration: none;
      font-weight: 600;
    }

    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 22px;
      }

      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>

<body>
  <table role="presentation" class="container">
    <tr>
      <td>

        <!-- Header -->
        <table role="presentation" class="header">
          <tr>
            <td>
              <img src="https://hygieneshelf.in/Images/thelogohy.jpeg" alt="HygieneShelf Logo"
                style="width: 80px; height: 80px; border-radius: 50%; background: #ffffff; padding: 8px; margin: 0 auto 18px;">
              <h1>✨ Welcome to HygieneShelf!</h1>
              <p>Your trusted partner in health & wellness</p>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table role="presentation" class="content">
          <tr>
            <td>

              <p>Hi there,</p>

              <p>
                Welcome to <strong>Hygiene Shelf</strong> — I'm genuinely glad you're here.
              </p>

              <p>
                You've just joined a growing community of people who believe that
                <strong>better hygiene leads to better health, calmer minds, and stronger daily habits</strong>
                — without fear, fluff, or confusion.
              </p>

              <p>At Hygiene Shelf, you'll find:</p>

              <div class="section-card">
                <ul>
                  <li><strong>Evidence-based hygiene & wellness guidance</strong></li>
                  <li><strong>Practical routines you can actually follow</strong></li>
                  <li><strong>Honest product recommendations (no hype, no pressure)</strong></li>
                  <li><strong>Simple tools for oral, mental, personal & home hygiene</strong></li>
                  <li><strong>Insights tailored for busy Indian lifestyles</strong></li>
                </ul>
              </div>

              <p>
                Think of this newsletter as your <strong>weekly reset button</strong> —
                where health feels clear, doable, and grounded in science.
              </p>

              <h3>What to expect from me:</h3>

              <div class="section-card">
                <ul>
                  <li><strong>Short, useful reads (never spammy)</strong></li>
                  <li><strong>Habits you can apply the same day</strong></li>
                  <li><strong>Early access to planners & checklists</strong></li>
                  <li><strong>Occasional product guides that save time & money</strong></li>
                </ul>
              </div>

              <p>
                As a healthcare professional, my goal is simple:
                to help you make <strong>small, consistent hygiene choices</strong>
                that protect your long-term health.
              </p>

              <div class="callout">
                <p><strong>👉 Start here:</strong></p>
                <p>
                  Download your <strong>free 7-Day Morning Hygiene Reset Planner</strong>
                  and try it for the next week — designed for real mornings, not ideal ones.
                </p>
              </div>

              <p>
                If you ever have a question, topic request, or hygiene struggle —
                just reply to this email. I read them personally.
              </p>

              <p>
                Thank you for trusting Hygiene Shelf.
                <br>This is just the beginning.
              </p>

              <div class="signature">
                <p><strong>Dr. Bushra Mirza</strong></p>
                <p style="font-size: 15px; color: ${lightText};">
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
              <img src="https://hygieneshelf.in/Images/thelogohy.jpeg"
                alt="HygieneShelf Logo"
                style="width: 50px; height: 50px; border-radius: 50%; background: #ffffff; padding: 6px; margin: 0 auto 12px;">

              <p style="font-weight: 700;">HygieneShelf</p>
              <p>Your Partner in Health & Wellness</p>

              <div>
                <span class="tag">🌿 Natural</span>
                <span class="tag">🔬 Evidence-Based</span>
                <span class="tag">💖 Trusted</span>
              </div>

              <p style="font-size: 12px; margin-top: 16px;">
                © ${new Date().getFullYear()} HygieneShelf. All rights reserved.<br>
                <a href="#">Unsubscribe</a> |
                <a href="https://hygieneshef.com/privacy">Privacy Policy</a>
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

  // Send directly using inbox-optimized email sender
  await sendInboxEmail({
    to: options.email,
    subject,
    html
  });

  console.log(`🎉 HygieneShelf welcome email sent to ${options.email}`);
};
