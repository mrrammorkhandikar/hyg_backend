const { supabase } = require('./src/db/supabaseClient.js');

async function testTables() {
  console.log('Testing supabase client connections...\n');

  try {
    // Test authors table
    console.log('Testing authors table...');
    const authorsResult = await supabase.from('authors').select('count').limit(1);
    if (authorsResult.error) {
      console.log(`❌ Authors query failed: ${authorsResult.error.message}`);
      console.log(`   Error code: ${authorsResult.error.code}`);
    } else {
      console.log('✅ Authors query succeeded');
    }

    console.log();

    // Test tags table
    console.log('Testing tags table...');
    const tagsResult = await supabase.from('tags').select('count').limit(1);
    if (tagsResult.error) {
      console.log(`❌ Tags query failed: ${tagsResult.error.message}`);
      console.log(`   Error code: ${tagsResult.error.code}`);
    } else {
      console.log('✅ Tags query succeeded');
    }

    console.log();

    // Test a simple INSERT to authors table
    console.log('Testing authors INSERT...');
    const testAuthor = {
      username: 'test_author_' + Date.now(),
      password: 'testpass',
      status: 'draft',
      email: 'test@example.com'
    };

    const insertResult = await supabase.from('authors').insert([testAuthor]);
    if (insertResult.error) {
      console.log(`❌ Authors INSERT failed: ${insertResult.error.message}`);
      console.log(`   Error code: ${insertResult.error.code}`);
    } else {
      console.log('✅ Authors INSERT succeeded');
    }

    process.exit(0);
  } catch (error) {
    console.error('Test failed with exception:', error);
    process.exit(1);
  }
}

testTables();
