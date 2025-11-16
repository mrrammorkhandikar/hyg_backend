import express from 'express';
import { supabase } from '../db/supabaseClient';
import { redis } from '../db/redis';
import { verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// GET all blogs (cache)
router.get('/', async (req, res) => {
  try {
    const cache = await redis.get('blogs');
    if (cache) return res.json(JSON.parse(cache));

    const { data, error } = await supabase.from('blogs').select('*');
    if (error) return res.status(500).json(error);

    await redis.set('blogs', JSON.stringify(data), 'EX', 60); // cache 60s
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

// CRUD routes (protected)
router.post('/', verifyAdmin, async (req, res) => {
  const { title, content, seo, affiliate, googleAds } = req.body;
  const { data, error } = await supabase.from('blogs').insert([{ title, content, seo, affiliate, googleAds }]);
  if (error) return res.status(500).json(error);

  await redis.del('blogs'); // invalidate cache
  res.json(data);
});

router.put('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, seo, affiliate, googleAds } = req.body;
  const { data, error } = await supabase.from('blogs').update({ title, content, seo, affiliate, googleAds }).eq('id', id);
  if (error) return res.status(500).json(error);

  await redis.del('blogs');
  res.json(data);
});

router.delete('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('blogs').delete().eq('id', id);
  if (error) return res.status(500).json(error);

  await redis.del('blogs');
  res.json({ deleted: id });
});

export default router;
