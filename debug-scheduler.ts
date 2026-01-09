import { supabase } from './src/db/supabaseClient';

async function debugScheduler() {
  console.log('🔍 Debugging Scheduler Issues...');

  try {
    const now = new Date();
    console.log(`Current time: ${now.toISOString()} (${now.toLocaleString()})`);

    // Get all posts with scheduling
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, shedule_publish, published, created_at')
      .not('shedule_publish', 'is', null)
      .order('shedule_publish', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    console.log(`\nFound ${posts?.length || 0} scheduled posts:`);

    posts?.forEach((post, index) => {
      const scheduledTime = new Date(post.shedule_publish);
      const isPast = scheduledTime <= now;
      const shouldBePublished = !post.published && isPast;

      console.log(`${index + 1}. "${post.title}"`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Scheduled: ${post.shedule_publish}`);
      console.log(`   Scheduled UTC: ${scheduledTime.toISOString()}`);
      console.log(`   Scheduled Local: ${scheduledTime.toLocaleString()}`);
      console.log(`   Current UTC: ${now.toISOString()}`);
      console.log(`   Current Local: ${now.toLocaleString()}`);
      console.log(`   Published: ${post.published}`);
      console.log(`   Is past due: ${isPast}`);
      console.log(`   Should be published: ${shouldBePublished}`);
      console.log(`   Created: ${post.created_at}`);
      console.log('');
    });

    // Test the exact query used by the scheduler
    console.log('Testing scheduler query...');
    const { data: schedulerPosts, error: schedulerError } = await supabase
      .from('posts')
      .select('id, title, slug, shedule_publish')
      .eq('published', false)
      .not('shedule_publish', 'is', null)
      .lte('shedule_publish', now.toISOString());

    if (schedulerError) {
      console.error('Scheduler query error:', schedulerError);
    } else {
      console.log(`Scheduler would process ${schedulerPosts?.length || 0} posts:`);
      schedulerPosts?.forEach(post => {
        console.log(`  - ${post.title}: ${post.shedule_publish}`);
      });
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugScheduler();