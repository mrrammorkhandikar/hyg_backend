-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  unique_user_id TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- Create index for unique_user_id lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unique_user_id ON newsletter_subscribers(unique_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to newsletter subscribers"
ON newsletter_subscribers FOR SELECT
USING (true);

-- Create policy for public insert access
CREATE POLICY "Allow public insert to newsletter subscribers"
ON newsletter_subscribers FOR INSERT
WITH CHECK (true);

-- Create policy for public update access
CREATE POLICY "Allow public update to newsletter subscribers"
ON newsletter_subscribers FOR UPDATE
USING (true)
WITH CHECK (true);
