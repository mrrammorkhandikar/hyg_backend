const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestSubscribers() {
  console.log('Adding test subscribers to newsletter_subscribers table...\n');
  
  try {
    const testSubscribers = [
      {
        email: 'john.doe@example.com',
        name: 'John Doe',
        unique_user_id: '12345678-1234-1234-1234-123456789012'
      },
      {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        unique_user_id: '23456789-2345-2345-2345-234567890123'
      },
      {
        email: 'bob.johnson@example.com',
        name: 'Bob Johnson',
        unique_user_id: '34567890-3456-3456-3456-345678901234'
      },
      {
        email: 'alice.brown@example.com',
        name: 'Alice Brown',
        unique_user_id: '45678901-4567-4567-4567-456789012345'
      },
      {
        email: 'charlie.wilson@example.com',
        name: 'Charlie Wilson',
        unique_user_id: '56789012-5678-5678-5678-567890123456'
      }
    ];

    for (const subscriber of testSubscribers) {
      console.log(`Adding subscriber: ${subscriber.email}`);
      
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .insert([{
          email: subscriber.email,
          name: subscriber.name,
          unique_user_id: subscriber.unique_user_id
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log(`  ⚠️  Subscriber already exists: ${subscriber.email}`);
        } else {
          console.error(`  ❌ Error adding ${subscriber.email}:`, error.message);
        }
      } else {
        console.log(`  ✅ Successfully added: ${subscriber.email}`);
      }
    }

    // Count total subscribers
    const { count, error: countError } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting subscribers:', countError.message);
    } else {
      console.log(`\n📊 Total subscribers in database: ${count}`);
    }

    console.log('\n🎉 Test subscribers setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

addTestSubscribers();
