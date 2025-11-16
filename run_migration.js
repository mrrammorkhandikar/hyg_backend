const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ebgvyxalbaqhbztnusvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ3Z5eGFsYmFxaGJ6dG51c3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODgyNzgsImV4cCI6MjA3NjU2NDI3OH0.C_5bCy7y5lov42f96bAAzgP8HmlRtGxmbnFZGWbAyFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running all migrations...');

    // Read and execute create_authors_table.sql

    const authorsMigrationPath = path.join(__dirname, 'migrations', 'create_authors_table.sql');
    const authorsSql = fs.readFileSync(authorsMigrationPath, 'utf8');

    console.log('Creating authors table...');
    const { error: authorsError } = await supabase.rpc('exec_sql', {
      sql: authorsSql
    });

    if (authorsError) {
      console.error('Error creating authors table:', authorsError);
      // Try to test if table already exists
      const { error: testAuthorsError } = await supabase
        .from('authors')
        .select('*')
        .limit(1);

      if (testAuthorsError && testAuthorsError.code !== 'PGRST116') {
        console.log('Authors table may not exist. You might need to run the SQL manually in Supabase dashboard.');
      } else {
        console.log('Authors table already exists or is accessible.');
      }
    } else {
      console.log('Authors table created successfully!');
    }

    // Create affiliate_links table (existing code)
    console.log('Creating affiliate_links table...');
    const affiliateLinksSql = fs.readFileSync(path.join(__dirname, 'migrations', 'create_affiliate_links_system.sql'), 'utf8');

    const { error: affiliateLinksError } = await supabase.rpc('exec_sql', {
      sql: affiliateLinksSql
    });

    if (affiliateLinksError) {
      console.log('Error with affiliate links migration:', affiliateLinksError);
    } else {
      console.log('Affiliate links system created successfully!');
    }

    // Add blog_count and triggers
    console.log('Adding blog_count field and triggers...');
    const blogCountSql = fs.readFileSync(path.join(__dirname, 'migrations', 'add_blog_count_and_triggers.sql'), 'utf8');

    const { error: blogCountError } = await supabase.rpc('exec_sql', {
      sql: blogCountSql
    });

    if (blogCountError) {
      console.log('Error with blog count and triggers migration:', blogCountError);
    } else {
      console.log('Blog count and triggers added successfully!');
    }

    console.log('All migrations completed!');

    // Test if tables exist by querying them
    const tablesToTest = ['authors', 'affiliate_links', 'posts'];
    for (const table of tablesToTest) {
      try {
        const { data, error: testError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (testError && testError.code === 'PGRST116') {
          console.log(`Table '${table}' does not exist.`);
        } else {
          console.log(`Table '${table}' is accessible.`);
        }
      } catch (err) {
        console.log(`Error testing table '${table}':`, err.message);
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
