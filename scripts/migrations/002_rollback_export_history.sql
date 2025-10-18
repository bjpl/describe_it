-- =====================================================
-- ROLLBACK MIGRATION 002: DROP EXPORT_HISTORY TABLE
-- =====================================================
-- Purpose: Rollback migration 002 if needed
-- WARNING: This will permanently delete all export history
-- Created: 2025-10-17
-- =====================================================

BEGIN;

-- =====================================================
-- ROLLBACK STEPS
-- =====================================================

-- 1. Drop views first
DROP VIEW IF EXISTS public.user_export_summary;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS update_export_history_updated_at ON public.export_history;

-- 3. Drop functions
DROP FUNCTION IF EXISTS track_export_download(UUID);
DROP FUNCTION IF EXISTS cleanup_expired_exports();
DROP FUNCTION IF EXISTS get_user_export_stats(UUID);
DROP FUNCTION IF EXISTS create_export_record(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER);
DROP FUNCTION IF EXISTS update_export_status(UUID, TEXT, BIGINT, INTEGER, TEXT);

-- 4. Drop policies
DROP POLICY IF EXISTS "Users can view own export history" ON public.export_history;
DROP POLICY IF EXISTS "Users can create exports" ON public.export_history;
DROP POLICY IF EXISTS "Users can update own exports" ON public.export_history;
DROP POLICY IF EXISTS "Users can delete own exports" ON public.export_history;

-- 5. Drop indexes
DROP INDEX IF EXISTS idx_export_history_user_id;
DROP INDEX IF EXISTS idx_export_history_created_at;
DROP INDEX IF EXISTS idx_export_history_status;
DROP INDEX IF EXISTS idx_export_history_export_type;
DROP INDEX IF EXISTS idx_export_history_export_format;
DROP INDEX IF EXISTS idx_export_history_expires_at;
DROP INDEX IF EXISTS idx_export_history_user_created;
DROP INDEX IF EXISTS idx_export_history_filters;

-- 6. Drop table
DROP TABLE IF EXISTS public.export_history CASCADE;

COMMIT;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'ROLLBACK 002 COMPLETED';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Dropped: export_history table and all related objects';
  RAISE NOTICE 'WARNING: All export history has been deleted';
  RAISE NOTICE '=======================================================';
END $$;
