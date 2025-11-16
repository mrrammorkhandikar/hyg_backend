const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use environment variables from Render
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', !!supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey ? '✓' : '✗');
  console.error('\nPlease set these in your Render environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migrations...');
    console.log('📍 Supabase URL:', supabaseUrl.replace(/https?:\/\//, '').substring(0, 20) + '...');

    // Migration files to run in order
    const migrations = [
      'create_posts_table.sql',
      'create_authors_table.sql',
      'create_comments_and_contact_tables.sql',
      'add_author_column.sql',
      'add_tag_type_column.sql',
      'add_blog_count_and_triggers.sql',
      'create_affiliate_links_system.sql',
      'update_affiliate_clicks_schema.sql'
    ];

    console.log(`📄 Will run ${migrations.length} migrations...\n`);

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, 'migrations', migration);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migration}`);
        continue;
      }

      try {
        console.log(`⏳ Running: ${migration}`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Try using rpc exec_sql first
        const { error: rpcError } = await supabase.rpc('exec_sql', {
          sql: sql
        });

        if (rpcError) {
          console.log(`   ℹ️ RPC failed, trying direct SQL execution...`);

          // Fallback: Try direct execution if rpc fails
          try {
            // Split SQL by semicolons and execute each statement
            const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

            for (const statement of statements) {
              if (statement.trim()) {
                const { error: directError } = await supabase.rpc('exec_sql', {
                  sql: statement.trim()
                });

                if (directError && !directError.message.includes('already exists')) {
                  console.log(`   ⚠️ Statement failed: ${directError.message.substring(0, 100)}...`);
                }
              }
            }
          } catch (fallbackError) {
            console.log(`   ⚠️ Direct execution also failed: ${fallbackError.message.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ✅ ${migration} completed successfully`);
        }

      } catch (migrationError) {
        console.log(`   ⚠️ ${migration} encountered issues: ${migrationError.message.substring(0, 100)}...`);
      }
    }

    console.log('\n🔍 Testing database tables...\n');

    // Test key tables
    const tablesToTest = ['authors', 'posts', 'comments', 'contact_form_submissions'];

    for (const table of tablesToTest) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ Table '${table}' not found`);
          } else {
            console.log(`⚠️ Table '${table}' error: ${error.message}`);
          }
        } else {
          console.log(`✅ Table '${table}' accessible`);
        }
      } catch (err) {
        console.log(`❌ Error testing '${table}': ${err.message}`);
      }
    }

    // Test admin user creation
    console.log('\n👤 Setting up admin user...');
    try {
      const adminUsername = process.env.ADMIN_USERNAME || 'DrBushraMirza';
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

      if (!adminPassword) {
        console.log('⚠️ ADMIN_PASSWORD not set, skipping admin creation');
      } else {
        const bcrypt = require('bcryptjs');

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

        // Create admin user
        const { data: existingAdmin } = await supabase
          .from('authors')
          .select('id')
          .eq('username', adminUsername)
          .single();

        if (existingAdmin) {
          console.log('✅ Admin user already exists');
        } else {
          const { error: insertError } = await supabase
            .from('authors')
            .insert([{
              username: adminUsername,
              password: hashedPassword,
              email: adminEmail,
              name: 'Dr. Bushra Mirzah',
              bio: 'Dental health expert and administrator'
            }]);

          if (insertError) {
            console.log(`⚠️ Admin creation failed: ${insertError.message}`);
          } else {
            console.log('✅ Admin user created successfully');
            console.log(`   Username: ${adminUsername}`);
            console.log(`   Email: ${adminEmail}`);
          }
        }
      }
    } catch (adminError) {
      console.log(`⚠️ Admin setup error: ${adminError.message}`);
    }

    console.log('\n🎉 Migration process completed!');
    console.log('📝 Check the output above for any issues.');
    console.log('🧪 Test the API now with: POST /auth/login');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
