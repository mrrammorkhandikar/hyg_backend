#!/usr/bin/env node

/**
 * Test script for inbox delivery improvements
 * Tests the enhanced email headers and Gmail API integration
 */

require('dotenv').config();

const { sendEmail } = require('./src/utils/sendEmail');
const { sendInboxEmail } = require('./src/utils/inboxEmail');

async function testInboxDelivery() {
  console.log('🧪 Testing Inbox Delivery Improvements...\n');

  // Test data
  const testEmail = process.env.TEST_EMAIL || 'morkhandikars@gmail.com';
  const subject = `Inbox Delivery Test - ${new Date().toISOString()}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inbox Delivery Test</title>
    </head>
    <body>
      <h1>📧 Inbox Delivery Test</h1>
      <p>This email is sent with enhanced headers to ensure inbox delivery.</p>
      <p><strong>Features tested:</strong></p>
      <ul>
        <li>✅ Enhanced email headers for better deliverability</li>
        <li>✅ Newsletter-specific headers (List-ID, Precedence: bulk)</li>
        <li>✅ Gmail API integration for label management</li>
        <li>✅ Anti-spam headers and authentication simulation</li>
        <li>✅ Microsoft Exchange compatibility headers</li>
      </ul>
      <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
      <hr>
      <p><small>This is a test email to verify inbox delivery improvements.</small></p>
    </body>
    </html>
  `;

  try {
    console.log('📤 Sending test email with sendEmail()...');
    await sendEmail({
      to: testEmail,
      subject: subject + ' (sendEmail)',
      html: html,
      from: process.env.GMAIL_USER
    });

    console.log('📤 Sending test email with sendInboxEmail()...');
    await sendInboxEmail({
      to: testEmail,
      subject: subject + ' (sendInboxEmail)',
      html: html
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('📬 Check your inbox (not spam folder) for the test emails.');
    console.log('🔍 Look for:');
    console.log('   - Emails in INBOX, not SPAM');
    console.log('   - Proper sender name "HygieneShelf"');
    console.log('   - Unsubscribe link in email headers');
    console.log('   - No spam warnings or flags');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testInboxDelivery();
}

module.exports = { testInboxDelivery };