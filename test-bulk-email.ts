#!/usr/bin/env node
/**
 * Test script to send bulk emails to specific recipients
 */

import * as dotenv from 'dotenv';
import { sendEmail } from './src/utils/emailService';

// Load environment variables
dotenv.config();

async function testBulkEmail() {
  console.log('📧 Testing Bulk Email Sending...');
  console.log('=================================');

  const recipients = [
    'rammorkhandikar@gmail.com',
    'morkhandikar@gmail.com',
    'rammorkhandikar8@gmail.com'
  ];

  const subject = 'HygieneShelf Bulk Email Test - Batch Processing';
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bulk Email Test</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .status { background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .status h3 { color: #0ea5e9; margin-top: 0; }
        .info { background-color: #f8fafc; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .success { color: #059669; font-weight: 600; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Bulk Email Test</h1>
          <p>HygieneShelf Batch Processing Verification</p>
        </div>

        <div class="content">
          <p>Hello,</p>

          <p>This email is part of a bulk sending test to verify that our email system can properly send to multiple recipients with rate limiting and batch processing.</p>

          <div class="status">
            <h3>✅ Bulk Email Delivery Test</h3>
            <p>This email was sent as part of a batch of 3 emails with proper rate limiting.</p>
          </div>

          <div class="info">
            <strong>Test Details:</strong><br/>
            • Sent: ${new Date().toISOString()}<br/>
            • Batch Size: 3 recipients<br/>
            • Method: SMTP with rate limiting<br/>
            • Your Email: <strong>{{recipient}}</strong>
          </div>

          <p><strong>What this test verifies:</strong></p>
          <ul>
            <li>✅ Multiple recipient handling</li>
            <li>✅ Rate limiting (delays between emails)</li>
            <li>✅ Batch processing</li>
            <li>✅ Gmail SMTP compatibility</li>
          </ul>

          <p>If you received this email in your inbox (not spam), the bulk email system is working perfectly!</p>

          <p>Best regards,<br/>
          <strong>HygieneShelf Development Team</strong></p>
        </div>

        <div class="footer">
          <p><strong>HygieneShelf</strong> - Bulk Email System Test</p>
          <p>This is a test email sent to multiple recipients.</p>
          <p>© ${new Date().getFullYear()} HygieneShelf. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`📧 Starting bulk email test to ${recipients.length} recipients:`);
  recipients.forEach((email, index) => {
    console.log(`  ${index + 1}. ${email}`);
  });
  console.log('');

  // Send emails with rate limiting (simulate batch processing)
  const DELAY_BETWEEN_EMAILS = 1000; // 1 second between emails for testing

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    console.log(`📤 [${i + 1}/${recipients.length}] Sending to: ${recipient}`);

    try {
      // Personalize the email content
      const personalizedHtml = html.replace('{{recipient}}', recipient);

      await sendEmail({
        to: recipient,
        subject: subject,
        html: personalizedHtml
      });

      console.log(`✅ Successfully sent to: ${recipient}`);

      // Add delay between emails (except for the last one)
      if (i < recipients.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_EMAILS}ms before next email...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
      }
    } catch (error: any) {
      console.error(`❌ Failed to send to ${recipient}:`, error.message);
    }
  }

  console.log('');
  console.log('🎉 Bulk email test completed!');
  console.log('📬 Please check your inboxes for the test emails.');
  console.log('⚠️  If emails go to spam, mark them as "Not Spam" for future deliveries.');
}

// Run the test
testBulkEmail().catch(console.error);
