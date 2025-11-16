-- Migration: Add tag_type column to tags table and modify constraints
-- This migration consolidates tags, cloud_tags, and seo_tags into a single tags table

-- Step 1: Add tag_type column to existing tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS tag_type text CHECK (tag_type IN ('regular', 'cloud', 'seo')) DEFAULT 'regular';

-- Step 2: Update existing tags to have 'regular' type
UPDATE tags SET tag_type = 'regular' WHERE tag_type IS NULL;

-- Step 3: Make tag_type NOT NULL after setting defaults
ALTER TABLE tags ALTER COLUMN tag_type SET NOT NULL;

-- Step 4: Modify slug column to be nullable for cloud and seo tags
ALTER TABLE tags ALTER COLUMN slug DROP NOT NULL;

-- Step 5: Add conditional constraints for slug based on tag_type
-- Remove existing unique constraint on slug
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_slug_key;

-- Add new conditional unique constraint for regular tags only
CREATE UNIQUE INDEX IF NOT EXISTS tags_slug_unique_regular 
ON tags (slug) 
WHERE tag_type = 'regular' AND slug IS NOT NULL;

-- Add constraint to ensure slug is NOT NULL for regular tags
ALTER TABLE tags ADD CONSTRAINT tags_regular_slug_required 
CHECK (
  (tag_type = 'regular' AND slug IS NOT NULL) OR 
  (tag_type IN ('cloud', 'seo') AND slug IS NULL)
);

-- Step 6: Migrate data from cloud_tags table if it exists
INSERT INTO tags (name, slug, description, tag_type, created_at, updated_at)
SELECT name, NULL as slug, description, 'cloud' as tag_type, created_at, updated_at
FROM cloud_tags
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cloud_tags')
ON CONFLICT (name) DO NOTHING;

-- Step 7: Migrate data from seo_tags table if it exists  
INSERT INTO tags (name, slug, description, tag_type, created_at, updated_at)
SELECT name, NULL as slug, meta::text as description, 'seo' as tag_type, created_at, updated_at
FROM seo_tags
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seo_tags')
ON CONFLICT (name) DO NOTHING;

-- Step 8: Add image_url column for tag images (simplified approach)
ALTER TABLE tags ADD COLUMN IF NOT EXISTS image_url text;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_tag_type ON tags (tag_type);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

-- Note: After running this migration, you may want to:
-- 1. Drop the cloud_tags and seo_tags tables if no longer needed
-- 2. Update application code to use the unified tags table
-- 3. Update any foreign key references to point to the unified tags table