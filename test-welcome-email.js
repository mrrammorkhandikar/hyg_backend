const { sendNewsletterWelcomeEmail } = require('./src/utils/newsletterWelcomeEmail.ts');

async function testWelcomeEmail() {
  try {
    console.log('Testing newsletter welcome email directly...');

    await sendNewsletterWelcomeEmail({
      email: 'rammorkhandikar8@gmail.com',
      name: 'Test User'
    });

    console.log('✅ Welcome email queued successfully');
  } catch (error) {
    console.error('❌ Error queuing welcome email:', error.message);
  }
}

testWelcomeEmail();