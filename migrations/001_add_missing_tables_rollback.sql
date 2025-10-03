-- Rollback Migration: Remove Missing Tables
-- Date: 2025-10-03
-- Description: Safely removes user_api_keys, user_progress, and export_history tables
--              This is the rollback script for migration 001_add_missing_tables.sql

-- ============================================================================
-- SAFETY CHECK
-- ============================================================================
-- WARNING: This will permanently delete data in these tables
-- Ensure you have backups before running this rollback

-- ============================================================================
-- 1. DROP TRIGGERS (in reverse order of creation)
-- ============================================================================

-- Drop session trigger for user_progress updates
DROP TRIGGER IF EXISTS trigger_update_user_progress_from_session ON public.sessions;
DROP FUNCTION IF EXISTS update_user_progress_from_session();

-- Drop updated_at triggers
DROP TRIGGER IF EXISTS trigger_export_history_updated_at ON public.export_history;
DROP FUNCTION IF EXISTS update_export_history_updated_at();

DROP TRIGGER IF EXISTS trigger_user_progress_updated_at ON public.user_progress;
DROP FUNCTION IF EXISTS update_user_progress_updated_at();

DROP TRIGGER IF EXISTS trigger_user_api_keys_updated_at ON public.user_api_keys;
DROP FUNCTION IF EXISTS update_user_api_keys_updated_at();

-- ============================================================================
-- 2. DROP RLS POLICIES
-- ============================================================================

-- Drop export_history policies
DROP POLICY IF EXISTS "Users can update their own export history" ON public.export_history;
DROP POLICY IF EXISTS "Users can insert their own export history" ON public.export_history;
DROP POLICY IF EXISTS "Users can view their own export history" ON public.export_history;

-- Drop user_progress policies
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;

-- Drop user_api_keys policies
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.user_api_keys;

-- ============================================================================
-- 3. DROP INDEXES
-- ============================================================================

-- Drop export_history indexes
DROP INDEX IF EXISTS public.idx_export_history_export_type;
DROP INDEX IF EXISTS public.idx_export_history_created_at;
DROP INDEX IF EXISTS public.idx_export_history_status;
DROP INDEX IF EXISTS public.idx_export_history_user_id;

-- Drop user_progress indexes
DROP INDEX IF EXISTS public.idx_user_progress_last_activity;
DROP INDEX IF EXISTS public.idx_user_progress_user_id;

-- Drop user_api_keys indexes
DROP INDEX IF EXISTS public.idx_user_api_keys_user_id;

-- ============================================================================
-- 4. DROP TABLES (in reverse order of dependencies)
-- ============================================================================

-- Drop tables with CASCADE to handle any remaining dependencies
DROP TABLE IF EXISTS public.export_history CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.user_api_keys CASCADE;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- All migration 001 artifacts have been removed
-- Database schema restored to pre-migration state
