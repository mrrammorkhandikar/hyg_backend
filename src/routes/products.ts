import express from 'express'
import { supabase } from '../db/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../middleware/requireAdmin'

// Supabase admin client (service role) - for admin operations
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const router = express.Router()

export type Product = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  price_numeric: number | null;
  price_text: string | null;
  images: any[] | null; // JSONB array of { bucket, path, alt, order }
  preview_pdf: string | null;
  buy_link: string | null;
  features: any[] | null; // JSONB array of strings
  metadata: any | null; // JSONB
  created_at: string;
  updated_at: string;
};

// GET /products - List all products (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/published - List published products (Public)
router.get('/published', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id - Get single product (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products - Create new product (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      price_numeric,
      price_text,
      images,
      preview_pdf,
      buy_link,
      features,
      metadata
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
        title,
        author: author || null,
        description: description || null,
        price_numeric: price_numeric || null,
        price_text: price_text || null,
        images: images || [],
        preview_pdf: preview_pdf || null,
        buy_link: buy_link || null,
        features: features || [],
        metadata: metadata || {}
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /products/:id - Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      description,
      price_numeric,
      price_text,
      images,
      preview_pdf,
      buy_link,
      features,
      metadata
    } = req.body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (author !== undefined) updatePayload.author = author;
    if (description !== undefined) updatePayload.description = description;
    if (price_numeric !== undefined) updatePayload.price_numeric = price_numeric;
    if (price_text !== undefined) updatePayload.price_text = price_text;
    if (images !== undefined) updatePayload.images = images;
    if (preview_pdf !== undefined) updatePayload.preview_pdf = preview_pdf;
    if (buy_link !== undefined) updatePayload.buy_link = buy_link;
    if (features !== undefined) updatePayload.features = features;
    if (metadata !== undefined) updatePayload.metadata = metadata;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /products/:id - Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products/rate - Rate a product
router.post('/rate', async (req, res) => {
  console.log('POST /products/rate called with body:', req.body);
  try {
    const { product_id, user_id, username, email, rating } = req.body;

    if (!product_id || !user_id || rating === undefined) {
      return res.status(400).json({ error: 'product_id, user_id, and rating are required' });
    }

    if (rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    // Get current product ratings
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('rating')
      .eq('id', product_id)
      .single();

    if (fetchError) {
      console.error('Error fetching product:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }

    let currentRatings = product.rating || [];

    // Find existing rating for this user
    const existingRatingIndex = currentRatings.findIndex((r: any) => r.user_id === user_id);

    if (existingRatingIndex >= 0) {
      // Update existing rating
      currentRatings[existingRatingIndex] = {
        user_id,
        username: username || currentRatings[existingRatingIndex].username,
        email: email || currentRatings[existingRatingIndex].email,
        rated: rating,
        updated_at: new Date().toISOString()
      };
    } else {
      // Add new rating
      currentRatings.push({
        user_id,
        username: username || '',
        email: email || '',
        rated: rating,
        created_at: new Date().toISOString()
      });
    }

    // Update product with new ratings
    const { error: updateError } = await supabase
      .from('products')
      .update({ rating: currentRatings, updated_at: new Date().toISOString() })
      .eq('id', product_id);

    if (updateError) {
      console.error('Error updating rating:', updateError);
      return res.status(500).json({ error: 'Failed to update rating' });
    }

    // Calculate average rating
    const averageRating = currentRatings.length > 0
      ? currentRatings.reduce((sum: number, r: any) => sum + r.rated, 0) / currentRatings.length
      : 0;

    console.log(`Rating recorded for user ${user_id} on product ${product_id}: ${rating}`);

    res.json({
      success: true,
      product_id,
      user_id,
      rating,
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      total_ratings: currentRatings.length
    });
  } catch (err) {
    console.error('Rating operation failed:', err);
    return res.status(500).json({ error: 'Rating recording failed' });
  }
});

// GET /products/rating/:productId/:userId - Get user's rating for a product
router.get('/rating/:productId/:userId', async (req, res) => {
  try {
    const { productId, userId } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('rating')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching product rating:', error);
      return res.json({ user_rating: null, average_rating: 0, total_ratings: 0 });
    }

    const ratings = product.rating || [];
    const userRating = ratings.find((r: any) => r.user_id === userId);

    // Calculate average rating
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + r.rated, 0) / ratings.length
      : 0;

    res.json({
      user_rating: userRating ? userRating.rated : null,
      average_rating: Math.round(averageRating * 10) / 10,
      total_ratings: ratings.length
    });
  } catch (err) {
    console.error('Get rating operation failed:', err);
    res.json({ user_rating: null, average_rating: 0, total_ratings: 0 });
  }
});

// GET /products/rating/:productId - Get rating summary for a product
router.get('/rating/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('rating')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching product rating summary:', error);
      return res.json({ average_rating: 0, total_ratings: 0 });
    }

    const ratings = product.rating || [];

    // Calculate average rating
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + r.rated, 0) / ratings.length
      : 0;

    res.json({
      average_rating: Math.round(averageRating * 10) / 10,
      total_ratings: ratings.length
    });
  } catch (err) {
    console.error('Get rating summary operation failed:', err);
    res.json({ average_rating: 0, total_ratings: 0 });
  }
});

export default router
