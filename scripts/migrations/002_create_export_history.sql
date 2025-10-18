-- =====================================================
-- MIGRATION 002: CREATE EXPORT_HISTORY TABLE
-- =====================================================
-- Purpose: Track user export activities and provide download history
-- Current Status: Export feature completely disabled
-- Created: 2025-10-17
-- Dependencies: users table (FK constraint)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE EXPORT_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Export details
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'csv', 'json', 'anki', 'docx', 'txt')),
  export_format TEXT NOT NULL CHECK (export_format IN ('vocabulary', 'descriptions', 'progress', 'full_backup')),

  -- Content metadata
  content_type TEXT NOT NULL DEFAULT 'vocabulary',
  items_count INTEGER DEFAULT 0,
  file_size_bytes BIGINT,

  -- File information
  file_name TEXT NOT NULL,
  file_path TEXT,
  download_url TEXT,

  -- Filter and options used for export
  export_filters JSONB DEFAULT '{}'::jsonb,
  export_options JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')) DEFAULT 'pending',
  error_message TEXT,

  -- Download tracking
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Processing metadata
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  processing_duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_export_history_user_id
  ON public.export_history(user_id);

CREATE INDEX IF NOT EXISTS idx_export_history_created_at
  ON public.export_history(created_at DESC);

-- Status and type queries
CREATE INDEX IF NOT EXISTS idx_export_history_status
  ON public.export_history(status);

CREATE INDEX IF NOT EXISTS idx_export_history_export_type
  ON public.export_history(export_type);

CREATE INDEX IF NOT EXISTS idx_export_history_export_format
  ON public.export_history(export_format);

-- Expiration cleanup index
CREATE INDEX IF NOT EXISTS idx_export_history_expires_at
  ON public.export_history(expires_at)
  WHERE expires_at IS NOT NULL;

-- Composite index for user's recent exports
CREATE INDEX IF NOT EXISTS idx_export_history_user_created
  ON public.export_history(user_id, created_at DESC);

-- Filter and options search
CREATE INDEX IF NOT EXISTS idx_export_history_filters
  ON public.export_history USING gin(export_filters);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own export history
CREATE POLICY "Users can view own export history"
  ON public.export_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own exports
CREATE POLICY "Users can create exports"
  ON public.export_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own exports (for download tracking)
CREATE POLICY "Users can update own exports"
  ON public.export_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own export history
CREATE POLICY "Users can delete own exports"
  ON public.export_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_export_history_updated_at
  BEFORE UPDATE ON public.export_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to track export download
CREATE OR REPLACE FUNCTION track_export_download(p_export_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.export_history
  SET
    download_count = download_count + 1,
    last_downloaded_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_export_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete exports that have expired
  DELETE FROM public.export_history
  WHERE
    expires_at IS NOT NULL
    AND expires_at < timezone('utc'::text, now())
    AND status IN ('completed', 'failed');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user export statistics
CREATE OR REPLACE FUNCTION get_user_export_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_exports', COUNT(*),
    'completed_exports', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed_exports', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending_exports', COUNT(*) FILTER (WHERE status IN ('pending', 'processing')),
    'total_downloads', COALESCE(SUM(download_count), 0),
    'total_items_exported', COALESCE(SUM(items_count), 0),
    'total_file_size_mb', ROUND(COALESCE(SUM(file_size_bytes), 0)::numeric / 1048576, 2),
    'exports_by_type', jsonb_object_agg(
      export_type,
      COUNT(*)
    ),
    'last_export_at', MAX(created_at)
  )
  INTO v_stats
  FROM public.export_history
  WHERE user_id = p_user_id
  GROUP BY user_id;

  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to create new export record
CREATE OR REPLACE FUNCTION create_export_record(
  p_user_id UUID,
  p_export_type TEXT,
  p_export_format TEXT,
  p_file_name TEXT,
  p_export_filters JSONB DEFAULT '{}'::jsonb,
  p_export_options JSONB DEFAULT '{}'::jsonb,
  p_expires_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
  v_export_id UUID;
BEGIN
  INSERT INTO public.export_history (
    user_id,
    export_type,
    export_format,
    file_name,
    export_filters,
    export_options,
    expires_at,
    status
  ) VALUES (
    p_user_id,
    p_export_type,
    p_export_format,
    p_file_name,
    p_export_filters,
    p_export_options,
    timezone('utc'::text, now()) + (p_expires_hours || ' hours')::INTERVAL,
    'pending'
  )
  RETURNING id INTO v_export_id;

  RETURN v_export_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update export status
CREATE OR REPLACE FUNCTION update_export_status(
  p_export_id UUID,
  p_status TEXT,
  p_file_size_bytes BIGINT DEFAULT NULL,
  p_items_count INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.export_history
  SET
    status = p_status,
    file_size_bytes = COALESCE(p_file_size_bytes, file_size_bytes),
    items_count = COALESCE(p_items_count, items_count),
    error_message = p_error_message,
    processing_completed_at = CASE
      WHEN p_status IN ('completed', 'failed')
      THEN timezone('utc'::text, now())
      ELSE processing_completed_at
    END,
    processing_duration_ms = CASE
      WHEN p_status IN ('completed', 'failed') AND processing_started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - processing_started_at)) * 1000
      ELSE processing_duration_ms
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_export_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREATE VIEW FOR USER EXPORT SUMMARY
-- =====================================================

CREATE OR REPLACE VIEW public.user_export_summary AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(eh.id) as total_exports,
  COUNT(*) FILTER (WHERE eh.status = 'completed') as completed_exports,
  COUNT(*) FILTER (WHERE eh.created_at > timezone('utc'::text, now()) - INTERVAL '30 days') as exports_last_30_days,
  COALESCE(SUM(eh.download_count), 0) as total_downloads,
  COALESCE(SUM(eh.items_count), 0) as total_items_exported,
  ROUND(COALESCE(SUM(eh.file_size_bytes), 0)::numeric / 1048576, 2) as total_size_mb,
  MAX(eh.created_at) as last_export_at,
  jsonb_object_agg(
    COALESCE(eh.export_type, 'none'),
    COUNT(eh.id)
  ) FILTER (WHERE eh.export_type IS NOT NULL) as exports_by_type
FROM public.users u
LEFT JOIN public.export_history eh ON u.id = eh.user_id
GROUP BY u.id, u.email;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'MIGRATION 002 COMPLETED SUCCESSFULLY! ✓';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Created: export_history table';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Export tracking (PDF, CSV, JSON, Anki, DOCX, TXT)';
  RAISE NOTICE '  ✓ Download history and statistics';
  RAISE NOTICE '  ✓ Auto-expiration of old exports';
  RAISE NOTICE '  ✓ Processing status tracking';
  RAISE NOTICE '  ✓ Row Level Security enabled';
  RAISE NOTICE '  ✓ Helper functions for export management';
  RAISE NOTICE '  ✓ User export summary view';
  RAISE NOTICE '=======================================================';
END $$;
