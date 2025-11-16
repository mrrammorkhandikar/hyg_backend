import express from 'express'
import multer from 'multer'
import { supabase } from '../db/supabaseClient'
import { requireAuthenticated, requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// Configure multer to store files in memory (required for Supabase upload)
const blogUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

const categoryIconUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for icons
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

const tagImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for tag images
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// POST /api/image-upload - Upload images for blog posts
router.post('/', requireAuthenticated, blogUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' })
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    const filename = `blog/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage under blogs folder
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return res.status(500).json({ error: 'Failed to upload image to storage' })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Images')
      .getPublicUrl(filename)

    res.json({
      success: true,
      url: publicUrl,
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      blogFolder: filename.split('/')[0]
    })
  } catch (error) {
    console.error('Image upload error:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

// POST /api/image-upload/title - Upload title images
router.post('/title', requireAuthenticated, blogUpload.single('titleImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No title image file uploaded' })
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    const filename = `blog/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage under blogs folder
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return res.status(500).json({ error: 'Failed to upload title image to storage' })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Images')
      .getPublicUrl(filename)

    res.json({
      success: true,
      url: publicUrl,
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      blogFolder: filename.split('/')[0]
    })
  } catch (error) {
    console.error('Title image upload error:', error)
    res.status(500).json({ error: 'Failed to upload title image' })
  }
})

// POST /api/image-upload/category-icon - Upload category icons
router.post('/category-icon', requireAdmin, categoryIconUpload.single('icon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No icon file uploaded' })
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    const filename = `category_icons/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage under category_icons folder
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return res.status(500).json({ error: 'Failed to upload category icon to storage' })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Images')
      .getPublicUrl(filename)

    res.json({
      success: true,
      url: publicUrl,
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size
    })
  } catch (error) {
    console.error('Category icon upload error:', error)
    res.status(500).json({ error: 'Failed to upload category icon' })
  }
})

// POST /api/image-upload/tag-image - Upload tag images
router.post('/tag-image', requireAdmin, tagImageUpload.single('tagImage'), async (req, res) => {
  try {
    // Debug logging
    console.log('=== TAG IMAGE UPLOAD DEBUG ===')
    console.log('req.body:', req.body)
    console.log('req.file:', req.file ? { filename: req.file.filename, originalname: req.file.originalname } : 'No file')
    console.log('tagSlug from body:', req.body.tagSlug)
    console.log('================================')

    if (!req.file) {
      return res.status(400).json({ error: 'No tag image file uploaded' })
    }

    const tagSlug = req.body.tagSlug || 'default'
    const sanitizedSlug = tagSlug.replace(/[^a-zA-Z0-9]/g, '_')

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    const filename = `tags/${sanitizedSlug}/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage under tags/tagSlug folder
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return res.status(500).json({ error: 'Failed to upload tag image to storage' })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Images')
      .getPublicUrl(filename)

    res.json({
      success: true,
      url: publicUrl,
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      tagSlug: sanitizedSlug
    })
  } catch (error) {
    console.error('Tag image upload error:', error)
    res.status(500).json({ error: 'Failed to upload tag image' })
  }
})

export default router
