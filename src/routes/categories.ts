import express from 'express'
import fs from 'fs'
import path from 'path'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// Public list with ordering support
router.get('/', async (req, res) => {
  const sortBy = req.query.sortBy as string || 'name'
  const sortOrder = req.query.sortOrder as string || 'asc'
  const ascending = sortOrder === 'asc'
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order(sortBy, { ascending })
    
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Get single category
router.get('/:id', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Category not found' })
  res.json(data)
})

// Admin create
router.post('/', requireAdmin, async (req, res) => {
  const { name, icon } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  
  const insertPayload: Record<string, any> = { name }
  if (icon) insertPayload.icon = icon
  
  const { data, error } = await supabase
    .from('categories')
    .insert([insertPayload])
    .select()
    .maybeSingle()
    
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Admin update
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, icon } = req.body

  // If updating icon, get current category to delete old image
  if (icon !== undefined) {
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('icon')
      .eq('id', id)
      .maybeSingle()

    // Delete old image if it exists and is different from new icon
    if (existingCategory && existingCategory.icon) {
      const oldIconUrl = existingCategory.icon
      if (oldIconUrl && oldIconUrl !== icon && oldIconUrl.startsWith('/BlogSiteImages/Categories/')) {
        try {
          const relativePath = oldIconUrl.substring(1) // Remove leading /
          const fullPath = path.join(process.cwd(), '..', 'frontend', 'public', relativePath)
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
            console.log('Successfully deleted old category icon:', fullPath)
          }
        } catch (fileError) {
          console.error('Error deleting old category image:', fileError)
          // Don't fail the update if old image deletion fails
        }
      }
    }
  }

  const updatePayload: Record<string, any> = {}
  if (name) updatePayload.name = name
  if (icon !== undefined) updatePayload.icon = icon

  const { data, error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Admin delete
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  // Check if category is used by any posts
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id')
    .eq('category', id)
    .limit(1)

  if (postsError) return res.status(500).json({ error: postsError.message })
  if (posts && posts.length > 0) {
    return res.status(400).json({ error: 'Cannot delete category that is used by posts' })
  }

  // Get the category to check for icon
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('icon')
    .eq('id', id)
    .maybeSingle()

  if (categoryError) return res.status(500).json({ error: categoryError.message })

  // Delete associated image if it exists
  if (category && category.icon) {
    try {
      const iconUrl = category.icon
      if (iconUrl && iconUrl.startsWith('/BlogSiteImages/Categories/')) {
        const relativePath = iconUrl.substring(1) // Remove leading /
        const fullPath = path.join(process.cwd(), '..', 'frontend', 'public', relativePath)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      }
    } catch (fileError) {
      console.error('Error deleting category image:', fileError)
      // Don't fail the entire operation if image deletion fails
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ deleted: id })
})

export default router
