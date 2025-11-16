import express from 'express';
import { supabase } from '../db/supabaseClient';
import { requireAdmin } from '../middleware/requireAdmin';
import { cacheGet, cacheSet } from '../db/redisClient';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const AffiliateLinkCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
  url: z.string().url('Valid URL is required'),
  provider: z.string().min(1, 'Provider is required').max(255, 'Provider cannot exceed 255 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').nullable().optional(),
  is_active: z.boolean().default(true),
});

const AffiliateLinkUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters').optional(),
  url: z.string().url('Valid URL is required').optional(),
  provider: z.string().min(1, 'Provider is required').max(255, 'Provider cannot exceed 255 characters').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').nullable().optional(),
  is_active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});



//// GET /affiliate-links/meta/providers - Get list of unique providers
router.get('/meta/providers', async (req, res) => {
  try {
    const cacheKey = 'affiliate_links_providers';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { data, error } = await supabase
      .from('affiliate_links')
      .select('provider')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching providers:', error);
      return res.status(500).json({ error: 'Failed to fetch providers' });
    }

    const uniqueProviders = [...new Set(data.map((item) => item.provider))].sort();
    await cacheSet(cacheKey, uniqueProviders, 3600); // Cache for 1 hour
    res.json(uniqueProviders);
  } catch (err) {
    console.error('Error in GET /affiliate-links/meta/providers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /affiliate-links - List all affiliate links with pagination, sorting, and filtering
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const searchTerm = (req.query.search as string) || '';

    const cacheKey = `affiliate_links:${page}:${limit}:${sortBy}:${sortOrder}:${searchTerm}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const ascending = sortOrder === 'asc';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('affiliate_links')
      .select('*', { count: 'exact' });

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,provider.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching affiliate links:', error);
      return res.status(500).json({ error: 'Failed to fetch affiliate links' });
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;
    const response = {
      data: data || [],
      pagination: {
        total: count || 0,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };

    await cacheSet(cacheKey, response, 300); // Cache for 5 minutes
    res.json(response);
  } catch (err) {
    console.error('Error in GET /affiliate-links:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /affiliate-links/:id - Get single affiliate link with click statistics
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid affiliate link ID format' });
    }

    // Get affiliate link
    const { data: affiliateLink, error: linkError } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('id', id)
      .single();

    if (linkError || !affiliateLink) {
      return res.status(404).json({ error: 'Affiliate link not found' });
    }

    // Get click statistics from affiliate_clicks
    const { data: clicks, error: clicksError } = await supabase
      .from('affiliate_clicks')
      .select('id, clicked_at, meta')
      .eq('affiliate_link_id', id);

    if (clicksError) {
      console.error('Error fetching click statistics:', clicksError);
    }

    const stats = {
      total_clicks: clicks?.length || 0,
      unique_sessions: new Set(clicks?.map((click) => click.meta?.session_id)).size || 0,
      mobile_clicks: clicks?.filter((click) => click.meta?.device === 'mobile').length || 0,
      desktop_clicks: clicks?.filter((click) => click.meta?.device === 'desktop').length || 0,
      avg_daily_clicks: clicks?.length ? (clicks.length / 30).toFixed(2) : '0',
    };

    res.json({
      ...affiliateLink,
      statistics: stats,
    });
  } catch (err) {
    console.error('Error in GET /affiliate-links/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /affiliate-links - Create new affiliate link (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const validatedData = AffiliateLinkCreateSchema.parse(req.body);

    const { data, error } = await supabase
      .from('affiliate_links')
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      console.error('Error creating affiliate link:', error);
      return res.status(500).json({ error: 'Failed to create affiliate link' });
    }

    // Invalidate cache
    await cacheSet('affiliate_links:*', null);
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('Error in POST /affiliate-links:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /affiliate-links/:id - Update affiliate link (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = AffiliateLinkUpdateSchema.parse(req.body);

    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('affiliate_links')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating affiliate link:', error);
      return res.status(500).json({ error: 'Failed to update affiliate link' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Affiliate link not found' });
    }

    // Invalidate cache
    await cacheSet('affiliate_links:*', null);
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('Error in PUT /affiliate-links/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /affiliate-links/:id - Delete affiliate link (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('affiliate_links')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting affiliate link:', error);
      return res.status(500).json({ error: 'Failed to delete affiliate link' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Affiliate link not found' });
    }

    // Invalidate cache
    await cacheSet('affiliate_links:*', null);
    res.json({ message: 'Affiliate link deleted successfully', id });
  } catch (err) {
    console.error('Error in DELETE /affiliate-links/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /affiliate-links/active - Get all active affiliate links with simplified fields
router.get('/active', async (req, res) => {
  try {
    console.log('GET /affiliate-links/active called');
    const cacheKey = 'active_affiliate_links_simplified';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log('Returning cached affiliate links:', Array.isArray(cached) ? cached.length : 'unknown');
      return res.json(cached);
    }

    const { data, error } = await supabase
      .from('affiliate_links')
      .select('id, name, url, provider, description')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching active affiliate links:', error);
      return res.status(500).json({ error: 'Failed to fetch active affiliate links' });
    }

    console.log('Fetched affiliate links from database:', Array.isArray(data) ? data.length : 0, 'records');
    await cacheSet(cacheKey, data, 300); // Cache for 5 minutes
    res.json(data);
  } catch (err) {
    console.error('Error in GET /affiliate-links/active:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
