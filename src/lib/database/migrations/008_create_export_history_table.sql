-- Migration: 008_create_export_history_table.sql
-- Description: Create export_history table for tracking data exports
-- Created: 2025-08-28

-- Create export_history table for tracking user data exports
CREATE TABLE public.export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL CHECK (export_type IN (
        'vocabulary', 'progress', 'sessions', 'descriptions', 'questions',
        'full_data', 'learning_report', 'achievement_summary', 'custom'
    )),
    export_format TEXT NOT NULL DEFAULT 'json' CHECK (export_format IN (
        'json', 'csv', 'pdf', 'xlsx', 'txt', 'xml'
    )),
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER DEFAULT 0 CHECK (file_size_bytes >= 0),
    download_url TEXT,
    export_status TEXT DEFAULT 'pending' CHECK (export_status IN (
        'pending', 'processing', 'completed', 'failed', 'expired'
    )),
    date_range_start DATE,
    date_range_end DATE,
    filters_applied JSONB DEFAULT '{}'::jsonb,
    include_personal_data BOOLEAN DEFAULT TRUE,
    include_progress_data BOOLEAN DEFAULT TRUE,
    include_content_data BOOLEAN DEFAULT FALSE, -- Images, descriptions text
    export_settings JSONB DEFAULT '{}'::jsonb,
    processing_started_at TIMESTAMPTZ NULL,
    processing_completed_at TIMESTAMPTZ NULL,
    download_count INTEGER DEFAULT 0 CHECK (download_count >= 0),
    first_downloaded_at TIMESTAMPTZ NULL,
    last_downloaded_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- Downloads expire after 7 days
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX idx_export_history_export_type ON public.export_history(export_type);
CREATE INDEX idx_export_history_export_format ON public.export_history(export_format);
CREATE INDEX idx_export_history_export_status ON public.export_history(export_status);
CREATE INDEX idx_export_history_created_at ON public.export_history(created_at DESC);
CREATE INDEX idx_export_history_expires_at ON public.export_history(expires_at) WHERE export_status = 'completed';
CREATE INDEX idx_export_history_date_range ON public.export_history(date_range_start, date_range_end);
CREATE INDEX idx_export_history_processing_completed ON public.export_history(processing_completed_at DESC) WHERE processing_completed_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_export_history_user_status ON public.export_history(user_id, export_status, created_at DESC);
CREATE INDEX idx_export_history_user_type ON public.export_history(user_id, export_type, created_at DESC);
CREATE INDEX idx_export_history_active_exports ON public.export_history(user_id, export_status, expires_at) 
    WHERE export_status = 'completed' AND expires_at > NOW();

-- Enable Row Level Security
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own export history" ON public.export_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export requests" ON public.export_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export requests" ON public.export_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update export status and timestamps
CREATE OR REPLACE FUNCTION public.update_export_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update processing timestamps based on status changes
    IF NEW.export_status = 'processing' AND OLD.export_status != 'processing' THEN
        NEW.processing_started_at = NOW();
    END IF;
    
    IF NEW.export_status = 'completed' AND OLD.export_status != 'completed' THEN
        NEW.processing_completed_at = NOW();
        -- Set expiration date if not already set
        IF NEW.expires_at IS NULL THEN
            NEW.expires_at = NOW() + INTERVAL '7 days';
        END IF;
    END IF;
    
    -- Update download tracking
    IF NEW.download_count > OLD.download_count THEN
        NEW.last_downloaded_at = NOW();
        -- Set first download time if this is the first download
        IF OLD.download_count = 0 THEN
            NEW.first_downloaded_at = NOW();
        END IF;
    END IF;
    
    -- Auto-expire old exports
    IF NEW.export_status = 'completed' AND NEW.expires_at < NOW() THEN
        NEW.export_status = 'expired';
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for export status updates
CREATE TRIGGER update_export_status_trigger
    BEFORE UPDATE ON public.export_history
    FOR EACH ROW EXECUTE FUNCTION public.update_export_status();

-- Create function to request data export
CREATE OR REPLACE FUNCTION public.request_data_export(
    user_uuid UUID,
    export_type_param TEXT,
    export_format_param TEXT DEFAULT 'json',
    date_start DATE DEFAULT NULL,
    date_end DATE DEFAULT NULL,
    export_settings_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    export_id UUID;
    file_name_val TEXT;
BEGIN
    -- Generate filename
    file_name_val := format('%s_%s_%s_%s',
        export_type_param,
        user_uuid::TEXT,
        EXTRACT(EPOCH FROM NOW())::TEXT,
        export_format_param
    );
    
    -- Check if user has too many pending exports (max 5)
    IF (SELECT COUNT(*) FROM public.export_history 
        WHERE user_id = user_uuid 
        AND export_status IN ('pending', 'processing')) >= 5 THEN
        RAISE EXCEPTION 'Maximum number of concurrent exports exceeded';
    END IF;
    
    -- Create export request
    INSERT INTO public.export_history (
        user_id,
        export_type,
        export_format,
        file_name,
        date_range_start,
        date_range_end,
        export_settings,
        export_status
    ) VALUES (
        user_uuid,
        export_type_param,
        export_format_param,
        file_name_val,
        date_start,
        date_end,
        export_settings_param,
        'pending'
    )
    RETURNING id INTO export_id;
    
    RETURN export_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired exports
CREATE OR REPLACE FUNCTION public.cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Update expired exports
    UPDATE public.export_history 
    SET 
        export_status = 'expired',
        updated_at = NOW()
    WHERE export_status = 'completed' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Optional: Delete very old export records (older than 90 days)
    DELETE FROM public.export_history
    WHERE export_status = 'expired'
    AND updated_at < NOW() - INTERVAL '90 days';
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user export statistics
CREATE OR REPLACE FUNCTION public.get_user_export_stats(
    user_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_exports INTEGER,
    completed_exports INTEGER,
    total_downloads INTEGER,
    exports_by_type JSONB,
    exports_by_format JSONB,
    recent_activity JSONB,
    storage_used_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_exports,
        COUNT(*) FILTER (WHERE eh.export_status = 'completed')::INTEGER as completed_exports,
        SUM(eh.download_count)::INTEGER as total_downloads,
        jsonb_object_agg(
            eh.export_type,
            COUNT(*) FILTER (WHERE eh.export_type IS NOT NULL)
        ) as exports_by_type,
        jsonb_object_agg(
            eh.export_format,
            COUNT(*) FILTER (WHERE eh.export_format IS NOT NULL)
        ) as exports_by_format,
        jsonb_build_object(
            'exports_last_7_days', COUNT(*) FILTER (WHERE eh.created_at > NOW() - INTERVAL '7 days'),
            'downloads_last_7_days', SUM(eh.download_count) FILTER (WHERE eh.last_downloaded_at > NOW() - INTERVAL '7 days'),
            'avg_file_size_mb', ROUND(AVG(eh.file_size_bytes) / (1024.0 * 1024.0), 2)
        ) as recent_activity,
        SUM(eh.file_size_bytes) FILTER (WHERE eh.export_status = 'completed' AND eh.expires_at > NOW()) as storage_used_bytes
    FROM public.export_history eh
    WHERE eh.user_id = user_uuid
    AND eh.created_at > (NOW() - (days_back || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get exportable data for a user
CREATE OR REPLACE FUNCTION public.get_exportable_data_info(user_uuid UUID)
RETURNS TABLE (
    vocabulary_phrases INTEGER,
    learning_sessions INTEGER,
    descriptions_created INTEGER,
    questions_answered INTEGER,
    progress_records INTEGER,
    date_range_start DATE,
    date_range_end DATE,
    estimated_file_size_kb INTEGER
) AS $$
DECLARE
    phrase_count INTEGER;
    session_count INTEGER;
    desc_count INTEGER;
    question_count INTEGER;
    progress_count INTEGER;
    first_activity DATE;
    last_activity DATE;
    estimated_size INTEGER;
BEGIN
    -- Count exportable data
    SELECT COUNT(*) INTO phrase_count FROM public.phrases WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO session_count FROM public.sessions WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO desc_count FROM public.descriptions WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO question_count FROM public.questions WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO progress_count FROM public.user_progress WHERE user_id = user_uuid;
    
    -- Get activity date range
    WITH activity_dates AS (
        SELECT MIN(created_at::DATE) as min_date, MAX(created_at::DATE) as max_date
        FROM (
            SELECT created_at FROM public.sessions WHERE user_id = user_uuid
            UNION ALL
            SELECT created_at FROM public.descriptions WHERE user_id = user_uuid
            UNION ALL
            SELECT created_at FROM public.questions WHERE user_id = user_uuid
            UNION ALL
            SELECT created_at FROM public.user_progress WHERE user_id = user_uuid
        ) all_activities
    )
    SELECT min_date, max_date INTO first_activity, last_activity FROM activity_dates;
    
    -- Estimate file size in KB (rough calculation)
    estimated_size := (phrase_count * 0.5 + session_count * 0.3 + desc_count * 2.0 + 
                      question_count * 0.8 + progress_count * 0.4)::INTEGER;
    
    RETURN QUERY
    SELECT 
        phrase_count,
        session_count,
        desc_count,
        question_count,
        progress_count,
        first_activity,
        last_activity,
        estimated_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job function to clean up exports (to be called by cron or similar)
CREATE OR REPLACE FUNCTION public.scheduled_export_cleanup()
RETURNS VOID AS $$
BEGIN
    PERFORM public.cleanup_expired_exports();
    
    -- Log cleanup activity
    INSERT INTO public.export_history (
        user_id,
        export_type,
        export_format,
        file_name,
        export_status,
        metadata
    )
    SELECT 
        (SELECT id FROM public.users WHERE preferences->>'role' = 'system' LIMIT 1),
        'cleanup',
        'log',
        'system_cleanup_' || EXTRACT(EPOCH FROM NOW())::TEXT,
        'completed',
        jsonb_build_object(
            'cleanup_timestamp', NOW(),
            'expired_count', public.cleanup_expired_exports()
        )
    WHERE EXISTS (SELECT 1 FROM public.users WHERE preferences->>'role' = 'system');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.export_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_data_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_export_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exportable_data_info(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.export_history IS 'History and status of user data exports';
COMMENT ON COLUMN public.export_history.export_type IS 'Type of data being exported (vocabulary, progress, etc.)';
COMMENT ON COLUMN public.export_history.export_format IS 'File format for the export (json, csv, pdf, etc.)';
COMMENT ON COLUMN public.export_history.filters_applied IS 'JSON object containing any filters applied to the export';
COMMENT ON COLUMN public.export_history.include_personal_data IS 'Whether personally identifiable information is included';
COMMENT ON COLUMN public.export_history.include_content_data IS 'Whether content like images and full text is included';
COMMENT ON COLUMN public.export_history.expires_at IS 'When the download link expires (default 7 days)';
COMMENT ON COLUMN public.export_history.download_count IS 'Number of times the export file has been downloaded';