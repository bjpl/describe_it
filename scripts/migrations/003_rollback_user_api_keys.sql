-- =====================================================
-- ROLLBACK MIGRATION 003: DROP USER_API_KEYS TABLE
-- =====================================================
-- Purpose: Rollback migration 003 if needed
-- WARNING: This will permanently delete all stored API keys
-- Created: 2025-10-17
-- =====================================================

BEGIN;

-- =====================================================
-- ROLLBACK STEPS
-- =====================================================

-- 1. Drop views first
DROP VIEW IF EXISTS public.user_api_keys_safe;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON public.user_api_keys;

-- 3. Drop functions
DROP FUNCTION IF EXISTS encrypt_api_key(TEXT, TEXT);
DROP FUNCTION IF EXISTS decrypt_api_key(BYTEA, TEXT);
DROP FUNCTION IF EXISTS store_api_key(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_api_key(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS track_api_key_usage(UUID, BIGINT);
DROP FUNCTION IF EXISTS revoke_api_key(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_api_key_stats(UUID);
DROP FUNCTION IF EXISTS cleanup_expired_api_keys();

-- 4. Drop policies
DROP POLICY IF EXISTS "Users can view own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can create API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.user_api_keys;

-- 5. Drop indexes
DROP INDEX IF EXISTS idx_user_api_keys_user_id;
DROP INDEX IF EXISTS idx_user_api_keys_service_name;
DROP INDEX IF EXISTS idx_user_api_keys_status;
DROP INDEX IF EXISTS idx_user_api_keys_is_valid;
DROP INDEX IF EXISTS idx_user_api_keys_expires_at;
DROP INDEX IF EXISTS idx_user_api_keys_rotation_reminder;
DROP INDEX IF EXISTS idx_user_api_keys_user_service_active;
DROP INDEX IF EXISTS idx_user_api_keys_last_used;

-- 6. Drop table
DROP TABLE IF EXISTS public.user_api_keys CASCADE;

-- Note: We do NOT drop pgcrypto extension as it might be used elsewhere

COMMIT;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'ROLLBACK 003 COMPLETED';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Dropped: user_api_keys table and all related objects';
  RAISE NOTICE 'WARNING: All API keys have been deleted';
  RAISE NOTICE 'NOTE: pgcrypto extension was NOT dropped';
  RAISE NOTICE '=======================================================';
END $$;
