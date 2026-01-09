const fetch = require('node-fetch');

async function testNewsletter() {
  try {
    console.log('Testing newsletter subscription...');

    // Test subscription
    const response = await fetch('http://localhost:8080/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      }),
    });

    const result = await response.json();
    console.log('Subscription result:', result);

    // Test check subscription
    const checkResponse = await fetch('http://localhost:8080/newsletter/check?email=test@example.com');
    const checkResult = await checkResponse.json();
    console.log('Check subscription result:', checkResult);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testNewsletter();
