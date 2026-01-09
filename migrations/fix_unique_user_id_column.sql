-- Fix unique_user_id column to be proper UUID type and add constraints

-- First, check if the column exists and is of correct type
DO $$
BEGIN
    -- If column exists but is TEXT, alter it to UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter_subscribers' 
        AND column_name = 'unique_user_id'
        AND data_type = 'text'
    ) THEN
        -- Create a temporary column for UUID
        ALTER TABLE newsletter_subscribers ADD COLUMN unique_user_id_temp UUID;
        
        -- Update the temp column with UUID cast from existing text values
        UPDATE newsletter_subscribers 
        SET unique_user_id_temp = unique_user_id::UUID 
        WHERE unique_user_id IS NOT NULL;
        
        -- Drop the old text column
        ALTER TABLE newsletter_subscribers DROP COLUMN unique_user_id;
        
        -- Rename the temp column to unique_user_id
        ALTER TABLE newsletter_subscribers RENAME COLUMN unique_user_id_temp TO unique_user_id;
        
        -- Add constraint to ensure valid UUID format (handled by UUID type)
        ALTER TABLE newsletter_subscribers 
        ADD CONSTRAINT unique_user_id_valid_uuid 
        CHECK (unique_user_id IS NULL OR unique_user_id = unique_user_id::TEXT);
        
        -- Add unique constraint on unique_user_id (excluding NULLs)
        ALTER TABLE newsletter_subscribers 
        ADD CONSTRAINT newsletter_subscribers_unique_user_id_key 
        UNIQUE (unique_user_id);
        
        -- Update indexes
        DROP INDEX IF EXISTS idx_newsletter_subscribers_unique_user_id;
        CREATE INDEX idx_newsletter_subscribers_unique_user_id 
        ON newsletter_subscribers(unique_user_id) 
        WHERE unique_user_id IS NOT NULL;
        
        -- Update policies to handle UUID type
        ALTER POLICY "Allow public insert to newsletter subscribers" ON newsletter_subscribers 
        USING (true);
        ALTER POLICY "Allow public update to newsletter subscribers" ON newsletter_subscribers 
        USING (true);
        
        RAISE NOTICE 'Successfully converted unique_user_id column to UUID type';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter_subscribers' 
        AND column_name = 'unique_user_id'
        AND data_type = 'uuid'
    ) THEN
        -- Column already exists as UUID, just ensure constraints
        -- Add constraint to ensure valid UUID format (handled by UUID type)
        ALTER TABLE newsletter_subscribers 
        ADD CONSTRAINT IF NOT EXISTS unique_user_id_valid_uuid 
        CHECK (unique_user_id IS NULL OR unique_user_id = unique_user_id::TEXT);
        
        -- Add unique constraint on unique_user_id (excluding NULLs)
        ALTER TABLE newsletter_subscribers 
        ADD CONSTRAINT IF NOT EXISTS newsletter_subscribers_unique_user_id_key 
        UNIQUE (unique_user_id);
        
        -- Update indexes
        DROP INDEX IF EXISTS idx_newsletter_subscribers_unique_user_id;
        CREATE INDEX idx_newsletter_subscribers_unique_user_id 
        ON newsletter_subscribers(unique_user_id) 
        WHERE unique_user_id IS NOT NULL;
        
        RAISE NOTICE 'unique_user_id column already exists as UUID, updated constraints';
    ELSE
        -- Column doesn't exist, add it as UUID
        ALTER TABLE newsletter_subscribers 
        ADD COLUMN unique_user_id UUID;
        
        -- Add constraint to ensure valid UUID format
        ALTER TABLE newsletter_subscribers 
        ADD CONSTRAINT unique_user_id_valid_uuid 
        CHECK (unique_user_id IS NULL OR unique_user_id = unique_user_id::TEXT);
        
        -- Add unique constraint on unique_user_id (excluding NULLs)
        ALTER TABLE newsletter_subscribers 
        ADD CONSTRAINT newsletter_subscribers_unique_user_id_key 
        UNIQUE (unique_user_id);
        
        -- Create index for unique_user_id lookups
        CREATE INDEX idx_newsletter_subscribers_unique_user_id 
        ON newsletter_subscribers(unique_user_id) 
        WHERE unique_user_id IS NOT NULL;
        
        RAISE NOTICE 'Successfully added unique_user_id column as UUID';
    END IF;
END $$;

-- Verify the column exists and is correct type
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
