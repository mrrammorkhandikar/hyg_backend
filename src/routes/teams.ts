import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Validate team data
const validateTeamData = (name: string) => {
  const errors: string[] = []

  if (!name) {
    errors.push('name is required')
  }

  return errors
}

// List teams
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('teams').select('*').order('name', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from('teams').select('*').eq('id', id).maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Not found' })
  res.json(data)
})

// Create team
router.post('/', requireAdmin, async (req, res) => {
  const { name, title, description, socialmedia, image } = req.body

  const validationErrors = validateTeamData(name)
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join(', ') })
  }

  const insertData: any = {
    name,
    title,
    description,
    socialmedia: socialmedia || [],
    image
  }

  const { data, error } = await supabase.from('teams').insert([insertData]).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Update team
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, title, description, socialmedia, image } = req.body

  // Get existing team to check existing image
  const { data: existingTeam, error: fetchError } = await supabase
    .from('teams')
    .select('image')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!existingTeam) return res.status(404).json({ error: 'Team not found' })

  const validationErrors = validateTeamData(name)
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join(', ') })
  }

  // If updating image and it's different from existing, delete old image
  if (image !== undefined && existingTeam.image && existingTeam.image !== image) {
    try {
      const teamImageDir = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Teams')

      // Extract filename from old image and construct full file path
      const oldImageFileName = path.basename(existingTeam.image)
      const oldImageFilePath = path.join(teamImageDir, oldImageFileName)

      // Check if the old image file exists and delete it
      if (fs.existsSync(oldImageFilePath)) {
        fs.unlinkSync(oldImageFilePath)
        console.log(`Deleted old team image file: ${oldImageFilePath}`)
      }
    } catch (fileError) {
      console.error('Error deleting old team image file:', fileError)
      // Don't fail the update if old image deletion fails
    }
  }

  const updateData: any = {
    name,
    title,
    description,
    socialmedia: socialmedia || [],
    image
  }

  const { data, error } = await supabase.from('teams').update(updateData).eq('id', id).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Delete team
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    // First, get the team data to retrieve image information
    const { data: teamData, error: fetchError } = await supabase
      .from('teams')
      .select('image')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message })
    }

    if (!teamData) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Delete the team from database
    const { error: deleteError } = await supabase.from('teams').delete().eq('id', id)
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message })
    }

    // If there's an image, delete the associated image file
    if (teamData.image) {
      try {
        const teamImageDir = path.join(process.cwd(), '..', 'frontend', 'public', 'BlogSiteImages', 'Teams')

        // Extract filename from image and construct full file path
        const imageFileName = path.basename(teamData.image)
        const imageFilePath = path.join(teamImageDir, imageFileName)

        // Check if the specific image file exists and delete it
        if (fs.existsSync(imageFilePath)) {
          fs.unlinkSync(imageFilePath)
          console.log(`Deleted team image file: ${imageFilePath}`)
        }
      } catch (fileError) {
        console.error('Error deleting team image file:', fileError)
        // Don't fail the entire operation if file deletion fails
        // The team is already deleted from the database
      }
    }

    res.json({ deleted: id })
  } catch (error) {
    console.error('Error deleting team:', error)
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

export default router
