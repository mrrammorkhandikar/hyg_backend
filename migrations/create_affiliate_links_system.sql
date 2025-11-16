-- Migration: Create Affiliate Links Management System
-- This migration creates tables for managing affiliate links associated with BLOCK images in posts

-- Step 1: Create affiliate_links table for managing affiliate link definitions
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Human-readable name for the affiliate link
  url TEXT NOT NULL, -- The actual affiliate URL
  provider TEXT NOT NULL, -- e.g., 'Amazon', 'eBay', 'Custom'
  description TEXT, -- Optional description of what this link is for
  is_active BOOLEAN DEFAULT true, -- Whether this link is currently active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create image_affiliate_associations table to link BLOCK images with affiliate links
CREATE TABLE IF NOT EXISTS image_affiliate_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL, -- References posts.id
  image_url TEXT NOT NULL, -- The URL/path of the BLOCK image in the post content
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  image_alt_text TEXT, -- Alt text of the associated image for identification
  position_in_post INTEGER, -- Order/position of the image in the post content
  is_active BOOLEAN DEFAULT true, -- Whether this association is currently active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique association per image per post
  UNIQUE(post_id, image_url)
);

-- Step 3: Enhance existing affiliate_clicks table with more detailed tracking
-- First, check if the table exists and add new columns if needed
DO $$
BEGIN
  -- Add new columns to affiliate_clicks if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_clicks' AND column_name = 'image_url') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN image_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_clicks' AND column_name = 'affiliate_link_id') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_clicks' AND column_name = 'session_id') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN session_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_clicks' AND column_name = 'referrer') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN referrer TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_clicks' AND column_name = 'device_type') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN device_type TEXT;
  END IF;
END $$;

-- Step 4: Create click_analytics_summary table for aggregated statistics
CREATE TABLE IF NOT EXISTS click_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  post_id UUID, -- Can be NULL for overall link statistics
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_clicks INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  mobile_clicks INTEGER DEFAULT 0,
  desktop_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique summary per link per post per date
  UNIQUE(affiliate_link_id, post_id, date)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_links_provider ON affiliate_links(provider);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_active ON affiliate_links(is_active);
CREATE INDEX IF NOT EXISTS idx_image_affiliate_post_id ON image_affiliate_associations(post_id);
CREATE INDEX IF NOT EXISTS idx_image_affiliate_link_id ON image_affiliate_associations(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_image_affiliate_active ON image_affiliate_associations(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link_id ON affiliate_clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_post_id ON affiliate_clicks(post_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date ON affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_click_analytics_link_date ON click_analytics_summary(affiliate_link_id, date);

-- Step 6: Create function to update analytics summary
CREATE OR REPLACE FUNCTION update_click_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily summary for the affiliate link
  INSERT INTO click_analytics_summary (
    affiliate_link_id, 
    post_id, 
    date, 
    total_clicks, 
    unique_sessions,
    mobile_clicks,
    desktop_clicks,
    updated_at
  )
  VALUES (
    NEW.affiliate_link_id,
    NEW.post_id,
    DATE(NEW.clicked_at),
    1,
    CASE WHEN NEW.session_id IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (affiliate_link_id, post_id, date)
  DO UPDATE SET
    total_clicks = click_analytics_summary.total_clicks + 1,
    unique_sessions = click_analytics_summary.unique_sessions + 
      CASE WHEN NEW.session_id IS NOT NULL AND 
        NOT EXISTS (
          SELECT 1 FROM affiliate_clicks 
          WHERE affiliate_link_id = NEW.affiliate_link_id 
          AND post_id = NEW.post_id 
          AND session_id = NEW.session_id 
          AND DATE(clicked_at) = DATE(NEW.clicked_at)
          AND id != NEW.id
        ) THEN 1 ELSE 0 END,
    mobile_clicks = click_analytics_summary.mobile_clicks + 
      CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    desktop_clicks = click_analytics_summary.desktop_clicks + 
      CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to automatically update analytics
DROP TRIGGER IF EXISTS trigger_update_click_analytics ON affiliate_clicks;
CREATE TRIGGER trigger_update_click_analytics
  AFTER INSERT ON affiliate_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_click_analytics();

-- Step 8: Create function to get click statistics
CREATE OR REPLACE FUNCTION get_affiliate_link_stats(
  link_id UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_clicks BIGINT,
  unique_sessions BIGINT,
  mobile_clicks BIGINT,
  desktop_clicks BIGINT,
  avg_daily_clicks NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cas.total_clicks), 0) as total_clicks,
    COALESCE(SUM(cas.unique_sessions), 0) as unique_sessions,
    COALESCE(SUM(cas.mobile_clicks), 0) as mobile_clicks,
    COALESCE(SUM(cas.desktop_clicks), 0) as desktop_clicks,
    CASE 
      WHEN COUNT(DISTINCT cas.date) > 0 
      THEN ROUND(COALESCE(SUM(cas.total_clicks), 0)::NUMERIC / COUNT(DISTINCT cas.date), 2)
      ELSE 0
    END as avg_daily_clicks
  FROM click_analytics_summary cas
  WHERE cas.affiliate_link_id = link_id
    AND (start_date IS NULL OR cas.date >= start_date)
    AND (end_date IS NULL OR cas.date <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Step 9: Insert sample affiliate links for testing
INSERT INTO affiliate_links (name, url, provider, description) VALUES
  ('Amazon Dental Products', 'https://amazon.com/dental-products', 'Amazon', 'General dental products on Amazon'),
  ('Oral-B Electric Toothbrush', 'https://amazon.com/oral-b-toothbrush', 'Amazon', 'Recommended electric toothbrush'),
  ('Dental Care Supplements', 'https://example-health.com/dental-supplements', 'Health Store', 'Nutritional supplements for dental health')
ON CONFLICT DO NOTHING;

-- Step 10: Add comments for documentation
COMMENT ON TABLE affiliate_links IS 'Stores affiliate link definitions that can be associated with images';
COMMENT ON TABLE image_affiliate_associations IS 'Links BLOCK images in posts to affiliate links';
COMMENT ON TABLE click_analytics_summary IS 'Aggregated daily statistics for affiliate link clicks';
COMMENT ON FUNCTION update_click_analytics() IS 'Automatically updates click analytics when new clicks are recorded';
COMMENT ON FUNCTION get_affiliate_link_stats(UUID, DATE, DATE) IS 'Returns aggregated statistics for an affiliate link within a date range';