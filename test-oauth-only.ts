#!/usr/bin/env node
/**
 * Test script to verify OAuth2 email sending only
 */

import * as dotenv from 'dotenv';
import { createGmailTransporter, getFreshAccessToken } from './src/utils/mailer';
import { sendEmail } from './src/utils/sendEmail';

// Load environment variables
dotenv.config();

async function testOAuthOnly() {
  console.log('🧪 Testing OAuth2 Email Delivery...');
  console.log('====================================');

  try {
    // Test 1: Check OAuth2 environment variables
    console.log('1️⃣ Checking OAuth2 environment variables...');
    if (!process.env.GMAIL_USER || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
      console.log('❌ Missing required Gmail OAuth2 environment variables');
      return;
    }
    console.log('✅ OAuth2 environment variables present');

    // Test 2: Get fresh access token
    console.log('\n2️⃣ Testing access token refresh...');
    const accessToken = await getFreshAccessToken();
    console.log('✅ Access token refreshed successfully');
    console.log(`🔑 Access token: ${accessToken.substring(0, 20)}...`);

    // Test 3: Create Gmail transporter
    console.log('\n3️⃣ Creating Gmail OAuth2 transporter...');
    const transporter = createGmailTransporter();
    console.log('✅ Gmail OAuth2 transporter created');

    // Test 4: Verify transporter
    console.log('\n4️⃣ Verifying transporter...');
    await transporter.verify();
    console.log('✅ Transporter verified successfully');

    // Test 5: Send test email
    console.log('\n5️⃣ Sending test email via OAuth2...');
    await sendEmail({
      to: 'morkhandikars@gmail.com',
      subject: 'OAuth2 Test Email - HygieneShelf',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🔐 OAuth2 Email Test</h2>
          <p>This email was sent using Gmail OAuth2 authentication.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>Method:</strong> OAuth2 (not SMTP)</p>
          <p><strong>From:</strong> ${process.env.GMAIL_USER}</p>
          <p>If you receive this email, OAuth2 is working properly!</p>
          <p>Please check your inbox <strong>AND spam/junk folder</strong>.</p>
          <hr>
          <p><small>This is an OAuth2 authentication test from HygieneShelf.</small></p>
        </div>
      `
    });

    console.log('✅ OAuth2 test email sent successfully!');
    console.log('📧 Please check your inbox AND spam/junk folder');

  } catch (error) {
    console.error('❌ OAuth2 test failed:', error);
  }
}

// Run the test
testOAuthOnly().catch(console.error);
