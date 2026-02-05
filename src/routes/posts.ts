import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin, requireAuthenticated } from '../middleware/requireAdmin'
import { requirePostAccess, restrictAuthorActions } from '../middleware/requirePostAccess'
import { slugify } from '../utils/slugify'
import { suggestSeo } from '../utils/seo'
import { cacheGet, cacheSet } from '../db/redisClient'
import { z } from 'zod'
// @ts-ignore – no declaration file for JS module


const router = express.Router()

const PostCreateSchema = z.object({
  title: z.string().min(1)
}).strict()

// GET /posts with pagination, filtering, and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = req.query.search as string
    const category = req.query.category as string
    const published = req.query.published as string
    const sortBy = req.query.sortBy as string || 'date'
    const sortOrder = req.query.sortOrder as string || 'desc'

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('posts')
      .select(`*`, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (published !== undefined) {
      if (published === 'scheduled') {
        // Filter for scheduled posts: unpublished posts with future shedule_publish date
        query = query
          .eq('published', false)
          .not('shedule_publish', 'is', null)
          .gt('shedule_publish', new Date().toISOString())
      } else {
        query = query.eq('published', published === 'true')
      }
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    if (sortBy === 'title') {
      query = query.order('title', { ascending })
    } else if (sortBy === 'published') {
      query = query.order('published', { ascending })
    } else if (sortBy === 'updated_at') {
      query = query.order('updated_at', { ascending })
    } else if (sortBy === 'scheduled') {
      query = query.order('shedule_publish', { ascending })
    } else {
      query = query.order('date', { ascending })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) return res.status(500).json({ error: error.message })

    return res.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /posts/:id (by id)
router.get('/:id', async (req, res) => {
  const { id } = req.params
  
  // First get the post
  let { data: postData, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  
  if (postError) return res.status(500).json({ error: postError.message })
  if (!postData) return res.status(404).json({ error: 'Not found' })
  
  // If the post has tags as an array of IDs, fetch the actual tag names
  if (postData.tags && Array.isArray(postData.tags) && postData.tags.length > 0) {
    try {
      // Check if any of the tags are UUIDs (meaning they need to be resolved to names)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const hasUUIDs = postData.tags.some((tag: any) => typeof tag === 'string' && uuidRegex.test(tag));
      
      if (hasUUIDs) {
        // If some tags are UUIDs, fetch the actual tag names
        const uuidTags = postData.tags.filter((tag: any) => typeof tag === 'string' && uuidRegex.test(tag));
        
        const { data: tagData, error: tagError } = await supabase
          .from('tags')
          .select('id, name')
          .in('id', uuidTags);
        
        if (!tagError && tagData) {
          // Create a map of UUID to tag name for easy lookup
          const tagMap: { [key: string]: string } = {};
          tagData.forEach(tag => {
            tagMap[tag.id] = tag.name;
          });
          
          // Replace UUIDs with tag names, keep non-UUIDs as they are
          postData.tags = postData.tags.map((tag: any) => {
            if (typeof tag === 'string' && uuidRegex.test(tag) && tagMap[tag]) {
              return tagMap[tag];
            }
            return tag;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching tag names:', error);
      // Continue with original tags if there's an error
    }
  }
  
  res.json(postData)
})

// GET /posts/slug/:slug (by slug)
router.get('/slug/:slug', async (req, res) => {
  const { slug } = req.params
  
  // First get the post
  let { data: postData, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  
  if (postError) return res.status(500).json({ error: postError.message })
  if (!postData) return res.status(404).json({ error: 'Not found' })
  
  // If the post has tags as an array of IDs, fetch the actual tag names
  if (postData.tags && Array.isArray(postData.tags) && postData.tags.length > 0) {
    try {
      // Check if any of the tags are UUIDs (meaning they need to be resolved to names)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const hasUUIDs = postData.tags.some((tag: any) => typeof tag === 'string' && uuidRegex.test(tag));
      
      if (hasUUIDs) {
        // If some tags are UUIDs, fetch the actual tag names
        const uuidTags = postData.tags.filter((tag: any) => typeof tag === 'string' && uuidRegex.test(tag));
        
        const { data: tagData, error: tagError } = await supabase
          .from('tags')
          .select('id, name')
          .in('id', uuidTags);
        
        if (!tagError && tagData) {
          // Create a map of UUID to tag name for easy lookup
          const tagMap: { [key: string]: string } = {};
          tagData.forEach(tag => {
            tagMap[tag.id] = tag.name;
          });
          
          // Replace UUIDs with tag names, keep non-UUIDs as they are
          postData.tags = postData.tags.map((tag: any) => {
            if (typeof tag === 'string' && uuidRegex.test(tag) && tagMap[tag]) {
              return tagMap[tag];
            }
            return tag;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching tag names:', error);
      // Continue with original tags if there's an error
    }
  }
  
  res.json(postData)
})

// POST /posts (create)
router.post('/', requireAuthenticated, restrictAuthorActions, async (req, res) => {
  // Check if title exists
  if (!req.body.title || typeof req.body.title !== 'string' || req.body.title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' })
  }

  const user = (req as any).user
  const payload = req.body

  // For authors, force their author name
  if (user.role === 'author') {
    payload.author = user.authorName
  }

  const slug = payload.title ? slugify(payload.title) : `post-${Date.now()}`
  const seo = payload.seo_title ? {
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
    seo_keywords: payload.seo_keywords
  } : suggestSeo(payload.title, payload.excerpt)

  // Allow scheduling fields for admins during creation
  const allowedInsertKeys = [
    'title','excerpt','content','content_blocks','category','category_id','tags',
    'image_url','seo_title','seo_description','seo_keywords','affiliate_links',
    'published','featured','author','shedule_publish'
  ]

  const safePayload: Record<string, any> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (allowedInsertKeys.includes(k)) safePayload[k] = v
  }

  const insert = {
    ...safePayload,
    slug,
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    seo_keywords: seo.seo_keywords,
    updated_at: new Date().toISOString(),
    date: new Date().toISOString()
  }

  const { data, error } = await supabase.from('posts').insert([insert]).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })

  // Tags are already saved in the posts table as TEXT[] array

  await cacheSet('posts:list', null, 1)
  res.json(data)
})

// PUT /posts/:id (update)
router.put('/:id', requirePostAccess, restrictAuthorActions, async (req, res) => {
  const { id } = req.params
  const updates = req.body
  updates.updated_at = new Date().toISOString()

  const allowedKeys = [
    'title','excerpt','content','content_blocks','category','category_id','tags',
    'image_url','seo_title','seo_description','seo_keywords','affiliate_links',
    'published','featured','author','updated_at','shedule_publish'
  ]
  const safeUpdates: Record<string, any> = {}
  for (const [k, v] of Object.entries(updates)) {
    if (allowedKeys.includes(k)) safeUpdates[k] = v
  }

  // Tags are stored directly in the posts table as TEXT[] array
  let { data, error } = await supabase.from('posts').update(safeUpdates).eq('id', id).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })

  await cacheSet('posts:list', null, 1)
  return res.json(data)
})

// DELETE /posts/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  await cacheSet('posts:list', null, 1)
  res.json({ ok: true })
})

export default router
