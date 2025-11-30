-- Migration: Disable Row Level Security for authors table
-- This migration disables RLS on authors table to fix row-level security policy violations

-- Disable RLS on authors table - application handles authorization
ALTER TABLE authors DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for admins" ON authors;
DROP POLICY IF EXISTS "Enable authors to read own profile" ON authors;
DROP POLICY IF EXISTS "Enable authors to update own profile" ON authors;
DROP POLICY IF EXISTS "Enable service role access" ON authors;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS disabled on authors table - application-managed authorization';
END $$;
