const fetch = require('node-fetch');

async function testAdminNewsletterEndpoints() {
  console.log('Testing admin newsletter endpoints...\n');
  
  try {
    // Test 1: Check if subscribers endpoint exists
    console.log('1. Testing GET /newsletter/subscribers (should require admin auth)...');
    const response = await fetch('http://localhost:8080/newsletter/subscribers');
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists and requires authentication');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - check if server is running and routes are registered');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
    
    // Test 2: Check if export endpoint exists
    console.log('\n2. Testing GET /newsletter/export (should require admin auth)...');
    const exportResponse = await fetch('http://localhost:8080/newsletter/export');
    
    if (exportResponse.status === 401) {
      console.log('✅ Export endpoint exists and requires authentication');
    } else if (exportResponse.status === 404) {
      console.log('❌ Export endpoint not found');
    } else {
      console.log(`⚠️  Unexpected status: ${exportResponse.status}`);
    }
    
    // Test 3: Check if newsletter table exists by testing subscription endpoint
    console.log('\n3. Testing newsletter subscription endpoint...');
    const subscribeResponse = await fetch('http://localhost:8080/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      }),
    });
    
    const subscribeResult = await subscribeResponse.json();
    console.log('Subscription test result:', subscribeResult);
    
    if (subscribeResult.message === 'Successfully subscribed to newsletter' || 
        subscribeResult.message === 'Already subscribed') {
      console.log('✅ Newsletter table exists and is working');
    } else {
      console.log('❌ Newsletter table may not exist or has issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. Backend server is running on port 8080');
    console.log('2. Database is connected and newsletter_subscribers table exists');
    console.log('3. All routes are properly registered');
  }
}

testAdminNewsletterEndpoints();
