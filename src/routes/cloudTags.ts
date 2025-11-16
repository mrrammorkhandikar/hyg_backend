import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// List cloud tags with search and pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 50
  const search = req.query.search as string
  const sortBy = req.query.sortBy as string || 'name'
  const sortOrder = req.query.sortOrder as string || 'asc'
  
  const offset = (page - 1) * limit
  const ascending = sortOrder === 'asc'
  
  let query = supabase
    .from('cloud_tags')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending })
    .range(offset, offset + limit - 1)
  
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  
  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  
  res.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
})

// Create cloud tag
router.post('/', requireAdmin, async (req, res) => {
  const { name, slug, description, color } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  
  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  const { data, error } = await supabase
    .from('cloud_tags')
    .insert([{ name, slug: finalSlug, description, color }])
    .select()
    .maybeSingle()
    
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Update cloud tag
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, slug, description, color } = req.body
  
  const { data, error } = await supabase
    .from('cloud_tags')
    .update({ name, slug, description, color })
    .eq('id', id)
    .select()
    .maybeSingle()
    
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Delete cloud tag
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('cloud_tags').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ deleted: id })
})

// Bulk operations
router.post('/bulk/import', requireAdmin, async (req, res) => {
  const { tags } = req.body // Array of tag names or objects
  
  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: 'tags must be an array' })
  }
  
  try {
    const tagInserts = tags.map(tag => {
      if (typeof tag === 'string') {
        return {
          name: tag,
          slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      }
      return {
        name: tag.name,
        slug: tag.slug || tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: tag.description,
        color: tag.color
      }
    })
    
    const { data, error } = await supabase
      .from('cloud_tags')
      .insert(tagInserts)
      .select()
      
    if (error) return res.status(500).json({ error: error.message })
    res.json({ imported: data.length, data })
  } catch (error) {
    res.status(500).json({ error: 'Failed to import tags' })
  }
})

router.get('/export', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('cloud_tags')
    .select('*')
    .order('name', { ascending: true })
    
  if (error) return res.status(500).json({ error: error.message })
  
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename=cloud-tags-export.json')
  res.json(data)
})

export default router