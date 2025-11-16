import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { supabase } from '../db/supabaseClient';
dotenv.config();

const router = express.Router();

// Use environment credentials, fallback to defaults for dev
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'DrBushraMirza';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';
const JWT_SECRET = process.env.JWT_SECRET || process.env.COOKIE_SECRET || 'dev-insecure-secret';

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // Check if admin login
    if (role === 'admin' || !role) {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('id, username, password_hash, email')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('Admin lookup error:', error);
        return res.status(500).json({ message: 'Database error during admin lookup' });
      }

      if (admin && await bcrypt.compare(password, admin.password_hash)) {
        const token = jwt.sign({
          id: admin.id,
          username: admin.username,
          role: 'admin',
          email: admin.email
        }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({ token, role: 'admin' });
      }
    }

    // FOR TESTING: Allow login as 'testauthor' with any password
    if (username === 'testauthor') {
      const token = jwt.sign({
        id: 'test-id',
        username: 'testauthor',
        role: 'author',
        authorName: 'Test Author'
      }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, role: 'author' });
    }

    // Check if author login (only if not handled above)
    if (role === 'author' || !role) {
      const { data: author, error } = await supabase
        .from('authors')
        .select('id, username, password, blog_name, status')
        .eq('username', username)
        
        .maybeSingle();

      if (error) {
        console.error('Author lookup error:', error);
        return res.status(500).json({ message: 'Database error during author lookup' });
      }

      if (!author) {
        return res.status(401).json({ message: 'Author not found ' });
      }

      const isValidPassword = await bcrypt.compare(password, author.password);
      if (isValidPassword) {
        const token = jwt.sign({
          id: author.id,
          username: author.username,
          role: 'author',
          authorName: author.blog_name || author.username
        }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({ token, role: 'author' });
      }
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error: auth misconfiguration' });
  }
});

export default router;
