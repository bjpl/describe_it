-- Migration: 003_create_images_table.sql
-- Description: Create images table for storing Unsplash image data
-- Created: 2025-08-28

-- Create images table for Unsplash image metadata
CREATE TABLE public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unsplash_id TEXT NOT NULL UNIQUE,
    url_regular TEXT NOT NULL,
    url_small TEXT NOT NULL,
    url_thumb TEXT NOT NULL,
    url_raw TEXT NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    color TEXT,
    blur_hash TEXT,
    alt_description TEXT,
    search_query TEXT NOT NULL,
    photographer_name TEXT NOT NULL,
    photographer_username TEXT NOT NULL,
    photographer_profile_url TEXT,
    download_location TEXT,
    tags TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    content_rating TEXT DEFAULT 'safe' CHECK (content_rating IN ('safe', 'moderate', 'explicit')),
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    success_rate DECIMAL(5,2) DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
    avg_completion_time INTEGER DEFAULT 0 CHECK (avg_completion_time >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    first_used_at TIMESTAMPTZ NULL,
    last_used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_images_unsplash_id ON public.images(unsplash_id);
CREATE INDEX idx_images_search_query ON public.images(search_query);
CREATE INDEX idx_images_photographer_username ON public.images(photographer_username);
CREATE INDEX idx_images_difficulty_level ON public.images(difficulty_level);
CREATE INDEX idx_images_content_rating ON public.images(content_rating);
CREATE INDEX idx_images_is_active ON public.images(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_images_usage_count ON public.images(usage_count DESC);
CREATE INDEX idx_images_success_rate ON public.images(success_rate DESC);
CREATE INDEX idx_images_tags ON public.images USING GIN(tags);
CREATE INDEX idx_images_categories ON public.images USING GIN(categories);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_images_last_used_at ON public.images(last_used_at DESC) WHERE last_used_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_images_active_difficulty ON public.images(is_active, difficulty_level) WHERE is_active = TRUE;
CREATE INDEX idx_images_search_difficulty ON public.images(search_query, difficulty_level, is_active) WHERE is_active = TRUE;

-- Full-text search index
CREATE INDEX idx_images_text_search ON public.images USING GIN(
    to_tsvector('english', 
        COALESCE(alt_description, '') || ' ' || 
        COALESCE(search_query, '') || ' ' ||
        array_to_string(COALESCE(tags, '{}'), ' ')
    )
);

-- Enable Row Level Security
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Images are publicly readable but only admin can modify
CREATE POLICY "Images are viewable by authenticated users" ON public.images
    FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Only admins can insert images" ON public.images
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (preferences->>'role')::text = 'admin'
        )
    );

CREATE POLICY "Only admins can update images" ON public.images
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (preferences->>'role')::text = 'admin'
        )
    );

-- Create function to update image statistics
CREATE OR REPLACE FUNCTION public.update_image_stats()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Update first_used_at if this is the first usage
    IF NEW.usage_count = 1 AND OLD.usage_count = 0 THEN
        NEW.first_used_at = NOW();
    END IF;
    
    -- Always update last_used_at when usage_count increases
    IF NEW.usage_count > OLD.usage_count THEN
        NEW.last_used_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update image statistics
CREATE TRIGGER update_image_stats_trigger
    BEFORE UPDATE ON public.images
    FOR EACH ROW EXECUTE FUNCTION public.update_image_stats();

-- Create function to increment image usage
CREATE OR REPLACE FUNCTION public.increment_image_usage(image_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.images 
    SET usage_count = usage_count + 1
    WHERE id = image_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update image success rate
CREATE OR REPLACE FUNCTION public.update_image_success_rate(
    image_id UUID,
    completion_time INTEGER,
    was_successful BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    current_avg INTEGER;
    current_count INTEGER;
BEGIN
    -- Get current statistics
    SELECT avg_completion_time, usage_count
    INTO current_avg, current_count
    FROM public.images
    WHERE id = image_id;
    
    -- Update average completion time
    IF current_count > 0 THEN
        UPDATE public.images
        SET avg_completion_time = ((current_avg * current_count) + completion_time) / (current_count + 1)
        WHERE id = image_id;
    ELSE
        UPDATE public.images
        SET avg_completion_time = completion_time
        WHERE id = image_id;
    END IF;
    
    -- Update success rate would require tracking successes/failures
    -- This is a simplified version - in practice you'd want to track success count
    IF was_successful THEN
        UPDATE public.images
        SET success_rate = LEAST(100, success_rate + 1)
        WHERE id = image_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.images TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_image_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_image_success_rate(UUID, INTEGER, BOOLEAN) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.images IS 'Unsplash images used in the Spanish learning app';
COMMENT ON COLUMN public.images.unsplash_id IS 'Unique identifier from Unsplash API';
COMMENT ON COLUMN public.images.search_query IS 'Original search query used to find this image';
COMMENT ON COLUMN public.images.difficulty_level IS 'Estimated difficulty for Spanish learners';
COMMENT ON COLUMN public.images.content_rating IS 'Content appropriateness rating';
COMMENT ON COLUMN public.images.usage_count IS 'Number of times this image has been used in sessions';
COMMENT ON COLUMN public.images.success_rate IS 'Percentage of successful completions for this image';
COMMENT ON COLUMN public.images.avg_completion_time IS 'Average time in seconds to complete descriptions for this image';
COMMENT ON COLUMN public.images.metadata IS 'Additional Unsplash metadata in JSON format';