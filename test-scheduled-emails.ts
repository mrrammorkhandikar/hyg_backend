#!/usr/bin/env node
/**
 * Test script to verify scheduled email functionality with bulk processing
 */

import * as dotenv from 'dotenv';
import { supabase } from './src/db/supabaseClient';

// Load environment variables
dotenv.config();

async function testScheduledEmails() {
  console.log('🕐 Testing Scheduled Email Functionality...');
  console.log('===========================================');

  try {
    // Create a test scheduled email
    const scheduledTime = new Date();
    scheduledTime.setMinutes(scheduledTime.getMinutes() + 1); // Schedule for 1 minute from now

    const testEmail = {
      title: 'Test Scheduled Bulk Email',
      type: 'Newsletter',
      the_mail: {
        subject: 'Scheduled Bulk Email Test - HygieneShelf',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scheduled Email Test</title>
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
                <h1>🕐 Scheduled Email Test</h1>
                <p>HygieneShelf Automated Scheduling Verification</p>
              </div>

              <div class="content">
                <p>Hello,</p>

                <p>This email was sent automatically by the scheduled email system with bulk processing and rate limiting.</p>

                <div class="status">
                  <h3>✅ Scheduled Email Successful</h3>
                  <p>This email was processed in batches with proper rate limiting to avoid Gmail restrictions.</p>
                </div>

                <div class="info">
                  <strong>Test Details:</strong><br/>
                  • Scheduled: ${scheduledTime.toISOString()}<br/>
                  • Sent: ${new Date().toISOString()}<br/>
                  • Method: Bulk processing with rate limiting<br/>
                  • Your Email: <strong>{{recipient}}</strong>
                </div>

                <p><strong>Features Tested:</strong></p>
                <ul>
                  <li>✅ Scheduled email processing</li>
                  <li>✅ Bulk email batching (10 emails/batch)</li>
                  <li>✅ Rate limiting (2-second delays)</li>
                  <li>✅ Gmail SMTP compatibility</li>
                  <li>✅ Automatic status updates</li>
                </ul>

                <p>If you received this email, the scheduled email system is working perfectly!</p>

                <p>Best regards,<br/>
                <strong>HygieneShelf Development Team</strong></p>
              </div>

              <div class="footer">
                <p><strong>HygieneShelf</strong> - Scheduled Email System Test</p>
                <p>This is a test email sent by the automated scheduler.</p>
                <p>© ${new Date().getFullYear()} HygieneShelf. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      emails: {
        list: [
          { email: 'rammorkhandikar@gmail.com', name: 'Ram' },
          { email: 'morkhandikar@gmail.com', name: 'Mor' },
          { email: 'rammorkhandikar8@gmail.com', name: 'Ram 8' }
        ]
      },
      status: 'Scheduled',
      scheduled_time: scheduledTime.toISOString()
    };

    // Insert the test scheduled email
    const { data, error } = await supabase
      .from('the_emails')
      .insert([testEmail])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create scheduled email:', error);
      return;
    }

    console.log('✅ Test scheduled email created successfully!');
    console.log(`📧 Email ID: ${data.id}`);
    console.log(`📅 Scheduled for: ${scheduledTime.toLocaleString()}`);
    console.log(`👥 Recipients: ${testEmail.emails.list.length}`);

    console.log('');
    console.log('⏳ Waiting for scheduler to process the email...');
    console.log('📝 The scheduler checks every 60 seconds for scheduled emails.');
    console.log('🔄 You should see processing logs in the server console.');

    // Wait a bit to see if it gets processed
    setTimeout(() => {
      console.log('');
      console.log('🎯 Test completed! Check the server logs for processing details.');
      console.log('📧 If the email was sent successfully, you should see batch processing logs.');
    }, 70000); // Wait 70 seconds

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testScheduledEmails().catch(console.error);
