import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAuthenticated, requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

// Configure multer for blog post uploads
const blogStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const blogTitle = req.body.blogTitle || 'default'
    const sanitizedTitle = blogTitle.replace(/[^a-zA-Z0-9]/g, '_')
    const uploadPath = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Blogs', sanitizedTitle, 'Images')
    
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

// Configure multer for category icons
const categoryIconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Categories')
    
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

// Configure multer for tag images
const tagImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // We'll create the directory in the route handler after req.body is available
    const uploadPath = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Tags')
    
    // Create base directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')
    cb(null, sanitizedName)
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)
  
  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const blogUpload = multer({ 
  storage: blogStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
})

const categoryIconUpload = multer({ 
  storage: categoryIconStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for icons
  },
  fileFilter
})

const tagImageUpload = multer({ 
  storage: tagImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for tag images
  },
  fileFilter
})

// POST /api/image-upload - Upload images for blog posts
router.post('/', requireAuthenticated, blogUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' })
    }

    const blogTitle = req.body.blogTitle || 'default'
    const sanitizedTitle = blogTitle.replace(/[^a-zA-Z0-9]/g, '_')
    const relativePath = `/BlogSiteImages/Blogs/${sanitizedTitle}/Images/${req.file.filename}`
    
    res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      blogFolder: sanitizedTitle
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

    const blogTitle = req.body.blogTitle || 'default'
    const sanitizedTitle = blogTitle.replace(/[^a-zA-Z0-9]/g, '_')
    const relativePath = `/BlogSiteImages/Blogs/${sanitizedTitle}/Images/${req.file.filename}`
    
    res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      blogFolder: sanitizedTitle
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
    
    const relativePath = `/BlogSiteImages/Categories/${req.file.filename}`
    
    res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename,
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
    
    // Create the specific slug directory and move the file
    const currentFilePath = req.file.path
    const targetDir = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Tags', sanitizedSlug)
    const targetFilePath = path.join(targetDir, req.file.filename)
    
    // Create target directory if it doesn't exist
    fs.mkdirSync(targetDir, { recursive: true })
    
    // Move file from temp location to target location
    fs.renameSync(currentFilePath, targetFilePath)
    
    const relativePath = `/BlogSiteImages/Tags/${sanitizedSlug}/${req.file.filename}`
    
    res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename,
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
