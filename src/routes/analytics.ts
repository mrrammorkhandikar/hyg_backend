import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// GET /analytics/dashboard - Get dashboard analytics data
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Get total posts count
    const { count: totalPosts, error: postsError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    if (postsError) {
      console.error('Error fetching posts count:', postsError)
    }

    // Get published posts count
    const { count: publishedPosts, error: publishedError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)

    if (publishedError) {
      console.error('Error fetching published posts count:', publishedError)
    }

    // Get total likes count
    const { count: totalLikes, error: likesError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('liked', true)

    if (likesError) {
      console.error('Error fetching likes count:', likesError)
    }

    // Get total comments count
    const { count: totalComments, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    if (commentsError) {
      console.error('Error fetching comments count:', commentsError)
    }

    // Get subscriber stats
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('id, subscribed_at')

    let subscriberStats = { total: 0, recent: 0, growth: 0 }
    if (!subscribersError && subscribers) {
      const totalSubscribers = subscribers.length
      const recentSubscribers = subscribers.filter(sub => {
        const subDate = new Date(sub.subscribed_at)
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return subDate >= oneWeekAgo
      }).length

      subscriberStats = {
        total: totalSubscribers,
        recent: recentSubscribers,
        growth: totalSubscribers > 0 ? Math.round((recentSubscribers / totalSubscribers) * 100) : 0
      }
    }

    // Get products count
    const { count: totalProducts, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (productsError) {
      console.error('Error fetching products count:', productsError)
    }

    // Get top performing blogs (by likes + comments)
    const { data: postsWithEngagement, error: engagementError } = await supabase
      .from('posts')
      .select('id, title, published, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(50)

    const topBlogs = []
    if (!engagementError && postsWithEngagement) {
      for (const post of postsWithEngagement) {
        // Get likes count
        const { count: likesCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('liked', true)

        // Get comments count
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)

        const engagement = (likesCount || 0) + (commentsCount || 0)
        if (engagement > 0) {
          topBlogs.push({
            id: post.id,
            title: post.title,
            likes: likesCount || 0,
            comments: commentsCount || 0,
            engagement: engagement
          })
        }
      }

      // Sort by engagement and take top 10
      topBlogs.sort((a, b) => b.engagement - a.engagement)
    }

    // Get blog performance data for pie chart (by category)
    const { data: categoryData, error: categoryError } = await supabase
      .from('posts')
      .select('category_id, published')
      .eq('published', true)

    const categoryStats: { [key: string]: number } = {}
    if (!categoryError && categoryData) {
      categoryData.forEach(post => {
        const category = post.category_id || 'Uncategorized'
        if (!categoryStats[category]) {
          categoryStats[category] = 0
        }
        categoryStats[category]++
      })
    }

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { count: recentPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo)

    const { count: recentComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo)

    const { count: recentLikes } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('liked', true)
      .gte('created_at', thirtyDaysAgo)

    // For now, we'll simulate visit data since there's no tracking system
    // In a real implementation, you'd have a visits table
    const estimatedVisits = Math.floor((totalPosts || 0) * 25) // Rough estimate

    const analytics = {
      overview: {
        totalPosts: totalPosts || 0,
        publishedPosts: publishedPosts || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0,
        totalSubscribers: subscriberStats.total,
        totalProducts: totalProducts || 0,
        estimatedVisits: estimatedVisits
      },
      recentActivity: {
        posts: recentPosts || 0,
        comments: recentComments || 0,
        likes: recentLikes || 0,
        subscribers: subscriberStats.recent
      },
      subscriberGrowth: subscriberStats,
      topBlogs: topBlogs.slice(0, 10),
      blogPerformanceByCategory: categoryStats,
      growthMetrics: {
        postGrowth: recentPosts || 0,
        engagementGrowth: (recentLikes || 0) + (recentComments || 0)
      }
    }

    res.json(analytics)
  } catch (err) {
    console.error('Analytics dashboard error:', err)
    res.status(500).json({ error: 'Failed to fetch analytics data' })
  }
})

export default router
