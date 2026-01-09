const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ebgvyxalbaqhbztnusvj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ3Z5eGFsYmFxaGJ6dG51c3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODgyNzgsImV4cCI6MjA3NjU2NDI3OH0.C_5bCy7y5lov42f96bAAzgP8HmlRtGxmbnFZGWbAyFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createNewsletterTable() {
  try {
    console.log('Creating newsletter_subscribers table...');

    // First, check if the table already exists
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .limit(1);

      if (!error) {
        console.log('Newsletter subscribers table already exists!');
        return;
      }

      if (error && !error.message.includes('relation "newsletter_subscribers" does not exist')) {
        console.log('Unexpected error checking table:', error.message);
        // Continue with table creation anyway
      }
    } catch (checkError) {
      console.log('Error checking if table exists:', checkError.message);
    }

    // SQL to create the table
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        unique_user_id TEXT,
        subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unique_user_id ON newsletter_subscribers(unique_user_id);

      ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Allow public read access to newsletter subscribers"
      ON newsletter_subscribers FOR SELECT
      USING (true);

      CREATE POLICY "Allow public insert to newsletter subscribers"
      ON newsletter_subscribers FOR INSERT
      WITH CHECK (true);

      CREATE POLICY "Allow public update to newsletter subscribers"
      ON newsletter_subscribers FOR UPDATE
      USING (true)
      WITH CHECK (true);
    `;

    // Use the Supabase admin client to execute raw SQL
    // Note: This requires the service_role key with proper permissions
    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await adminSupabase.rpc('execute_sql', {
      sql: createTableSql
    });

    if (error) {
      console.error('Error creating newsletter_subscribers table:', error);

      // Try alternative approach - create table via Supabase dashboard API if available
      console.log('Trying alternative approach...');

      // If the above fails, we'll need to manually create the table via Supabase dashboard
      console.log('If table creation failed, you may need to:');
      console.log('1. Go to Supabase dashboard');
      console.log('2. Navigate to Table Editor');
      console.log('3. Click "Create a new table"');
      console.log('4. Name it "newsletter_subscribers"');
      console.log('5. Add columns: id (bigint, primary key), email (text, unique), name (text), unique_user_id (text), subscribed_at (timestamptz), created_at (timestamptz)');
      console.log('6. Enable Row Level Security and create appropriate policies');
    } else {
      console.log('Newsletter subscribers table created successfully!');

      // Test the table
      const { data: testData, error: testError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .limit(1);

      if (testError) {
        console.log('Table created but test query failed:', testError.message);
      } else {
        console.log('Table is accessible and working!');
      }
    }

  } catch (err) {
    console.error('Failed to create newsletter table:', err.message);
  }
}

createNewsletterTable();
