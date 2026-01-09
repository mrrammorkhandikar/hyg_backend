#!/usr/bin/env node
/**
 * Test script to send a real email to verify delivery
 */

import * as dotenv from 'dotenv';
import { sendEmail } from './src/utils/emailService';

// Load environment variables
dotenv.config();

async function testRealEmail() {
  console.log('🧪 Testing Real Email Delivery...');
  console.log('================================');

  try {
    // Send email to the user's real email
    await sendEmail({
      to: 'morkhandikars@gmail.com',
      subject: 'Test Email - Email System Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🧪 Email System Test</h2>
          <p>This is a test email to verify that the email system is working correctly.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${process.env.GMAIL_USER || 'hygieneshelf.news@gmail.com'}</p>
          <p>If you receive this email, the email system is working properly!</p>
          <p>If you don't see this email in your inbox, please check your spam/junk folder.</p>
          <hr>
          <p><small>This is an automated test email from the HygieneShelf blog system.</small></p>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Please check your inbox (and spam folder) for the test email.');
    console.log('📧 Email sent to: morkhandikars@gmail.com');

  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

// Run the test
testRealEmail().catch(console.error);
