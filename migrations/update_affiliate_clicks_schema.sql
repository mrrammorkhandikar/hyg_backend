-- Migration: Update affiliate_clicks table schema
-- This migration adds missing columns to the existing affiliate_clicks table
-- to properly integrate with the affiliate links management system

-- Step 1: Add missing columns to affiliate_clicks table
DO $$
BEGIN
  -- Add image_url column to track which specific image was clicked
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'affiliate_clicks' AND column_name = 'image_url') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN image_url TEXT;
    COMMENT ON COLUMN affiliate_clicks.image_url IS 'URL of the specific image that was clicked';
  END IF;
  
  -- Add affiliate_link_id foreign key to link to affiliate_links table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'affiliate_clicks' AND column_name = 'affiliate_link_id') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN affiliate_link_id UUID;
    COMMENT ON COLUMN affiliate_clicks.affiliate_link_id IS 'Foreign key reference to affiliate_links table';
  END IF;
  
  -- Add session_id for tracking unique sessions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'affiliate_clicks' AND column_name = 'session_id') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN session_id TEXT;
    COMMENT ON COLUMN affiliate_clicks.session_id IS 'Session identifier for tracking unique user sessions';
  END IF;
  
  -- Add referrer to track where the click came from
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'affiliate_clicks' AND column_name = 'referrer') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN referrer TEXT;
    COMMENT ON COLUMN affiliate_clicks.referrer IS 'HTTP referrer header indicating source of the click';
  END IF;
  
  -- Add device_type to distinguish between mobile/desktop clicks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'affiliate_clicks' AND column_name = 'device_type') THEN
    ALTER TABLE affiliate_clicks ADD COLUMN device_type TEXT;
    COMMENT ON COLUMN affiliate_clicks.device_type IS 'Device type: mobile, desktop, tablet, etc.';
  END IF;
END $$;

-- Step 2: Add foreign key constraint for affiliate_link_id (if affiliate_links table exists)
DO $$
BEGIN
  -- Check if affiliate_links table exists before adding foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_links') THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'affiliate_clicks_affiliate_link_id_fkey') THEN
      ALTER TABLE affiliate_clicks 
      ADD CONSTRAINT affiliate_clicks_affiliate_link_id_fkey 
      FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_link_id ON affiliate_clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_session_id ON affiliate_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_device_type ON affiliate_clicks(device_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_image_url ON affiliate_clicks(image_url);

-- Step 4: Update existing records to populate affiliate_link_id based on affiliate_provider
-- This attempts to match existing clicks with affiliate links by provider name
DO $$
BEGIN
  -- Only update if affiliate_links table exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_links') THEN
    UPDATE affiliate_clicks 
    SET affiliate_link_id = al.id
    FROM affiliate_links al
    WHERE affiliate_clicks.affiliate_link_id IS NULL
      AND affiliate_clicks.affiliate_provider IS NOT NULL
      AND LOWER(al.provider) = LOWER(affiliate_clicks.affiliate_provider);
  END IF;
END $$;

-- Step 5: Add check constraint for device_type values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                 WHERE constraint_name = 'affiliate_clicks_device_type_check') THEN
    ALTER TABLE affiliate_clicks 
    ADD CONSTRAINT affiliate_clicks_device_type_check 
    CHECK (device_type IS NULL OR device_type IN ('mobile', 'desktop', 'tablet', 'unknown'));
  END IF;
END $$;

-- Step 6: Update table comment
COMMENT ON TABLE affiliate_clicks IS 'Records of affiliate link clicks with detailed tracking information including device type, session, and referrer data';

-- Step 7: Create or update the trigger function for analytics (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_click_analytics_from_clicks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if we have the necessary tables and columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'click_analytics_summary') 
     AND NEW.affiliate_link_id IS NOT NULL THEN
    
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
  END IF;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                 WHERE trigger_name = 'trigger_update_click_analytics_from_clicks') THEN
    CREATE TRIGGER trigger_update_click_analytics_from_clicks
      AFTER INSERT ON affiliate_clicks
      FOR EACH ROW
      EXECUTE FUNCTION update_click_analytics_from_clicks();
  END IF;
END $$;

-- Migration completed
SELECT 'affiliate_clicks table schema update completed successfully' as result;