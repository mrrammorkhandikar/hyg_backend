-- Add scheduling column to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS shedule_publish TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.posts.shedule_publish IS 'Scheduled publish timestamp for future publishing';
