import { BlogSchedulerService } from './src/services/blogSchedulerService';
import { supabase } from './src/db/supabaseClient';

async function testBlogScheduler() {
  console.log('🧪 Testing Blog Scheduler Service...');

  try {
    // First, check for any existing scheduled posts
    console.log('\n1. Checking for existing scheduled posts...');
    const { data: scheduledPosts, error } = await supabase
      .from('posts')
      .select('id, title, shedule_publish, published')
      .not('shedule_publish', 'is', null);

    if (error) {
      console.error('❌ Error fetching scheduled posts:', error);
      return;
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts with scheduling data:`);
    scheduledPosts?.forEach(post => {
      console.log(`  - ${post.title}: scheduled=${post.shedule_publish}, published=${post.published}`);
    });

    // Test the scheduler
    console.log('\n2. Running BlogSchedulerService.processScheduledPosts()...');
    await BlogSchedulerService.processScheduledPosts();

    // Check upcoming scheduled posts
    console.log('\n3. Checking upcoming scheduled posts...');
    const upcoming = await BlogSchedulerService.getUpcomingScheduledPosts(5);
    console.log(`Found ${upcoming.length} upcoming scheduled posts:`);
    upcoming.forEach(post => {
      console.log(`  - ${post.title}: ${post.shedule_publish}`);
    });

    console.log('\n✅ Blog scheduler test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBlogScheduler();