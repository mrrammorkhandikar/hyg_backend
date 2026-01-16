import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { supabase } from '../db/supabaseClient';
import { sendEmail } from '../utils/sendEmail';
dotenv.config();

const router = express.Router();

// Use environment credentials, fallback to defaults for dev
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'DrBushraMirza';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';
const JWT_SECRET = process.env.JWT_SECRET || process.env.COOKIE_SECRET || 'dev-insecure-secret';

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number; email: string }>();

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

// Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;

  try {
    // Find admin by username
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, email')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Admin lookup error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStore.set(username, { otp, expiresAt, email: admin.email });

    // Send email with OTP
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset OTP</h2>
        <p>Hello ${username},</p>
        <p>You have requested to reset your password for the HygieneShelf admin panel.</p>
        <p>Your OTP is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>HygieneShelf Team</p>
      </div>
    `;

    await sendEmail({
      to: admin.email,
      subject: 'Password Reset OTP - HygieneShelf Admin',
      html,
      text: `Your OTP for password reset is: ${otp}. This OTP will expire in 10 minutes.`
    });

    res.json({ message: 'OTP sent to your registered email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;

  try {
    const storedOtpData = otpStore.get(username);

    if (!storedOtpData) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(username);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP is valid, keep it for password reset
    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { username, otp, newPassword } = req.body;

  try {
    const storedOtpData = otpStore.get(username);

    if (!storedOtpData) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(username);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error } = await supabase
      .from('admins')
      .update({ password_hash: hashedPassword })
      .eq('username', username);

    if (error) {
      console.error('Password update error:', error);
      return res.status(500).json({ message: 'Failed to update password' });
    }

    // Clear OTP
    otpStore.delete(username);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

export default router;
