const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Use environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('   SUPABASE_URL:', !!supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  try {
    console.log('👤 Creating admin user...');

    const adminUsername = 'DrBushraMirza';
    const adminPassword = '12345'; // Change this to a secure password
    const adminEmail = 'admin@example.com';

    // Hash password
    console.log('🔒 Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Check if admin already exists
    console.log('🔍 Checking for existing admin...');
    const { data: existingAdmin } = await supabase
      .from('authors')
      .select('id, username')
      .eq('username', adminUsername)
      .single();

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Username: ${existingAdmin.username}`);
    } else {
      // Create admin user
      console.log('🆕 Creating new admin user...');
      const { data, error } = await supabase
        .from('authors')
        .insert([{
          username: adminUsername,
          password: hashedPassword,
          email: adminEmail
        }])
        .select('id, username, email')
        .single();

      if (error) {
        console.error('❌ Failed to create admin:', error.message);
        console.error('Full error:', error);
      } else {
        console.log('✅ Admin user created successfully!');
        console.log(`   ID: ${data.id}`);
        console.log(`   Username: ${data.username}`);
        console.log(`   Email: ${data.email}`);
      }
    }

    // Test login
    console.log('\n🧪 Testing login...');
    try {
      const { data: testLogin } = await supabase
        .from('authors')
        .select('id, username')
        .eq('username', adminUsername)
        .single();

      if (testLogin) {
        console.log('✅ Admin user accessible for login');
        console.log('🏁 Ready to test API!');
      }
    } catch (loginError) {
      console.error('❌ Admin user not accessible:', loginError.message);
    }

  } catch (error) {
    console.error('💥 Admin creation failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdmin();
