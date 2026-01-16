const fetch = require('node-fetch').default;

async function testNewsletterSubscription() {
  try {
    console.log('Testing newsletter subscription with real email...');

    const response = await fetch('http://localhost:8080/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'perfect32.us@gmail.com',
        name: 'Test User'
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Subscription result:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Subscription successful');
      console.log('🎉 Welcome email should have been queued for sending');
    } else {
      console.log('❌ Subscription failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewsletterSubscription();