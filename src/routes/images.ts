// backend/src/routes/images.ts
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../middleware/requireAdmin'


const router = express.Router()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Default bucket used for blog images
const DEFAULT_BUCKET = 'blog-images'

// Helper to encode/decode ids as base64 strings of object paths
const encodeId = (objectPath: string) => Buffer.from(objectPath).toString('base64')
const decodeId = (id: string) => Buffer.from(id, 'base64').toString('utf-8')

type StorageFile = {
  name: string
  id: string
  path: string
  url: string
  size: number
  uploadDate: string
  modifiedDate: string
  type: string
  folder: string
}

/**
 * List files with pagination, search, folder filter and sorting
 * GET /
 * query params:
 *  - page (default 1)
 *  - limit (default 20)
 *  - search (string)
 *  - folder (prefix in bucket)
 *  - sortBy (name | uploadDate | size) default uploadDate
 *  - sortOrder (asc | desc) default desc
 *  - bucket (optional override)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10) || 1
    const limit = parseInt((req.query.limit as string) || '20', 10) || 20
    const search = (req.query.search as string || '').toLowerCase()
    const folder = (req.query.folder as string || '').replace(/^\//, '') // prefix
    const sortBy = (req.query.sortBy as string) || 'uploadDate'
    const sortOrder = (req.query.sortOrder as string) || 'desc'
    const bucket = (req.query.bucket as string) || DEFAULT_BUCKET

    // Supabase list supports prefix and limit/offset
    const offset = (page - 1) * limit
    const listOptions: any = { limit, offset }

    if (folder) listOptions.prefix = folder.endsWith('/') ? folder : `${folder}/`

    const { data: files, error } = await supabaseAdmin.storage.from(bucket).list(listOptions.prefix || '', listOptions)

    if (error) {
      console.error('Supabase list error', error)
      return res.status(500).json({ error: 'Failed to list files' })
    }

    // Build file metadata objects
    const mapped: StorageFile[] = await Promise.all((files || []).map(async (f: any) => {
      const objectPath = (listOptions.prefix ? listOptions.prefix : '') + f.name
      const id = encodeId(objectPath)
      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath)
      const publicUrl = urlData?.publicUrl || ''
      // Supabase file metadata doesn't include upload date; use placeholder or list's updated_at if available
      return {
        name: f.name,
        id,
        path: objectPath,
        url: publicUrl,
        size: f.size || 0,
        uploadDate: f.updated_at || new Date().toISOString(),
        modifiedDate: f.updated_at || new Date().toISOString(),
        type: (f.name.split('.').pop() || '').toLowerCase(),
        folder: folder || ''
      }
    }))

    // apply search filter (client-side) if provided
    const searched = search
      ? mapped.filter(item => item.name.toLowerCase().includes(search))
      : mapped

    // simple sorting
    searched.sort((a, b) => {
      let aVal: any = a[sortBy as keyof StorageFile]
      let bVal: any = b[sortBy as keyof StorageFile]

      if (sortBy === 'uploadDate' || sortBy === 'modifiedDate') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (sortBy === 'size') {
        aVal = Number(aVal)
        bVal = Number(bVal)
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1
      } else {
        return aVal > bVal ? 1 : -1
      }
    })

    // pagination metadata (we used limit/offset so total is unknown without a separate call; we'll approximate)
    const total = searched.length
    const totalPages = Math.ceil(total / limit)

    res.json({
      success: true,
      data: searched,
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

/**
 * GET /:id - get specific file metadata
 * id is base64(objectPath)
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id
    const objectPath = decodeId(id)
    const bucket = req.query.bucket as string || DEFAULT_BUCKET

    // Get public url
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath)
    if (!urlData || !urlData.publicUrl) {
      console.error('getPublicUrl returned no url', urlData)
      return res.status(500).json({ error: 'Failed to get file url' })
    }

    // Supabase storage metadata returned earlier on list; here we build a minimal response
    res.json({
      success: true,
      data: {
        id,
        path: objectPath,
        url: urlData.publicUrl
      }
    })
  } catch (error) {
    console.error('Error getting image details:', error)
    res.status(500).json({ error: 'Failed to get image details' })
  }
})

/**
 * PUT /:id - Rename (update metadata)
 * body: { newFilename: string, bucket?: string }
 * Implementation: download file, re-upload under new name (same folder), delete old one.
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id
    const { newFilename } = req.body
    const bucket = (req.body.bucket as string) || DEFAULT_BUCKET

    if (!newFilename) return res.status(400).json({ error: 'New filename is required' })

    const objectPath = decodeId(id)
    // derive directory
    const lastSlash = objectPath.lastIndexOf('/')
    const directory = lastSlash === -1 ? '' : objectPath.substring(0, lastSlash + 1)
    const sanitized = newFilename.replace(/[^a-zA-Z0-9.\-]/g, '_')
    const newPath = `${directory}${sanitized}`

    // Download existing file
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage.from(bucket).download(objectPath)
    if (downloadError || !downloadData) {
      console.error('Download error', downloadError)
      return res.status(404).json({ error: 'Image not found or download failed' })
    }

    const buffer = Buffer.from(await downloadData.arrayBuffer())

    // Upload to new path
    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(newPath, buffer, {
      cacheControl: '3600',
      upsert: false
    })

    if (uploadError) {
      console.error('Upload error', uploadError)
      return res.status(500).json({ error: 'Failed to rename (upload step failed)' })
    }

    // Delete old file
    const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove([objectPath])
    if (removeError) {
      console.error('Remove old file error', removeError)
      // Not fatal — file renamed but old file failed to delete. Notify client.
      return res.status(200).json({
        success: true,
        warning: 'New file uploaded but failed to delete old file',
        data: {
          id: Buffer.from(newPath).toString('base64'),
          filename: sanitized,
          path: newPath,
          url: (await supabaseAdmin.storage.from(bucket).getPublicUrl(newPath)).data.publicUrl
        }
      })
    }

    // success response
    const publicUrl = (await supabaseAdmin.storage.from(bucket).getPublicUrl(newPath)).data.publicUrl

    res.json({
      success: true,
      data: {
        id: Buffer.from(newPath).toString('base64'),
        filename: sanitized,
        path: newPath,
        url: publicUrl
      }
    })
  } catch (error) {
    console.error('Error updating image:', error)
    res.status(500).json({ error: 'Failed to update image' })
  }
})

/**
 * DELETE /:id - Delete file
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id
    const bucket = (req.query.bucket as string) || DEFAULT_BUCKET
    const objectPath = decodeId(id)

    const { error } = await supabaseAdmin.storage.from(bucket).remove([objectPath])
    if (error) {
      console.error('Remove error', error)
      return res.status(500).json({ error: 'Failed to delete image' })
    }

    res.json({ success: true, message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Error deleting image:', error)
    res.status(500).json({ error: 'Failed to delete image' })
  }
})

/**
 * GET /folders/list - list top-level folders in bucket (prefixes)
 */
router.get('/folders/list', requireAdmin, async (req, res) => {
  try {
    const bucket = (req.query.bucket as string) || DEFAULT_BUCKET
    // Supabase storage doesn't expose a direct "list folders" call, but we can list root and extract prefix names
    const { data: files, error } = await supabaseAdmin.storage.from(bucket).list('', { limit: 1000 })
    if (error) {
      console.error('List error', error)
      return res.status(500).json({ error: 'Failed to list folders' })
    }

    // extract top-level folder names from file names that contain '/'
    const folders = new Set<string>()
    ;(files || []).forEach((f: any) => {
      const parts = f.name.split('/')
      if (parts.length > 1) {
        folders.add(parts[0])
      }
    })

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
