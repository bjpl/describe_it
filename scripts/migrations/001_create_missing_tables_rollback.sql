-- =====================================================
-- ROLLBACK MIGRATION: Drop Missing Database Tables
-- Version: 001_rollback
-- Date: 2025-10-03
-- Description: Rollback migration to drop all tables created in 001_create_missing_tables.sql
-- =====================================================
-- WARNING: This will permanently delete all data in these tables!
-- Use with extreme caution and only if you need to rollback the migration.

-- =====================================================
-- 1. DROP VIEWS FIRST
-- =====================================================

DROP VIEW IF EXISTS public.user_qa_performance;
DROP VIEW IF EXISTS public.image_statistics;

-- =====================================================
-- 2. DROP TABLES IN REVERSE ORDER (to handle foreign keys)
-- =====================================================

-- Drop tables that reference other tables first
DROP TABLE IF EXISTS public.image_history CASCADE;
DROP TABLE IF EXISTS public.user_data CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.qa_responses CASCADE;
DROP TABLE IF EXISTS public.session_progress CASCADE;
DROP TABLE IF EXISTS public.answer_validations CASCADE;
DROP TABLE IF EXISTS public.qa_items CASCADE;
DROP TABLE IF EXISTS public.phrases CASCADE;
DROP TABLE IF EXISTS public.descriptions CASCADE;
DROP TABLE IF EXISTS public.images CASCADE;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ROLLBACK 001 COMPLETED';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Dropped 11 tables:';
    RAISE NOTICE '  ✓ images';
    RAISE NOTICE '  ✓ descriptions';
    RAISE NOTICE '  ✓ phrases';
    RAISE NOTICE '  ✓ qa_items';
    RAISE NOTICE '  ✓ answer_validations';
    RAISE NOTICE '  ✓ session_progress';
    RAISE NOTICE '  ✓ qa_responses';
    RAISE NOTICE '  ✓ user_settings';
    RAISE NOTICE '  ✓ user_preferences';
    RAISE NOTICE '  ✓ user_data';
    RAISE NOTICE '  ✓ image_history';
    RAISE NOTICE '';
    RAISE NOTICE 'Dropped 2 views:';
    RAISE NOTICE '  ✓ user_qa_performance';
    RAISE NOTICE '  ✓ image_statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'All migration 001 changes have been rolled back.';
    RAISE NOTICE '=======================================================';
END $$;
