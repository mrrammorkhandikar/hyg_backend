-- Migration: Fix Row Level Security for authors table
-- This migration fixes RLS policies to allow admin operations using service role

-- Check if RLS is enabled, and if so, create proper policies for service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'authors' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    -- RLS not enabled, no need to do anything
    RAISE NOTICE 'RLS not enabled on authors table - no changes needed';
  ELSE
    -- RLS is enabled, create a policy for service role
    DROP POLICY IF EXISTS "Enable service role access" ON authors;

    CREATE POLICY "Enable service role access"
    ON authors
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'Service role policy created for authors table';
  END IF;
END $$;

-- Alternative approach: if problems persist, we can disable RLS
-- Note: Uncomment the lines below if you want to disable RLS instead
-- ALTER TABLE authors DISABLE ROW LEVEL SECURITY;
