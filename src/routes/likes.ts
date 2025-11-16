import express from 'express'
import { supabase } from '../db/supabaseClient'

const router = express.Router()

// POST /likes - Add a like to a post
router.post('/', async (req, res) => {
  console.log('POST /likes called with body:', req.body);
  try {
    const { post_id, unique_user_id } = req.body

    if (!post_id || !unique_user_id) {
      return res.status(400).json({ error: 'post_id and unique_user_id are required' })
    }

    // Check if user has an active like on this post (liked = true)
    const { data: activeLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('unique_user_id', unique_user_id)
      .eq('liked', true)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing like:', checkError)
      return res.status(500).json({ error: 'Failed to check existing like' })
    }

    // If user already has an active like, return error
    if (activeLike) {
      return res.status(400).json({ error: 'You have already liked this post' })
    }

    // If user previously unliked but now wants to like again,
    // check if there's an inactive like row to reactivate
    const { data: inactiveLike, error: inactiveCheckError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('unique_user_id', unique_user_id)
      .eq('liked', false)
      .maybeSingle()

    if (inactiveCheckError) {
      console.error('Error checking inactive like:', inactiveCheckError)
      return res.status(500).json({ error: 'Failed to check previous like' })
    }

    if (inactiveLike) {
      // Reactivate the previous unlike by setting liked = true
      const { error: reactivateError } = await supabase
        .from('post_likes')
        .update({ liked: true, updated_at: new Date().toISOString() })
        .eq('id', inactiveLike.id)

      if (reactivateError) {
        console.error('Error reactivating like:', reactivateError)
        return res.status(500).json({ error: 'Failed to reactivate like' })
      }

      console.log(`Like reactivated for user ${unique_user_id} on post ${post_id}, like ID: ${inactiveLike.id}`);

      res.json({
        success: true,
        post_id,
        unique_user_id,
        liked: true,
        reactivated: true
      })
      return
    }

    // Add like to post_likes table
    const { data: likeData, error: likeError } = await supabase
      .from('post_likes')
      .insert([{
        post_id,
        unique_user_id,
        liked: true
      }])
      .select()
      .single()

    if (likeError) {
      console.error('Error adding like:', likeError)
      return res.status(500).json({ error: 'Failed to add like' })
    }

    console.log(`Like recorded for user ${unique_user_id} on post ${post_id}`);

    res.json({
      success: true,
      post_id,
      unique_user_id,
      liked: true
    })
  } catch (err) {
    console.error('Like operation failed:', err)
    return res.status(500).json({ error: 'Like recording failed' })
  }
})

// PUT /likes/unlike/:postId/:uniqueUserId - Remove a like from a post
router.put('/unlike/:postId/:uniqueUserId', async (req, res) => {
  console.log('PUT /likes/unlike called with params:', req.params, 'body:', req.body);
  try {
    const { postId, uniqueUserId } = req.params

    // First check if the like exists
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('unique_user_id', uniqueUserId)
      .eq('liked', true)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing like for unlike:', checkError)
      return res.status(500).json({ error: 'Failed to check like' })
    }

    if (!existingLike) {
      return res.status(404).json({ error: 'Like not found' })
    }

    // Update the like status to false (don't delete, just mark as unliked)
    const { error: updateError } = await supabase
      .from('post_likes')
      .update({ liked: false, updated_at: new Date().toISOString() })
      .eq('id', existingLike.id)

    if (updateError) {
      console.error('Error updating unlike:', updateError)
      return res.status(500).json({ error: 'Failed to update unlike' })
    }

    console.log(`Unlike recorded for user ${uniqueUserId} on post ${postId}, like ID: ${existingLike.id}`);

    res.json({
      success: true,
      post_id: postId,
      unique_user_id: uniqueUserId,
      liked: false
    })
  } catch (err) {
    console.error('Unlike operation failed:', err)
    return res.status(500).json({ error: 'Unlike recording failed' })
  }
})

// GET /likes/count/:postId - Get like count for a post
router.get('/count/:postId', async (req, res) => {
  try {
    const { postId } = req.params

    // Count active (liked = true) likes for the post
    const { count, error } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('liked', true)

    if (error) {
      console.error('Error getting like count:', error)
      return res.json({ count: 0 })
    }

    res.json({ count: count || 0 })
  } catch (err) {
    console.error('Count operation failed:', err)
    res.json({ count: 0 })
  }
})

// GET /likes/check/:postId/:uniqueUserId - Check if user liked a post
router.get('/check/:postId/:uniqueUserId', async (req, res) => {
  try {
    const { postId, uniqueUserId } = req.params

    // Check specifically for active likes (liked = true)
    const { data, error } = await supabase
      .from('post_likes')
      .select('liked')
      .eq('post_id', postId)
      .eq('unique_user_id', uniqueUserId)
      .eq('liked', true)
      .maybeSingle()

    console.log(`Check like for user ${uniqueUserId} on post ${postId}:`, data ? 'HAS ACTIVE LIKE' : 'NO ACTIVE LIKE');

    if (error) {
      console.error('Error checking like status:', error)
      return res.json({ liked: false })
    }

    res.json({ liked: !!data?.liked })
  } catch (err) {
    console.error('Check like operation failed:', err)
    res.json({ liked: false })
  }
})

export default router
