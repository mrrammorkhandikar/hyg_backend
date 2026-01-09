#!/usr/bin/env node
/**
 * Test script for the email system
 *
 * This script tests:
 * 1. Environment variable loading
 * 2. Gmail transporter creation
 * 3. Email queue functionality
 * 4. Welcome email sending
 *
 * Usage: node test-email-system.ts
 */

import * as dotenv from 'dotenv';
import { createGmailTransporter, getFreshAccessToken } from './src/utils/mailer';
import { sendEmail } from './src/utils/sendEmail';
import { emailQueue } from './src/utils/emailQueue';
import { sendWelcomeEmail } from './src/utils/welcomeEmail';

// Load environment variables
dotenv.config();

async function testEmailSystem() {
  console.log('🧪 Testing Email System...');
  console.log('========================');

  try {
    // Test 1: Check environment variables
    console.log('1️⃣ Testing environment variables...');
    if (!process.env.GMAIL_USER || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
      console.log('❌ Missing required environment variables');
      console.log('Please create a .env file based on .env.example');
      return;
    }
    console.log('✅ Environment variables loaded successfully');

    // Test 2: Create Gmail transporter
    console.log('\n2️⃣ Testing Gmail transporter creation...');
    const transporter = createGmailTransporter();
    console.log('✅ Gmail transporter created successfully');

    // Test 3: Get fresh access token
    console.log('\n3️⃣ Testing access token refresh...');
    const accessToken = await getFreshAccessToken();
    console.log('✅ Access token refreshed successfully');
    console.log(`🔑 Access token: ${accessToken.substring(0, 20)}...`);

    // Test 4: Email queue functionality
    console.log('\n4️⃣ Testing email queue...');
    console.log(`📊 Current queue length: ${emailQueue.getQueueLength()}`);

    // Test 5: Send welcome email (this will be queued)
    console.log('\n5️⃣ Testing welcome email...');
    await sendWelcomeEmail({
      email: 'test@example.com',
      name: 'Test User',
    });
    console.log(`📊 Queue length after adding welcome email: ${emailQueue.getQueueLength()}`);

    // Test 6: Send direct email (this will be queued)
    console.log('\n6️⃣ Testing direct email...');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email</p>',
    });
    console.log(`📊 Queue length after adding direct email: ${emailQueue.getQueueLength()}`);

    console.log('\n✅ All tests completed successfully!');
    console.log('📧 Emails are being processed in the background with rate limiting (1 email per minute)');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmailSystem().catch(console.error);
