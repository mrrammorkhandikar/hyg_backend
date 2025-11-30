import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Predefined slug options for regular tags
const PREDEFINED_SLUGS = [
  'Oral Hygiene Shelf',
  'Mental Hygiene Shelf',
  'Holistic Health Hygiene Shelf',
  'Kids Hygiene Shelf',
  'Home Hygiene Shelf',
  'Food Hygiene Shelf',
]

// Validate tag type and associated fields
const validateTagData = (tag_type: string, name: string, slug?: string, image_url?: string) => {
  const errors: string[] = []
  
  if (!name) {
    errors.push('name is required')
  }
  
  if (!['regular', 'cloud', 'seo'].includes(tag_type)) {
    errors.push('tag_type must be one of: regular, cloud, seo')
  }
  
  if (tag_type === 'regular') {
    if (!slug) {
      errors.push('slug is required for regular tags')
    } else if (!PREDEFINED_SLUGS.includes(slug)) {
      errors.push(`slug must be one of: ${PREDEFINED_SLUGS.join(', ')}`)
    }
  } else if (tag_type === 'cloud' || tag_type === 'seo') {
    if (slug) {
      errors.push('slug must be null for cloud and seo tags')
    }
    if (image_url) {
      errors.push('image_url must be null for cloud and seo tags')
    }
  }
  
  return errors
}

// List tags with optional filtering by type
router.get('/', async (req, res) => {
  const { tag_type } = req.query
  
  let query = supabase.from('tags').select('*').order('name', { ascending: true })
  
  if (tag_type && ['regular', 'cloud', 'seo'].includes(tag_type as string)) {
    query = query.eq('tag_type', tag_type)
  }
  
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Get predefined slug options
router.get('/slug-options', async (_req, res) => {
  res.json({ slugs: PREDEFINED_SLUGS })
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from('tags').select('*').eq('id', id).maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Not found' })
  res.json(data)
})

// Create tag with type-specific validation
router.post('/', requireAdmin, async (req, res) => {
  const { name, slug, category_id, description, tag_type = 'regular', image_url } = req.body
  
  const validationErrors = validateTagData(tag_type, name, slug, image_url)
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join(', ') })
  }
  
  // Prepare insert data based on tag type
  const insertData: any = {
    name,
    tag_type,
    description
  }
  
  if (tag_type === 'regular') {
    insertData.slug = slug
    insertData.category_id = category_id
    insertData.image_url = image_url
  } else {
    // For cloud and seo tags, explicitly set slug and image_url to null
    insertData.slug = null
    insertData.category_id = null
    insertData.image_url = null
  }
  
  const { data, error } = await supabase.from('tags').insert([insertData]).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Update tag with type-specific validation
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, slug, category_id, description, tag_type, image_url } = req.body

  // Get existing tag to check current type and existing image
  const { data: existingTag, error: fetchError } = await supabase
    .from('tags')
    .select('tag_type, slug, image_url')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!existingTag) return res.status(404).json({ error: 'Tag not found' })

  const finalTagType = tag_type || existingTag.tag_type

  const validationErrors = validateTagData(finalTagType, name, slug, image_url)
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join(', ') })
  }

  // If updating image_url and it's different from existing, delete old image
  if (image_url !== undefined && existingTag.image_url && existingTag.image_url !== image_url && existingTag.slug) {
    try {
      const sanitizedSlug = existingTag.slug.replace(/[^a-zA-Z0-9]/g, '_')
      const tagImageDir = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Tags', sanitizedSlug)

      // Extract filename from old image_url and construct full file path
      const oldImageFileName = path.basename(existingTag.image_url)
      const oldImageFilePath = path.join(tagImageDir, oldImageFileName)

      // Check if the old image file exists and delete it
      if (fs.existsSync(oldImageFilePath)) {
        fs.unlinkSync(oldImageFilePath)
        console.log(`Deleted old tag image file: ${oldImageFilePath}`)
      }
    } catch (fileError) {
      console.error('Error deleting old tag image file:', fileError)
      // Don't fail the update if old image deletion fails
    }
  }

  // Prepare update data based on tag type
  const updateData: any = {
    name,
    tag_type: finalTagType,
    description
  }

  if (finalTagType === 'regular') {
    updateData.slug = slug
    updateData.category_id = category_id
    updateData.image_url = image_url
  } else {
    // For cloud and seo tags, explicitly set slug and image_url to null
    updateData.slug = null
    updateData.category_id = null
    updateData.image_url = null
  }

  const { data, error } = await supabase.from('tags').update(updateData).eq('id', id).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Delete tag
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  
  try {
    // First, get the tag data to retrieve image information
    const { data: tagData, error: fetchError } = await supabase
      .from('tags')
      .select('slug, image_url, tag_type')
      .eq('id', id)
      .maybeSingle()
    
    if (fetchError) {
      return res.status(500).json({ error: fetchError.message })
    }
    
    if (!tagData) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    
    // Delete the tag from database
    const { error: deleteError } = await supabase.from('tags').delete().eq('id', id)
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message })
    }
    
    // If it's a regular tag with a slug and image, delete the associated image file
    if (tagData.tag_type === 'regular' && tagData.slug && tagData.image_url) {
      try {
        const sanitizedSlug = tagData.slug.replace(/[^a-zA-Z0-9]/g, '_')
        const tagImageDir = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Tags', sanitizedSlug)
        
        // Extract filename from image_url and construct full file path
        const imageFileName = path.basename(tagData.image_url)
        const imageFilePath = path.join(tagImageDir, imageFileName)
        
        // Check if the specific image file exists and delete it
        if (fs.existsSync(imageFilePath)) {
          fs.unlinkSync(imageFilePath)
          console.log(`Deleted tag image file: ${imageFilePath}`)
        }
      } catch (fileError) {
        console.error('Error deleting tag image file:', fileError)
        // Don't fail the entire operation if file deletion fails
        // The tag is already deleted from the database
      }
    }
    
    res.json({ deleted: id })
  } catch (error) {
    console.error('Error deleting tag:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
})

// Tag images CRUD (metadata)
router.get('/:id/images', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from('tag_images').select('*').eq('tag_id', id).order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/:id/images', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { file_path, caption, is_primary } = req.body
  if (!file_path) return res.status(400).json({ error: 'file_path is required' })
  const { data, error } = await supabase.from('tag_images').insert([{ tag_id: id, file_path, caption, is_primary }]).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put('/:id/images/:imageId', requireAdmin, async (req, res) => {
  const { imageId } = req.params
  const { caption, is_primary } = req.body
  const { data, error } = await supabase.from('tag_images').update({ caption, is_primary }).eq('id', imageId).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id/images/:imageId', requireAdmin, async (req, res) => {
  const { imageId } = req.params
  const { error } = await supabase.from('tag_images').delete().eq('id', imageId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ deleted: imageId })
})

export default router
