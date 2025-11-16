const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migrates cloud_tags to tags column for a specific post in an atomic transaction
 * @param {string} postId - The ID of the post to migrate
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
async function migrateCloudTagsForPost(postId) {
  const startTime = Date.now();
  console.log(`[MIGRATION] Starting cloud_tags migration for post ID: ${postId}`);
  
  try {
    // Step 1: Fetch the current post data
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, tags, cloud_tags')
      .eq('id', postId)
      .single();
    
    if (fetchError) {
      const errorMsg = `Failed to fetch post ${postId}: ${fetchError.message}`;
      console.error(`[MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    if (!post) {
      const errorMsg = `Post with ID ${postId} not found`;
      console.error(`[MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    console.log(`[MIGRATION] Found post: "${post.title}"`);
    console.log(`[MIGRATION] Current tags: ${JSON.stringify(post.tags)}`);
    console.log(`[MIGRATION] Cloud tags to migrate: ${JSON.stringify(post.cloud_tags)}`);
    
    // Step 2: Validate and process tags
    const currentTags = Array.isArray(post.tags) ? post.tags : [];
    const cloudTags = Array.isArray(post.cloud_tags) ? post.cloud_tags : [];
    
    if (cloudTags.length === 0) {
      const message = `No cloud_tags to migrate for post ${postId}`;
      console.log(`[MIGRATION] ${message}`);
      return { success: true, message, data: { postId, tagsCount: currentTags.length, migratedCount: 0 } };
    }
    
    // Step 3: Merge tags and remove duplicates
    const mergedTags = [...new Set([...currentTags, ...cloudTags])];
    const newTagsCount = mergedTags.length - currentTags.length;
    
    console.log(`[MIGRATION] Merging ${cloudTags.length} cloud tags with ${currentTags.length} existing tags`);
    console.log(`[MIGRATION] Result: ${mergedTags.length} total tags (${newTagsCount} new)`);
    
    // Step 4: Perform atomic update
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        tags: mergedTags,
        cloud_tags: [] // Clear cloud_tags
      })
      .eq('id', postId)
      .select('id, title, tags, cloud_tags');
    
    if (updateError) {
      const errorMsg = `Failed to update post ${postId}: ${updateError.message}`;
      console.error(`[MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    // Step 5: Verify the update was successful
    if (!updatedPost || updatedPost.length === 0) {
      const errorMsg = `Update verification failed for post ${postId}`;
      console.error(`[MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    const finalPost = updatedPost[0];
    const finalTags = Array.isArray(finalPost.tags) ? finalPost.tags : [];
    const finalCloudTags = Array.isArray(finalPost.cloud_tags) ? finalPost.cloud_tags : [];
    
    // Verify cloud_tags was cleared
    if (finalCloudTags.length > 0) {
      const errorMsg = `Cloud tags were not properly cleared for post ${postId}`;
      console.error(`[MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    // Verify tags were merged correctly
    if (finalTags.length !== mergedTags.length) {
      const errorMsg = `Tag count mismatch for post ${postId}. Expected: ${mergedTags.length}, Got: ${finalTags.length}`;
      console.error(`[MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    const duration = Date.now() - startTime;
    const successMsg = `Successfully migrated ${cloudTags.length} cloud tags for post ${postId} in ${duration}ms`;
    console.log(`[MIGRATION SUCCESS] ${successMsg}`);
    
    return {
      success: true,
      message: successMsg,
      data: {
        postId,
        title: finalPost.title,
        originalTagsCount: currentTags.length,
        cloudTagsCount: cloudTags.length,
        finalTagsCount: finalTags.length,
        newTagsAdded: newTagsCount,
        duration
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = `Migration failed for post ${postId} after ${duration}ms: ${error.message}`;
    console.error(`[MIGRATION ERROR] ${errorMsg}`);
    console.error(`[MIGRATION ERROR] Stack trace:`, error.stack);
    
    return { success: false, message: errorMsg };
  }
}

/**
 * Migrates cloud_tags to tags column for all posts that have cloud_tags
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
async function migrateAllCloudTags() {
  const startTime = Date.now();
  console.log(`[BULK MIGRATION] Starting bulk cloud_tags migration`);
  
  try {
    // Step 1: Find all posts with cloud_tags
    const { data: postsWithCloudTags, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, tags, cloud_tags')
      .not('cloud_tags', 'is', null)
      .neq('cloud_tags', '[]');
    
    if (fetchError) {
      const errorMsg = `Failed to fetch posts with cloud_tags: ${fetchError.message}`;
      console.error(`[BULK MIGRATION ERROR] ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
    
    if (!postsWithCloudTags || postsWithCloudTags.length === 0) {
      const message = `No posts found with cloud_tags to migrate`;
      console.log(`[BULK MIGRATION] ${message}`);
      return { success: true, message, data: { totalPosts: 0, migratedPosts: 0, failedPosts: 0 } };
    }
    
    console.log(`[BULK MIGRATION] Found ${postsWithCloudTags.length} posts with cloud_tags`);
    
    // Step 2: Migrate each post
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const post of postsWithCloudTags) {
      console.log(`[BULK MIGRATION] Processing post ${post.id}: "${post.title}"`);
      
      const result = await migrateCloudTagsForPost(post.id);
      results.push({
        postId: post.id,
        title: post.title,
        ...result
      });
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const duration = Date.now() - startTime;
    const message = `Bulk migration completed in ${duration}ms. Success: ${successCount}, Failed: ${failureCount}`;
    
    if (failureCount > 0) {
      console.warn(`[BULK MIGRATION WARNING] ${message}`);
    } else {
      console.log(`[BULK MIGRATION SUCCESS] ${message}`);
    }
    
    return {
      success: failureCount === 0,
      message,
      data: {
        totalPosts: postsWithCloudTags.length,
        migratedPosts: successCount,
        failedPosts: failureCount,
        duration,
        results
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = `Bulk migration failed after ${duration}ms: ${error.message}`;
    console.error(`[BULK MIGRATION ERROR] ${errorMsg}`);
    console.error(`[BULK MIGRATION ERROR] Stack trace:`, error.stack);
    
    return { success: false, message: errorMsg };
  }
}

module.exports = {
  migrateCloudTagsForPost,
  migrateAllCloudTags
};