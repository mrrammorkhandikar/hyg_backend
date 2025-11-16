-- Migration: Add blog_count field to authors table and create triggers for blog management

-- Add blog_count field to authors table
ALTER TABLE authors ADD COLUMN blog_count INTEGER DEFAULT 0;

-- Create function to update author blog information
CREATE OR REPLACE FUNCTION update_author_blog_info()
RETURNS TRIGGER AS $$
DECLARE
    author_username text;
    post_count integer;
    published_posts integer;
    blog_names text := '';
    counter integer := 1;
BEGIN
    -- Get the author from the affected post
    IF TG_OP = 'DELETE' THEN
        author_username := OLD.author;
    ELSE
        author_username := NEW.author;
    END IF;

    -- Skip if author is null or empty
    IF author_username IS NULL OR author_username = '' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Count total posts and published posts for this author
    SELECT
        COUNT(*)::integer,
        COUNT(*) FILTER (WHERE published = true)::integer
    INTO post_count, published_posts
    FROM posts
    WHERE author = author_username;

    -- Generate blog names string
    IF post_count > 0 THEN
        SELECT string_agg('"' || title || '"', ', ')
        INTO blog_names
        FROM posts
        WHERE author = author_username
        ORDER BY created_at;
    END IF;

    -- Update the author record
    UPDATE authors
    SET
        blog_count = post_count,
        blog_name = blog_names,
        status = CASE
            WHEN published_posts > 0 THEN 'publish'
            ELSE status
        END
    WHERE username = author_username;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on posts table
CREATE TRIGGER update_author_after_post_insert
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_author_blog_info();

CREATE TRIGGER update_author_after_post_update
    AFTER UPDATE ON posts
    FOR EACH ROW
    WHEN (OLD.author IS DISTINCT FROM NEW.author OR OLD.title IS DISTINCT FROM NEW.title OR OLD.published IS DISTINCT FROM NEW.published)
    EXECUTE FUNCTION update_author_blog_info();

CREATE TRIGGER update_author_after_post_delete
    AFTER DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_author_blog_info();

-- Initial update for existing posts
DO $$
DECLARE
    author_record RECORD;
    post_count integer;
    published_posts integer;
    blog_names text;
BEGIN
    FOR author_record IN SELECT username FROM authors LOOP
        -- Count posts for this author
        SELECT
            COUNT(*)::integer,
            COUNT(*) FILTER (WHERE published = true)::integer,
            string_agg('"' || title || '"', ', ')
        INTO post_count, published_posts, blog_names
        FROM posts
        WHERE author = author_record.username
        ORDER BY created_at;

        -- Update the author
        UPDATE authors
        SET
            blog_count = COALESCE(post_count, 0),
            blog_name = blog_names,
            status = CASE
                WHEN published_posts > 0 THEN 'publish'
                ELSE status
            END
        WHERE username = author_record.username;
    END LOOP;
END $$;
