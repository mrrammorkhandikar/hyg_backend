import express from 'express'
import { supabase } from '../db/supabaseClient'
import { z } from 'zod'
import crypto from 'crypto'

const router = express.Router()

// Validation schema for click tracking
const ClickTrackingSchema = z.object({
  post_id: z.string().uuid('Valid post ID is required'),
  affiliate_link_id: z.string().uuid('Valid affiliate link ID is required'),
  image_url: z.string().min(1, 'Image URL is required'),
  session_id: z.string().optional(),
  referrer: z.string().optional()
})

// Helper function to detect device type from user agent
function getDeviceType(userAgent: string): string {
  if (!userAgent) return 'unknown'
  
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

// Helper function to generate session ID if not provided
function generateSessionId(req: express.Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  const userAgent = req.get('user-agent') || 'unknown'
  const timestamp = Date.now()
  
  return crypto
    .createHash('sha256')
    .update(`${ip}-${userAgent}-${timestamp}`)
    .digest('hex')
    .substring(0, 16)
}

// POST /affiliate-tracking/click - Track affiliate link click and redirect
router.post('/click', async (req, res) => {
  try {
    const validatedData = ClickTrackingSchema.parse(req.body)
    const userAgent = req.get('user-agent') || ''
    const deviceType = getDeviceType(userAgent)
    const sessionId = validatedData.session_id || generateSessionId(req)
    const referrer = validatedData.referrer || req.get('referer') || ''
    
    // Get affiliate link details
    const { data: affiliateLink, error: linkError } = await supabase
      .from('affiliate_links')
      .select('id, url, name, is_active')
      .eq('id', validatedData.affiliate_link_id)
      .eq('is_active', true)
      .single()
    
    if (linkError || !affiliateLink) {
      return res.status(404).json({ error: 'Affiliate link not found or inactive' })
    }
    
    // Verify the image association exists
    const { data: association, error: assocError } = await supabase
      .from('image_affiliate_associations')
      .select('id')
      .eq('post_id', validatedData.post_id)
      .eq('affiliate_link_id', validatedData.affiliate_link_id)
      .eq('image_url', validatedData.image_url)
      .eq('is_active', true)
      .single()
    
    if (assocError || !association) {
      return res.status(404).json({ error: 'Image association not found or inactive' })
    }
    
    // Record the click
    const clickData = {
      post_id: validatedData.post_id,
      affiliate_provider: affiliateLink.name, // For backward compatibility
      affiliate_link_id: validatedData.affiliate_link_id,
      image_url: validatedData.image_url,
      session_id: sessionId,
      referrer: referrer,
      device_type: deviceType,
      meta: {
        ip: req.ip || req.connection.remoteAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      }
    }
    
    const { error: clickError } = await supabase
      .from('affiliate_clicks')
      .insert([clickData])
    
    if (clickError) {
      console.error('Error recording click:', clickError)
      // Don't fail the redirect if click recording fails
    }
    
    // Return redirect URL for client-side redirect
    res.json({
      success: true,
      redirect_url: affiliateLink.url,
      affiliate_name: affiliateLink.name,
      session_id: sessionId
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    console.error('Error in POST /affiliate-tracking/click:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /affiliate-tracking/stats/:linkId - Get click statistics for an affiliate link
router.get('/stats/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params
    const startDate = req.query.start_date as string
    const endDate = req.query.end_date as string
    const groupBy = req.query.group_by as string || 'day' // day, week, month
    
    // Validate date parameters
    let parsedStartDate: Date | null = null
    let parsedEndDate: Date | null = null
    
    if (startDate) {
      parsedStartDate = new Date(startDate)
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({ error: 'Invalid start_date format' })
      }
    }
    
    if (endDate) {
      parsedEndDate = new Date(endDate)
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'Invalid end_date format' })
      }
    }
    
    // Get overall statistics using the database function
    const { data: overallStats, error: statsError } = await supabase
      .rpc('get_affiliate_link_stats', {
        link_id: linkId,
        start_date: parsedStartDate?.toISOString().split('T')[0] || null,
        end_date: parsedEndDate?.toISOString().split('T')[0] || null
      })
    
    if (statsError) {
      console.error('Error fetching overall stats:', statsError)
      return res.status(500).json({ error: 'Failed to fetch statistics' })
    }
    
    // Get time-series data based on groupBy parameter
    let timeSeriesQuery = supabase
      .from('click_analytics_summary')
      .select('date, total_clicks, unique_sessions, mobile_clicks, desktop_clicks')
      .eq('affiliate_link_id', linkId)
      .order('date', { ascending: true })
    
    if (parsedStartDate) {
      timeSeriesQuery = timeSeriesQuery.gte('date', parsedStartDate.toISOString().split('T')[0])
    }
    
    if (parsedEndDate) {
      timeSeriesQuery = timeSeriesQuery.lte('date', parsedEndDate.toISOString().split('T')[0])
    }
    
    const { data: timeSeriesData, error: timeSeriesError } = await timeSeriesQuery
    
    if (timeSeriesError) {
      console.error('Error fetching time series data:', timeSeriesError)
      return res.status(500).json({ error: 'Failed to fetch time series data' })
    }
    
    // Group time series data if needed
    let groupedData = timeSeriesData || []
    
    if (groupBy === 'week' || groupBy === 'month') {
      const grouped: { [key: string]: any } = {}
      
      groupedData.forEach(item => {
        const date = new Date(item.date)
        let key: string
        
        if (groupBy === 'week') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
        } else { // month
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        }
        
        if (!grouped[key]) {
          grouped[key] = {
            date: key,
            total_clicks: 0,
            unique_sessions: 0,
            mobile_clicks: 0,
            desktop_clicks: 0
          }
        }
        
        grouped[key].total_clicks += item.total_clicks || 0
        grouped[key].unique_sessions += item.unique_sessions || 0
        grouped[key].mobile_clicks += item.mobile_clicks || 0
        grouped[key].desktop_clicks += item.desktop_clicks || 0
      })
      
      groupedData = Object.values(grouped).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    }
    
    // Get top performing posts for this affiliate link
    const { data: topPosts, error: postsError } = await supabase
      .from('click_analytics_summary')
      .select(`
        post_id,
        total_clicks,
        posts:post_id (title, slug)
      `)
      .eq('affiliate_link_id', linkId)
      .not('post_id', 'is', null)
      .order('total_clicks', { ascending: false })
      .limit(10)
    
    if (postsError) {
      console.error('Error fetching top posts:', postsError)
    }
    
    res.json({
      overall: overallStats?.[0] || {
        total_clicks: 0,
        unique_sessions: 0,
        mobile_clicks: 0,
        desktop_clicks: 0,
        avg_daily_clicks: 0
      },
      time_series: groupedData,
      top_posts: topPosts || [],
      period: {
        start_date: parsedStartDate?.toISOString().split('T')[0] || null,
        end_date: parsedEndDate?.toISOString().split('T')[0] || null,
        group_by: groupBy
      }
    })
  } catch (err) {
    console.error('Error in GET /affiliate-tracking/stats/:linkId:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /affiliate-tracking/dashboard - Get dashboard statistics for all affiliate links
router.get('/dashboard', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get overall statistics for all active affiliate links
    const { data: allLinks, error: linksError } = await supabase
      .from('affiliate_links')
      .select(`
        id,
        name,
        provider,
        url,
        created_at
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (linksError) {
      console.error('Error fetching affiliate links:', linksError)
      return res.status(500).json({ error: 'Failed to fetch affiliate links' })
    }
    
    // Get statistics for each link
    const linkStats = await Promise.all(
      (allLinks || []).map(async (link) => {
        const { data: stats } = await supabase
          .rpc('get_affiliate_link_stats', {
            link_id: link.id,
            start_date: startDate.toISOString().split('T')[0],
            end_date: null
          })
        
        return {
          ...link,
          statistics: stats?.[0] || {
            total_clicks: 0,
            unique_sessions: 0,
            mobile_clicks: 0,
            desktop_clicks: 0,
            avg_daily_clicks: 0
          }
        }
      })
    )
    
    // Get total statistics across all links
    const totalStats = linkStats.reduce((acc, link) => {
      const stats = link.statistics
      return {
        total_clicks: acc.total_clicks + (stats.total_clicks || 0),
        unique_sessions: acc.unique_sessions + (stats.unique_sessions || 0),
        mobile_clicks: acc.mobile_clicks + (stats.mobile_clicks || 0),
        desktop_clicks: acc.desktop_clicks + (stats.desktop_clicks || 0),
        total_links: acc.total_links + 1
      }
    }, {
      total_clicks: 0,
      unique_sessions: 0,
      mobile_clicks: 0,
      desktop_clicks: 0,
      total_links: 0
    })
    
    // Get recent clicks for activity feed
    const { data: recentClicks, error: clicksError } = await supabase
      .from('affiliate_clicks')
      .select(`
        clicked_at,
        device_type,
        affiliate_links:affiliate_link_id (name, provider),
        posts:post_id (title, slug)
      `)
      .not('affiliate_link_id', 'is', null)
      .order('clicked_at', { ascending: false })
      .limit(20)
    
    if (clicksError) {
      console.error('Error fetching recent clicks:', clicksError)
    }
    
    res.json({
      summary: {
        ...totalStats,
        avg_clicks_per_link: totalStats.total_links > 0 
          ? Math.round(totalStats.total_clicks / totalStats.total_links * 100) / 100 
          : 0,
        period_days: days
      },
      links: linkStats.sort((a, b) => 
        (b.statistics.total_clicks || 0) - (a.statistics.total_clicks || 0)
      ),
      recent_activity: recentClicks || []
    })
  } catch (err) {
    console.error('Error in GET /affiliate-tracking/dashboard:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /affiliate-tracking/export/:linkId - Export click data as CSV
router.get('/export/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params
    const startDate = req.query.start_date as string
    const endDate = req.query.end_date as string
    const format = req.query.format as string || 'csv'
    
    if (format !== 'csv' && format !== 'json') {
      return res.status(400).json({ error: 'Supported formats: csv, json' })
    }
    
    // Build query for detailed click data
    let query = supabase
      .from('affiliate_clicks')
      .select(`
        clicked_at,
        device_type,
        session_id,
        referrer,
        image_url,
        posts:post_id (title, slug),
        affiliate_links:affiliate_link_id (name, provider, url)
      `)
      .eq('affiliate_link_id', linkId)
      .order('clicked_at', { ascending: false })
    
    if (startDate) {
      const parsedStartDate = new Date(startDate)
      if (!isNaN(parsedStartDate.getTime())) {
        query = query.gte('clicked_at', parsedStartDate.toISOString())
      }
    }
    
    if (endDate) {
      const parsedEndDate = new Date(endDate)
      if (!isNaN(parsedEndDate.getTime())) {
        query = query.lte('clicked_at', parsedEndDate.toISOString())
      }
    }
    
    const { data: clicks, error } = await query
    
    if (error) {
      console.error('Error fetching click data for export:', error)
      return res.status(500).json({ error: 'Failed to fetch click data' })
    }
    
    if (!clicks || clicks.length === 0) {
      return res.status(404).json({ error: 'No click data found for the specified period' })
    }
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="affiliate-clicks-${linkId}.json"`)
      return res.json(clicks)
    }
    
    // Generate CSV
    const csvHeaders = [
      'Date',
      'Time',
      'Affiliate Link',
      'Provider',
      'Post Title',
      'Post Slug',
      'Image URL',
      'Device Type',
      'Session ID',
      'Referrer'
    ]
    
    const csvRows = clicks.map(click => [
      new Date(click.clicked_at).toLocaleDateString(),
      new Date(click.clicked_at).toLocaleTimeString(),
      click.affiliate_links?.[0]?.name || 'Unknown',
      click.affiliate_links?.[0]?.provider || 'Unknown',
      click.posts?.[0]?.title || 'Unknown',
      click.posts?.[0]?.slug || 'Unknown',
      click.image_url || '',
      click.device_type || 'Unknown',
      click.session_id || '',
      click.referrer || ''
    ])
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n')
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="affiliate-clicks-${linkId}.csv"`)
    res.send(csvContent)
  } catch (err) {
    console.error('Error in GET /affiliate-tracking/export/:linkId:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router