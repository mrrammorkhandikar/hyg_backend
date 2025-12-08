// backend/src/routes/imageUpload.ts
import express from 'express'
import multer from 'multer'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { requireAuthenticated, requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// Supabase admin client (service role) - server only
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Use memory storage to avoid writing to the server file system
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB default limit
})

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-]/g, '_')
}

/**
 * Helper: upload buffer to Supabase storage bucket
 * returns publicUrl string
 */
async function uploadBufferToBucket(bucketName: string, objectPath: string, buffer: Buffer, contentType?: string) {
  const { error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(objectPath, buffer, {
      contentType: contentType || undefined,
      upsert: false,
      cacheControl: '3600'
    })

  if (error) {
    throw error
  }

  const { data: urlData } = await supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(objectPath)

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to get public URL from Supabase storage')
  }

  return urlData.publicUrl
}

/**
 * POST /api/image-upload
 * Accepts form field 'image' (file) and optional 'blogTitle' in body (to create folder).
 * Uploads to bucket 'blog-images' under <blogTitle>/Images/<filename>
 */
router.post('/', requireAuthenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image file uploaded' })
    }

    const blogTitle = (req.body.blogTitle || 'default').toString()
    const sanitizedTitle = sanitizeName(blogTitle)
    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `${sanitizedTitle}/Images/${filename}`

    const publicUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        blogFolder: sanitizedTitle
      }
    })
  } catch (error: any) {
    console.error('Image upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload image' })
  }
})

/**
 * POST /api/image-upload/title
 * Accepts form field 'titleImage' (file) and blogTitle.
 * Uploads to 'blog-images' bucket under <blogTitle>/Images/<filename>
 */
router.post('/title', requireAuthenticated, upload.single('titleImage'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No title image file uploaded' })
    }

    const blogTitle = (req.body.blogTitle || 'default').toString()
    const sanitizedTitle = sanitizeName(blogTitle)
    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `${sanitizedTitle}/Images/${filename}`

    const publicUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        blogFolder: sanitizedTitle
      }
    })
  } catch (error: any) {
    console.error('Title image upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload title image' })
  }
})

/**
 * POST /api/image-upload/category-icon
 * Accepts form field 'icon'
 * Uploads to bucket 'category-icons' root.
 */
router.post('/category-icon', requireAdmin, upload.single('icon'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No icon file uploaded' })
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `${filename}`

    const publicUrl = await uploadBufferToBucket('category-icons', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (error: any) {
    console.error('Category icon upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload category icon' })
  }
})

/**
 * POST /api/image-upload/tag-image
 * Accepts form field 'tagImage' and 'tagSlug' in body. Saves the image in bucket 'tag-images' under <tagSlug>/<filename>
 */
router.post('/tag-image', requireAdmin, upload.single('tagImage'), async (req, res) => {
  try {
    // Debug logging (useful during development)
    // console.log('=== TAG IMAGE UPLOAD DEBUG ===')
    // console.log('req.body:', req.body)
    // console.log('req.file:', req.file ? { filename: req.file.originalname } : 'No file')
    // console.log('tagSlug from body:', req.body.tagSlug)
    // console.log('================================')

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No tag image file uploaded' })
    }

    const tagSlugRaw = (req.body.tagSlug || 'default').toString()
    const sanitizedSlug = sanitizeName(tagSlugRaw)
    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${sanitizeName(req.file.originalname)}`
    const objectPath = `${sanitizedSlug}/${filename}`

    // ensure slug folder existence is implicit in object path when uploading to storage
    const publicUrl = await uploadBufferToBucket('tag-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        tagSlug: sanitizedSlug
      }
    })
  } catch (error: any) {
    console.error('Tag image upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload tag image' })
  }
})

/**
 * POST /api/image-upload/team-image
 * Accepts form field 'teamImage' - Uploads team image to bucket 'blog-images' under 'teams/'
 */
router.post('/team-image', requireAdmin, upload.single('teamImage'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No team image file uploaded' })
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `teams/${filename}`

    const publicUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (error: any) {
    console.error('Team image upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload team image' })
  }
})

/**
 * POST /api/image-upload/author-profile
 * Accepts form field 'authorImage' - Uploads author profile image to bucket 'blog-images' under 'authors/'
 */
router.post('/author-profile', requireAdmin, upload.single('authorImage'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No author image file uploaded' })
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `authors/${filename}`

    const publicUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (error: any) {
    console.error('Author image upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload author image' })
  }
})

/**
 * POST /api/image-upload/product-images
 * Accepts form field 'productImage' - Uploads product images to bucket 'blog-images' under 'products/'
 */
router.post('/product-images', requireAdmin, upload.single('productImage'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No product image file uploaded' })
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `products/${filename}`

    const publicUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (error: any) {
    console.error('Product image upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload product image' })
  }
})

/**
 * POST /api/image-upload/product-pdf
 * Accepts form field 'productPdf' - Uploads product PDF files to bucket 'blog-images' under 'products/pdfs/'
 */
router.post('/product-pdf', requireAdmin, upload.single('productPdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No product PDF file uploaded' })
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    const allowedPdfExtensions = ['.pdf']
    if (!allowedPdfExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type. Only PDF files are allowed.' })
    }

    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `products/pdfs/${filename}`

    const publicUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    return res.json({
      success: true,
      url: publicUrl,
      data: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (error: any) {
    console.error('Product PDF upload error:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload product PDF' })
  }
})

export default router
