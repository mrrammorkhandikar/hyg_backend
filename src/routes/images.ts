import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// Configure multer for image uploads to default directory
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Blogs', 'default', 'Images')
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    cb(null, `${timestamp}_${sanitizedName}`)
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)
  
  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('Only image files (JPG, PNG, GIF, WebP, SVG) are allowed'))
  }
}

const imageUpload = multer({ 
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
})

// Helper function to get file stats
const getFileStats = (filePath: string) => {
  try {
    const stats = fs.statSync(filePath)
    return {
      size: stats.size,
      uploadDate: stats.birthtime,
      modifiedDate: stats.mtime
    }
  } catch (error) {
    return null
  }
}

// Helper function to scan directory for images
const scanImagesDirectory = (dirPath: string, relativePath: string = '') => {
  const images: any[] = []
  
  try {
    if (!fs.existsSync(dirPath)) {
      return images
    }

    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stats = fs.statSync(fullPath)
      
      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subImages = scanImagesDirectory(fullPath, path.join(relativePath, item))
        images.push(...subImages)
      } else if (stats.isFile()) {
        // Check if it's an image file
        const ext = path.extname(item).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          const relativeFilePath = path.join(relativePath, item).replace(/\\/g, '/')
          images.push({
            id: Buffer.from(fullPath).toString('base64'), // Use base64 encoded path as ID
            filename: item,
            originalName: item,
            path: fullPath,
            url: `/BlogSiteImages/Blogs/${relativeFilePath}`,
            size: stats.size,
            uploadDate: stats.birthtime,
            modifiedDate: stats.mtime,
            type: ext.substring(1),
            folder: relativePath || 'default'
          })
        }
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error)
  }
  
  return images
}

// GET /api/images - List all images with pagination and filtering
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string || ''
    const folder = req.query.folder as string || ''
    const sortBy = req.query.sortBy as string || 'uploadDate'
    const sortOrder = req.query.sortOrder as string || 'desc'

    // Scan the main images directory
    const baseImagePath = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Blogs')
    let allImages = scanImagesDirectory(baseImagePath)

    // Apply search filter
    if (search) {
      allImages = allImages.filter(img => 
        img.filename.toLowerCase().includes(search.toLowerCase()) ||
        img.originalName.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply folder filter
    if (folder) {
      allImages = allImages.filter(img => img.folder === folder)
    }

    // Sort images
    allImages.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'uploadDate' || sortBy === 'modifiedDate') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortBy === 'size') {
        aValue = parseInt(aValue)
        bValue = parseInt(bValue)
      } else {
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1
      } else {
        return aValue > bValue ? 1 : -1
      }
    })

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

    const relativePath = `/BlogSiteImages/Blogs/default/Images/${req.file.filename}`
    const fileStats = getFileStats(req.file.path)
    
    res.json({
      success: true,
      data: {
        id: Buffer.from(req.file.path).toString('base64'),
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: relativePath,
        size: req.file.size,
        uploadDate: fileStats?.uploadDate || new Date(),
        modifiedDate: fileStats?.modifiedDate || new Date(),
        type: path.extname(req.file.originalname).substring(1),
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
    const imagePath = Buffer.from(imageId, 'base64').toString('utf-8')
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const stats = fs.statSync(imagePath)
    const filename = path.basename(imagePath)
    const relativePath = imagePath.replace(path.join(process.cwd(), '..', 'frontend', 'public'), '').replace(/\\/g, '/')
    
    res.json({
      success: true,
      data: {
        id: imageId,
        filename,
        originalName: filename,
        path: imagePath,
        url: relativePath,
        size: stats.size,
        uploadDate: stats.birthtime,
        modifiedDate: stats.mtime,
        type: path.extname(filename).substring(1)
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

    const currentPath = Buffer.from(imageId, 'base64').toString('utf-8')
    
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Sanitize new filename
    const sanitizedFilename = newFilename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const directory = path.dirname(currentPath)
    const newPath = path.join(directory, sanitizedFilename)
    
    // Check if new filename already exists
    if (fs.existsSync(newPath) && newPath !== currentPath) {
      return res.status(400).json({ error: 'A file with this name already exists' })
    }

    // Rename the file
    fs.renameSync(currentPath, newPath)
    
    const stats = fs.statSync(newPath)
    const newId = Buffer.from(newPath).toString('base64')
    const relativePath = newPath.replace(path.join(process.cwd(), '..', 'frontend', 'public'), '').replace(/\\/g, '/')
    
    res.json({
      success: true,
      data: {
        id: newId,
        filename: sanitizedFilename,
        originalName: sanitizedFilename,
        path: newPath,
        url: relativePath,
        size: stats.size,
        uploadDate: stats.birthtime,
        modifiedDate: stats.mtime,
        type: path.extname(sanitizedFilename).substring(1)
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
    const imagePath = Buffer.from(imageId, 'base64').toString('utf-8')
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Delete the file
    fs.unlinkSync(imagePath)
    
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
    const baseImagePath = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Blogs')
    const folders: string[] = []
    
    if (fs.existsSync(baseImagePath)) {
      const items = fs.readdirSync(baseImagePath)
      for (const item of items) {
        const itemPath = path.join(baseImagePath, item)
        if (fs.statSync(itemPath).isDirectory()) {
          folders.push(item)
        }
      }
    }
    
    res.json({
      success: true,
      data: folders
    })
  } catch (error) {
    console.error('Error listing folders:', error)
    res.status(500).json({ error: 'Failed to list folders' })
  }
})

export default router