-- Create comments table with unique_user_id
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  post_id uuid NOT NULL,
  comment text NOT NULL,
  liked boolean NULL DEFAULT false,
  email text NULL,
  username text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  unique_user_id uuid NULL,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  unique_user_id uuid NULL,
  username text NULL,
  email text NULL,
  subject text NULL,
  message text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  "like" integer NOT NULL DEFAULT 0,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments USING btree (post_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_comments_unique_user_id ON public.comments USING btree (unique_user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_contact_messages_unique_user_id ON public.contact_messages USING btree (unique_user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_contact_messages_like ON public.contact_messages USING btree ("like") TABLESPACE pg_default;
