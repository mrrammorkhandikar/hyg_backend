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

    // Map folder names to Supabase bucket structure
    let targetFolder = folder || ''
    if (folder === 'blogs') targetFolder = 'blog'
    if (folder === 'categories') targetFolder = 'category_icons'
    // tags folder stays the same

    // List files from Supabase Storage
    let { data: files, error } = await supabase.storage
      .from('Images')
      .list(targetFolder || '', {
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
        const fullPath = targetFolder ? `${targetFolder}/${file.name}` : file.name
        const { data: { publicUrl } } = supabase.storage
          .from('Images')
          .getPublicUrl(fullPath)

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

// POST /api/images/bulk-delete - Delete multiple images
router.post('/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { imageIds } = req.body

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'Image IDs array is required' })
    }

    const filenames = []
    const errors = []

    // Convert IDs to filenames
    for (const imageId of imageIds) {
      try {
        const filename = Buffer.from(imageId, 'base64').toString('utf-8')
        filenames.push(filename)
      } catch (error) {
        errors.push(`Invalid image ID: ${imageId}`)
      }
    }

    if (filenames.length === 0) {
      return res.status(400).json({ error: 'No valid image IDs provided' })
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('blog-images')
      .remove(filenames)

    if (error) {
      console.error('Supabase bulk delete error:', error)
      return res.status(500).json({ error: 'Failed to delete some images' })
    }

    res.json({
      success: true,
      message: `Successfully deleted ${filenames.length} image(s)`,
      deleted: filenames,
      errors: errors
    })
  } catch (error) {
    console.error('Error in bulk delete:', error)
    res.status(500).json({ error: 'Failed to perform bulk delete' })
  }
})

// POST /api/images/move - Move images to different folder
router.post('/move', requireAdmin, async (req, res) => {
  try {
    const { imageIds, targetFolder } = req.body

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'Image IDs array is required' })
    }

    if (!targetFolder || typeof targetFolder !== 'string') {
      return res.status(400).json({ error: 'Target folder is required' })
    }

    const sanitizedTargetFolder = targetFolder.replace(/[^a-zA-Z0-9-_]/g, '_')
    const results = []
    const errors = []

    for (const imageId of imageIds) {
      try {
        const currentFilename = Buffer.from(imageId, 'base64').toString('utf-8')

        // Skip if already in target folder
        const currentFolder = currentFilename.includes('/') ? currentFilename.split('/')[0] : 'default'
        if (currentFolder === sanitizedTargetFolder) {
          continue
        }

        const filenameOnly = currentFilename.includes('/') ? currentFilename.split('/').pop() || '' : currentFilename
        if (!filenameOnly) {
          errors.push({ imageId, error: `Invalid filename for ${currentFilename}` })
          continue
        }
        const newFilename = sanitizedTargetFolder === 'default' ? filenameOnly : `${sanitizedTargetFolder}/${filenameOnly}`

        // Copy to new location
        const { error: copyError } = await supabase.storage
          .from('blog-images')
          .copy(currentFilename, newFilename)

        if (copyError) {
          errors.push({ imageId, error: `Failed to copy ${currentFilename}` })
          continue
        }

        // Delete from old location
        const { error: deleteError } = await supabase.storage
          .from('blog-images')
          .remove([currentFilename])

        if (deleteError) {
          errors.push({ imageId, error: `Failed to remove old file ${currentFilename}` })
          continue
        }

        results.push({
          oldFilename: currentFilename,
          newFilename: newFilename,
          success: true
        })

      } catch (error) {
        errors.push({ imageId, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    res.json({
      success: true,
      message: `Moved ${results.length} image(s) to folder '${sanitizedTargetFolder}'`,
      moved: results,
      errors: errors
    })
  } catch (error) {
    console.error('Error in bulk move:', error)
    res.status(500).json({ error: 'Failed to move images' })
  }
})

export default router
