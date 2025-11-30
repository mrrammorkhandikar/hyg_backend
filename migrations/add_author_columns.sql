-- Migration: Add authors_image and description columns to authors table
-- This migration adds the missing columns for author profile images and descriptions

-- Add authors_image column
ALTER TABLE authors ADD COLUMN IF NOT EXISTS authors_image TEXT;

-- Add description column
ALTER TABLE authors ADD COLUMN IF NOT EXISTS description TEXT;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added authors_image and description columns to authors table';
END $$;
