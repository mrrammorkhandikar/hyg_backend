import express from 'express'
import bcrypt from 'bcrypt'
import { supabase } from '../db/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, requireAuthenticated, UserPayload } from '../middleware/requireAdmin'

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

export type Author = {
  id: string;
  username: string;
  password: string; // Hashed
  blog: any | null; // JSON
  blog_name: string | null;
  status: 'publish' | 'draft' | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  authers_image: string | null;
  description: string | null;
  title: string | null;
  socialmedia: any[] | null;
};

// GET /authors - List published authors (Public)
router.get('/published', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('authors')
      .select('id, username, blog_name, email, authers_image, description, title, socialmedia')
      .eq('status', 'publish')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /authors - List all authors (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('authors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /authors/:id - Get single author (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('authors')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Author not found' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /authors - Create new author (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, password, email, blog, blog_name, status = 'draft', authers_image, description, title, socialmedia } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabaseAdmin
      .from('authors')
      .insert([{
        username,
        password: hashedPassword,
        email: email || null,
        blog: blog || null,
        blog_name: blog_name || null,
        status: status || 'draft',
        authers_image: authers_image || null,
        description: description || null,
        title: title || null,
        socialmedia: socialmedia || []
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /authors/:id - Update author (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, blog, blog_name, status, authers_image, description, title, socialmedia } = req.body;

    const updatePayload: any = {};
    if (username) updatePayload.username = username;
    if (email !== undefined) updatePayload.email = email;
    if (blog !== undefined) updatePayload.blog = blog;
    if (blog_name !== undefined) updatePayload.blog_name = blog_name;
    if (status !== undefined) updatePayload.status = status;
    if (authers_image !== undefined) updatePayload.authers_image = authers_image;
    if (description !== undefined) updatePayload.description = description;
    if (title !== undefined) updatePayload.title = title;
    if (socialmedia !== undefined) updatePayload.socialmedia = socialmedia;

    if (password) {
      updatePayload.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabaseAdmin
      .from('authors')
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

// DELETE /authors/:id - Delete author (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('authors').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /authors/me - Get current user's profile (Authenticated users)
router.get('/me', requireAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user as UserPayload;

    if (!user.id) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    if (user.role === 'admin') {
      // Get admin profile
      const { data, error } = await supabase
        .from('admins')
        .select('id, username, email, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Admin profile not found' });

      res.json({ ...data, role: 'admin' });
    } else if (user.role === 'author') {
      // Get author profile
      const { data, error } = await supabase
        .from('authors')
        .select('id, username, blog, blog_name, status, email, created_at, updated_at, authers_image, description, title')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Author not found' });

      res.json(data);
    } else {
      return res.status(403).json({ error: 'Invalid user role' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /authors/me - Update current user's profile (Authenticated users)
router.put('/me', requireAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user as UserPayload;

    if (!user.id) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    const { email, password, blog_name, authers_image, description } = req.body;

    if (user.role === 'admin') {
      // Update admin profile
      const updatePayload: any = {};
      if (email !== undefined) updatePayload.email = email;
      if (password) {
        updatePayload.password_hash = await bcrypt.hash(password, 10);
      }

      const { data, error } = await supabase
        .from('admins')
        .update(updatePayload)
        .eq('id', user.id)
        .select('id, username, email, created_at')
        .single();

      if (error) throw error;
      res.json({ ...data, role: 'admin' });
    } else if (user.role === 'author') {
      // Update author profile
      const updatePayload: any = {};
      if (blog_name !== undefined) updatePayload.blog_name = blog_name;
      if (email !== undefined) updatePayload.email = email;
      if (authers_image !== undefined) updatePayload.authers_image = authers_image;
      if (description !== undefined) updatePayload.description = description;
      if (password) {
        updatePayload.password = await bcrypt.hash(password, 10);
      }

      const { data, error } = await supabase
        .from('authors')
        .update(updatePayload)
        .eq('id', user.id)
        .select('id, username, blog, blog_name, status, email, created_at, updated_at')
        .single();

      if (error) throw error;
      res.json(data);
    } else {
      return res.status(403).json({ error: 'Invalid user role' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router
