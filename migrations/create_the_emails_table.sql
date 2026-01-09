-- Create the_emails table for email management
CREATE TABLE IF NOT EXISTS public.the_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('Welcome', 'New Post', 'Newsletter', 'Template', 'Other')),
  the_mail jsonb NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Sent')),
  emails jsonb,
  scheduled_time timestamptz,
  sent_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_the_emails_status ON public.the_emails(status);
CREATE INDEX IF NOT EXISTS idx_the_emails_type ON public.the_emails(type);
CREATE INDEX IF NOT EXISTS idx_the_emails_scheduled_time ON public.the_emails(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_the_emails_created_at ON public.the_emails(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.the_emails ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin full access to emails" ON public.the_emails
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.authors 
      WHERE authors.email = auth.jwt() ->> 'email' 
      AND authors.role = 'admin'
    )
  );

-- Create policies for author access (read-only for their own content)
CREATE POLICY "Authors can view emails" ON public.the_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.authors 
      WHERE authors.email = auth.jwt() ->> 'email'
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.the_emails TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
