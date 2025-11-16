import express from 'express'
import multer from 'multer'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// Configure multer to store files in memory (required for Supabase upload)
const imageUpload = multer({
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
      cb(new Error('Only image files (JPG, PNG, GIF, WebP, SVG) are allowed'))
    }
  }
})

// GET /api/images - List all images from Supabase Storage
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string || ''
    const folder = req.query.folder as string || ''
    const sortBy = req.query.sortBy as string || 'created_at'
    const sortOrder = req.query.sortOrder as string || 'desc'

    // List files from Supabase Storage
    let { data: files, error } = await supabase.storage
      .from('blog-images')
      .list(folder || '', {
        limit: 1000, // Get more files to filter/search
        sortBy: { column: sortBy, order: sortOrder }
      })

    if (error) {
      console.error('Supabase list error:', error)
      return res.status(500).json({ error: 'Failed to list images' })
    }

    if (!files) files = []

    // Filter and transform files
    let allImages = files
      .filter(file => {
        // Filter out directories and non-image files
        if (file.name.startsWith('.')) return false
        const ext = file.name.toLowerCase().split('.').pop()
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
        return isImage
      })
      .map(file => {
        const ext = file.name.split('.').pop() || ''
        const { data: { publicUrl } } = supabase.storage
          .from('blog-images')
          .getPublicUrl(folder ? `${folder}/${file.name}` : file.name)

        return {
          id: Buffer.from(file.name).toString('base64'),
          filename: file.name,
          originalName: file.name,
          url: publicUrl,
          size: file.metadata?.size || 0,
          uploadDate: file.created_at ? new Date(file.created_at) : new Date(),
          modifiedDate: file.updated_at ? new Date(file.updated_at) : new Date(),
          type: ext,
          folder: folder || 'default'
        }
      })

    // Apply search filter
    if (search) {
      allImages = allImages.filter(img =>
        img.filename.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply pagination
    const total = allImages.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedImages = allImages.slice(offset, offset + limit)

    res.json({
      success: true,
      data: paginatedImages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error listing images:', error)
    res.status(500).json({ error: 'Failed to list images' })
  }
})

// POST /api/images - Upload new image
router.post('/', requireAdmin, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' })
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    const filename = `${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('blog-images')
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
      .from('blog-images')
      .getPublicUrl(filename)

    res.json({
      success: true,
      data: {
        id: Buffer.from(filename).toString('base64'),
        filename,
        originalName: req.file.originalname,
        url: publicUrl,
        size: req.file.size,
        uploadDate: new Date(),
        modifiedDate: new Date(),
        type: req.file.originalname.split('.').pop() || '',
        folder: 'default'
      }
    })
  } catch (error) {
    console.error('Image upload error:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

// GET /api/images/:id - Get specific image details
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const imageId = req.params.id
    const filename = Buffer.from(imageId, 'base64').toString('utf-8')

    // Get file metadata from Supabase
    const { data, error } = await supabase.storage
      .from('blog-images')
      .list('', { search: filename, limit: 1 })

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const file = data[0]
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(filename)

    res.json({
      success: true,
      data: {
        id: imageId,
        filename,
        originalName: filename,
        url: publicUrl,
        size: file.metadata?.size || 0,
        uploadDate: file.created_at ? new Date(file.created_at) : new Date(),
        modifiedDate: file.updated_at ? new Date(file.updated_at) : new Date(),
        type: filename.split('.').pop() || ''
      }
    })
  } catch (error) {
    console.error('Error getting image details:', error)
    res.status(500).json({ error: 'Failed to get image details' })
  }
})

// PUT /api/images/:id - Update image metadata (rename file)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const imageId = req.params.id
    const { newFilename } = req.body

    if (!newFilename) {
      return res.status(400).json({ error: 'New filename is required' })
    }

    const currentFilename = Buffer.from(imageId, 'base64').toString('utf-8')
    const sanitizedFilename = newFilename.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Check if new filename already exists
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('blog-images')
      .list('', { search: sanitizedFilename, limit: 1 })

    if (listError) {
      console.error('Error checking existing files:', listError)
      return res.status(500).json({ error: 'Failed to check existing files' })
    }

    if (existingFiles && existingFiles.length > 0 && existingFiles[0].name !== currentFilename) {
      return res.status(400).json({ error: 'A file with this name already exists' })
    }

    // Copy file to new name (Supabase doesn't have rename, so we copy and delete)
    const { data: copyData, error: copyError } = await supabase.storage
      .from('blog-images')
      .copy(currentFilename, sanitizedFilename)

    if (copyError) {
      console.error('Error copying file:', copyError)
      return res.status(500).json({ error: 'Failed to rename image' })
    }

    // Delete old file
    const { error: deleteError } = await supabase.storage
      .from('blog-images')
      .remove([currentFilename])

    if (deleteError) {
      console.error('Error deleting old file:', deleteError)
      // Continue anyway, the rename was successful
    }

    // Get updated file metadata
    const { data: newFileData } = await supabase.storage
      .from('blog-images')
      .list('', { search: sanitizedFilename, limit: 1 })

    const newFile = newFileData?.[0]
    const newId = Buffer.from(sanitizedFilename).toString('base64')
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(sanitizedFilename)

    res.json({
      success: true,
      data: {
        id: newId,
        filename: sanitizedFilename,
        originalName: sanitizedFilename,
        url: publicUrl,
        size: newFile?.metadata?.size || 0,
        uploadDate: newFile?.created_at ? new Date(newFile.created_at) : new Date(),
        modifiedDate: newFile?.updated_at ? new Date(newFile.updated_at) : new Date(),
        type: sanitizedFilename.split('.').pop() || ''
      }
    })
  } catch (error) {
    console.error('Error updating image:', error)
    res.status(500).json({ error: 'Failed to update image' })
  }
})

// DELETE /api/images/:id - Delete image
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const imageId = req.params.id
    const filename = Buffer.from(imageId, 'base64').toString('utf-8')

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('blog-images')
      .remove([filename])

    if (error) {
      console.error('Supabase delete error:', error)
      return res.status(404).json({ error: 'Image not found or failed to delete' })
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting image:', error)
    res.status(500).json({ error: 'Failed to delete image' })
  }
})

// GET /api/images/folders - Get list of available folders
router.get('/folders/list', requireAdmin, async (req, res) => {
  try {
    // List all files to determine unique folders
    const { data: files, error } = await supabase.storage
      .from('blog-images')
      .list('', { limit: 1000 })

    if (error) {
      console.error('Error listing files for folders:', error)
      return res.status(500).json({ error: 'Failed to list folders' })
    }

    // Extract unique folders from file paths
    const folders = new Set<string>()
    files?.forEach(file => {
      if (file.name.includes('/')) {
        const folder = file.name.split('/')[0]
        folders.add(folder)
      }
    })

    // Always include 'default' folder
    folders.add('default')

    res.json({
      success: true,
      data: Array.from(folders)
    })
  } catch (error) {
    console.error('Error listing folders:', error)
    res.status(500).json({ error: 'Failed to list folders' })
  }
})

export default router
