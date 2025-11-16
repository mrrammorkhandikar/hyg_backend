const bcrypt = require('bcrypt');
const { supabase } = require('./src/db/supabaseClient');

async function createTestAuthor() {
  console.log('Creating test author...');

  // Hash the password
  const hashedPassword = await bcrypt.hash('password', 10);

  const { data, error } = await supabase
    .from('authors')
    .insert([{
      username: 'testauthor',
      password: hashedPassword,
      blog_name: 'Test Author',
      status: 'publish',
      email: 'test@example.com'
    }])
    .select();

  if (error) {
    console.error('Error creating author:', error);
  } else {
    console.log('Test author created successfully:', data);
  }
}

createTestAuthor().catch(console.error);
