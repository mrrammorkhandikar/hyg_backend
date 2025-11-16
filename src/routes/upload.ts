import express from 'express'
import multer from 'multer'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'
const upload = multer({ storage: multer.memoryStorage() })
const router = express.Router()

// POST /api/upload - field name "file"
router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file uploaded' })

    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`
    const bucket = 'posts-images'

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    })

    if (error) return res.status(500).json({ error: error.message })

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
    res.json({ url: publicUrl })
  } catch (err) {
    res.status(500).json({ error: (err as any).message })
  }
})

export default router
