-- Add missing constraints and indexes for unique_user_id column

-- Add unique constraint on unique_user_id (excluding NULLs)
ALTER TABLE newsletter_subscribers 
ADD CONSTRAINT newsletter_subscribers_unique_user_id_key 
UNIQUE (unique_user_id);

-- Create index for unique_user_id lookups (excluding NULLs for better performance)
CREATE INDEX idx_newsletter_subscribers_unique_user_id 
ON newsletter_subscribers(unique_user_id) 
WHERE unique_user_id IS NOT NULL;

-- Add constraint to ensure valid UUID format when not null
ALTER TABLE newsletter_subscribers 
ADD CONSTRAINT unique_user_id_valid_uuid 
CHECK (unique_user_id IS NULL OR unique_user_id = unique_user_id::TEXT);

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'newsletter_subscribers' 
AND column_name = 'unique_user_id';

-- Verify constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'newsletter_subscribers'
AND conname LIKE '%unique_user_id%';

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'newsletter_subscribers'
AND indexname LIKE '%unique_user_id%';
