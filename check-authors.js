const { supabase } = require('./src/db/supabaseClient');

async function checkAuthors() {
  console.log('Checking authors table...');

  // Get all authors
  const { data: allAuthors, error: allError } = await supabase
    .from('authors')
    .select('*');

  if (allError) {
    console.error('Error fetching all authors:', allError);
    return;
  }

  console.log('All authors:');
  console.log(JSON.stringify(allAuthors, null, 2));

  // Get published authors specifically
  const { data: publishedAuthors, error: publishedError } = await supabase
    .from('authors')
    .select('*')
    .eq('status', 'publish');

  if (publishedError) {
    console.error('Error fetching published authors:', publishedError);
    return;
  }

  console.log('Published authors:');
  console.log(JSON.stringify(publishedAuthors, null, 2));
}

checkAuthors().catch(console.error);
