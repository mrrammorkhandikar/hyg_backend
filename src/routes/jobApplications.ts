import express from 'express'
import multer from 'multer'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for resumes
})

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

// POST /job-applications - Submit a job application
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const {
      fullName,
      email,
      contactNumber,
      location,
      ageGroup,
      education,
      internshipPosition,
      experience
    } = req.body

    // Validate required fields
    if (!fullName || !email || !contactNumber || !location || !ageGroup || !education || !internshipPosition || !experience) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate resume file
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Resume file is required' })
    }

    // Validate file type for resume
    const allowedResumeExtensions = ['.pdf', '.doc', '.docx']
    const ext = path.extname(req.file.originalname).toLowerCase()
    if (!allowedResumeExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type. Only PDF, DOC, and DOCX files are allowed.' })
    }

    // Upload resume to Supabase storage
    const filename = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const objectPath = `job-applications/${filename}`

    const resumeUrl = await uploadBufferToBucket('blog-images', objectPath, req.file.buffer, req.file.mimetype)

    // Prepare job application data
    const jobApplicationData = {
      email: email.trim(),
      full_name: fullName.trim(),
      age_group: ageGroup,
      contact_number: contactNumber.trim(),
      location: location.trim(),
      education: education,
      internship_position: internshipPosition,
      experience: experience,
      resume_file_path: resumeUrl,
    }

    // Insert into database
    const { data, error } = await supabase
      .from('job_applications')
      .insert([jobApplicationData])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /job-applications - Get all job applications (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// GET /job-applications/:id - Get a specific job application (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Job application not found' })

    res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

// DELETE /job-applications/:id - Delete a job application (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // First get the application to get the resume file path
    const { data: application, error: fetchError } = await supabase
      .from('job_applications')
      .select('resume_file_path')
      .eq('id', id)
      .single()

    if (fetchError) return res.status(500).json({ error: fetchError.message })
    if (!application) return res.status(404).json({ error: 'Job application not found' })

    // Delete from database
    const { data, error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Job application not found' })

    // Optionally: Delete the resume file from storage
    // This would require parsing the URL to get the file path
    // For now, we'll just delete the database record

    res.json({ message: 'Job application deleted successfully' })
  } catch (err) {
    return res.status(500).json({ error: (err as any).message })
  }
})

export default router
