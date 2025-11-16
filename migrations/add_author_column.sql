-- Migration: Add author column to posts table
-- This migration adds the missing author column that is expected by the application

-- Add author column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text;

-- Add index for author column for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author);

-- Update any existing posts to have a default author if needed
-- UPDATE posts SET author = 'Admin' WHERE author IS NULL;

-- Note: After running this migration:
-- 1. The author column will be available for new posts
-- 2. Existing posts will have NULL author values unless updated
-- 3. The backend PostCreateSchema already includes author as optional
-- 4. The frontend can now successfully send author data