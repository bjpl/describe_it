-- =====================================================
-- ROLLBACK MIGRATION 001: DROP USER_PROGRESS TABLE
-- =====================================================
-- Purpose: Rollback migration 001 if needed
-- WARNING: This will permanently delete all user progress data
-- Created: 2025-10-17
-- =====================================================

BEGIN;

-- =====================================================
-- ROLLBACK STEPS
-- =====================================================

-- 1. Drop triggers first
DROP TRIGGER IF EXISTS create_user_progress_on_signup ON public.users;
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;

-- 2. Drop functions
DROP FUNCTION IF EXISTS initialize_user_progress();
DROP FUNCTION IF EXISTS update_user_streak(UUID);
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER);

-- 3. Drop policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- 4. Drop indexes
DROP INDEX IF EXISTS idx_user_progress_user_id;
DROP INDEX IF EXISTS idx_user_progress_current_level;
DROP INDEX IF EXISTS idx_user_progress_total_points;
DROP INDEX IF EXISTS idx_user_progress_current_streak;
DROP INDEX IF EXISTS idx_user_progress_last_session;
DROP INDEX IF EXISTS idx_user_progress_achievements;

-- 5. Drop table
DROP TABLE IF EXISTS public.user_progress CASCADE;

COMMIT;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'ROLLBACK 001 COMPLETED';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Dropped: user_progress table and all related objects';
  RAISE NOTICE 'WARNING: All user progress data has been deleted';
  RAISE NOTICE '=======================================================';
END $$;
