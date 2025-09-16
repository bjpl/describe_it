-- Migration: 011_create_user_api_keys_table.sql
-- Description: Create user API keys table for secure storage of external API keys
-- Created: 2025-09-10

-- Create user_api_keys table for storing encrypted API keys per user
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Encrypted API keys
    unsplash_key TEXT,
    openai_key TEXT,
    anthropic_key TEXT,
    google_key TEXT,
    
    -- Metadata
    encrypted BOOLEAN DEFAULT true,
    encryption_method TEXT DEFAULT 'aes-256-gcm',
    
    -- Usage tracking
    unsplash_last_used TIMESTAMPTZ,
    openai_last_used TIMESTAMPTZ,
    anthropic_last_used TIMESTAMPTZ,
    google_last_used TIMESTAMPTZ,
    
    -- Rate limiting info
    unsplash_requests_today INTEGER DEFAULT 0,
    openai_requests_today INTEGER DEFAULT 0,
    anthropic_requests_today INTEGER DEFAULT 0,
    google_requests_today INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one set of keys per user
    CONSTRAINT unique_user_api_keys UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_updated_at ON public.user_api_keys(updated_at);

-- Enable Row Level Security
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own API keys
CREATE POLICY "Users can view their own API keys" ON public.user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON public.user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON public.user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to reset daily request counts
CREATE OR REPLACE FUNCTION public.reset_api_request_counts()
RETURNS void AS $$
BEGIN
    UPDATE public.user_api_keys
    SET 
        unsplash_requests_today = 0,
        openai_requests_today = 0,
        anthropic_requests_today = 0,
        google_requests_today = 0,
        updated_at = NOW()
    WHERE 
        unsplash_requests_today > 0 OR
        openai_requests_today > 0 OR
        anthropic_requests_today > 0 OR
        google_requests_today > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment request count
CREATE OR REPLACE FUNCTION public.increment_api_request_count(
    p_user_id UUID,
    p_api_service TEXT
)
RETURNS void AS $$
BEGIN
    CASE p_api_service
        WHEN 'unsplash' THEN
            UPDATE public.user_api_keys
            SET 
                unsplash_requests_today = unsplash_requests_today + 1,
                unsplash_last_used = NOW(),
                updated_at = NOW()
            WHERE user_id = p_user_id;
        WHEN 'openai' THEN
            UPDATE public.user_api_keys
            SET 
                openai_requests_today = openai_requests_today + 1,
                openai_last_used = NOW(),
                updated_at = NOW()
            WHERE user_id = p_user_id;
        WHEN 'anthropic' THEN
            UPDATE public.user_api_keys
            SET 
                anthropic_requests_today = anthropic_requests_today + 1,
                anthropic_last_used = NOW(),
                updated_at = NOW()
            WHERE user_id = p_user_id;
        WHEN 'google' THEN
            UPDATE public.user_api_keys
            SET 
                google_requests_today = google_requests_today + 1,
                google_last_used = NOW(),
                updated_at = NOW()
            WHERE user_id = p_user_id;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON public.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_api_keys TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_api_request_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_api_request_count(UUID, TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_api_keys IS 'Secure storage for user API keys with encryption';
COMMENT ON COLUMN public.user_api_keys.user_id IS 'Reference to the user who owns these API keys';
COMMENT ON COLUMN public.user_api_keys.encrypted IS 'Whether the keys are encrypted';
COMMENT ON COLUMN public.user_api_keys.encryption_method IS 'Encryption method used for storing keys';
COMMENT ON FUNCTION public.reset_api_request_counts() IS 'Reset daily API request counts - should be called daily via cron';
COMMENT ON FUNCTION public.increment_api_request_count(UUID, TEXT) IS 'Increment request count for a specific API service';

-- Create a scheduled job to reset counts daily (requires pg_cron extension)
-- Note: This needs to be run by a superuser or configured in Supabase dashboard
-- SELECT cron.schedule('reset-api-counts', '0 0 * * *', 'SELECT public.reset_api_request_counts();');