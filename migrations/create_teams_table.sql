CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  title text,
  description text,
  socialmedia jsonb DEFAULT '[]'::jsonb, -- store social links as JSON array/object
  image text,                             -- URL or storage path
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: trigger to auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_timestamp ON public.teams;
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
