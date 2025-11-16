-- Migration: Create authors table
-- This migration creates the authors table for the blog management system

CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  blog JSONB,
  blog_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('publish', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT
);

-- Create constraints
ALTER TABLE authors ADD CONSTRAINT authors_pkey PRIMARY KEY (id);
ALTER TABLE authors ADD CONSTRAINT authors_username_key UNIQUE (username);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_authors_username ON authors (username);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_authors_updated_at
    BEFORE UPDATE ON authors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
