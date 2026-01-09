const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test UUID generation and validation
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function testNewsletterSubscription() {
  console.log('🚀 Testing Newsletter Subscription with unique_user_id...\n');
  
  try {
    // Test 1: Generate and validate UUID
    console.log('1️⃣ Testing UUID generation and validation...');
    const testUUID = generateUUID();
    console.log(`Generated UUID: ${testUUID}`);
    console.log(`Is valid UUID: ${uuidRegex.test(testUUID)}`);
    
    // Test 2: Check if table has unique_user_id column
    console.log('\n2️⃣ Checking database schema...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('newsletter_subscribers')
      .select('unique_user_id')
      .limit(0);
    
    if (tableError) {
      console.error('❌ Error checking table:', tableError.message);
    } else {
      console.log('✅ Table structure accessible');
    }
    
    // Test 3: Subscribe with unique_user_id
    console.log('\n3️⃣ Testing subscription with unique_user_id...');
    const testEmail = `test+${Date.now()}@example.com`;
    const testName = 'Test User';
    
    const { data: subscriber, error: subscribeError } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: testEmail,
        name: testName,
        unique_user_id: testUUID
      }])
      .select()
      .single();
    
    if (subscribeError) {
      console.error('❌ Subscription error:', subscribeError.message);
    } else {
      console.log('✅ Successfully subscribed with unique_user_id');
      console.log(`Subscriber ID: ${subscriber.id}`);
      console.log(`Email: ${subscriber.email}`);
      console.log(`Unique User ID: ${subscriber.unique_user_id}`);
    }
    
    // Test 4: Check subscription status by unique_user_id
    console.log('\n4️⃣ Testing subscription check by unique_user_id...');
    const { data: checkData, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('unique_user_id', testUUID)
      .limit(1);
    
    if (checkError) {
      console.error('❌ Check error:', checkError.message);
    } else if (checkData && checkData.length > 0) {
      console.log('✅ Successfully found subscription by unique_user_id');
      console.log(`Found email: ${checkData[0].email}`);
    } else {
      console.log('❌ Subscription not found by unique_user_id');
    }
    
    // Test 5: Try to subscribe same email again (should get existing user)
    console.log('\n5️⃣ Testing duplicate email subscription...');
    const { data: duplicateData, error: duplicateError } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: testEmail,
        name: 'Different Name',
        unique_user_id: 'different-uuid-1234-5678-90ab-cdef12345678'
      }])
      .select()
      .single();
    
    if (duplicateError && duplicateError.code === '23505') {
      console.log('✅ Correctly prevented duplicate email subscription');
    } else if (duplicateError) {
      console.error('❌ Unexpected error on duplicate email:', duplicateError.message);
    } else {
      console.log('⚠️  Unexpected: Duplicate email was allowed');
    }
    
    // Test 6: Try to subscribe same unique_user_id again (should get existing user)
    console.log('\n6️⃣ Testing duplicate unique_user_id subscription...');
    const { data: uuidDuplicateData, error: uuidDuplicateError } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: 'different@email.com',
        name: 'Another Test',
        unique_user_id: testUUID
      }])
      .select()
      .single();
    
    if (uuidDuplicateError && uuidDuplicateError.code === '23505') {
      console.log('✅ Correctly prevented duplicate unique_user_id subscription');
    } else if (uuidDuplicateError) {
      console.error('❌ Unexpected error on duplicate unique_user_id:', uuidDuplicateError.message);
    } else {
      console.log('⚠️  Unexpected: Duplicate unique_user_id was allowed');
    }
    
    console.log('\n🎉 Newsletter subscription tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNewsletterSubscription();
