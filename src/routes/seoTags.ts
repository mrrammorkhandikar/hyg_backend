import express from 'express'
import { supabase } from '../db/supabaseClient'
import { requireAdmin } from '../middleware/requireAdmin'

const router = express.Router()

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('seo_tags').select('*').order('name', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', requireAdmin, async (req, res) => {
  const { name, meta } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const { data, error } = await supabase.from('seo_tags').insert([{ name, meta }]).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, meta } = req.body
  const { data, error } = await supabase.from('seo_tags').update({ name, meta }).eq('id', id).select().maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('seo_tags').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ deleted: id })
})

export default router