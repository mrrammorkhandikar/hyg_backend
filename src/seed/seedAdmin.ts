import { supabase } from '../db/supabaseClient';

async function seed() {
  const { error } = await supabase.from('blogs').insert([
    {
      id: 'sample-blog',
      title: 'Sample Blog',
      content: 'Hello world',
      excerpt: 'Hello world excerpt',
      category: 'Dental Care',
      date: new Date().toISOString(),
      seo: { title: 'Sample SEO', description: 'SEO description' },
    },
  ]);

  if (error) console.error(error);
  else console.log('Seeded successfully!');
}

seed();
