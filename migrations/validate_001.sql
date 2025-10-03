-- Validation Script for Migration 001
-- Run this after applying migration to verify success

-- ============================================================================
-- 1. VERIFY TABLES EXIST
-- ============================================================================
SELECT
  'Tables Created' as check_category,
  COUNT(*) as expected,
  (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user_api_keys', 'user_progress', 'export_history')
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_api_keys', 'user_progress', 'export_history')
    ) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM (SELECT 3 as count) t;

-- ============================================================================
-- 2. VERIFY ROW LEVEL SECURITY ENABLED
-- ============================================================================
SELECT
  'RLS Enabled' as check_category,
  3 as expected,
  (
    SELECT COUNT(*)
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
    AND rowsecurity = true
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
      AND rowsecurity = true
    ) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 3. VERIFY RLS POLICIES COUNT
-- ============================================================================
SELECT
  'RLS Policies' as check_category,
  12 as expected, -- 4 for user_api_keys, 3 each for user_progress and export_history
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
    ) = 12 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 4. VERIFY INDEXES CREATED
-- ============================================================================
SELECT
  'Indexes Created' as check_category,
  7 as expected, -- 1 for user_api_keys, 2 for user_progress, 4 for export_history
  (
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
    AND indexname NOT LIKE '%_pkey' -- Exclude primary key indexes
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
      AND indexname NOT LIKE '%_pkey'
    ) = 7 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 5. VERIFY TRIGGERS CREATED
-- ============================================================================
SELECT
  'Triggers Created' as check_category,
  4 as expected, -- 3 updated_at triggers + 1 session trigger
  (
    SELECT COUNT(*)
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND (
      event_object_table IN ('user_api_keys', 'user_progress', 'export_history')
      OR (
        event_object_table = 'sessions'
        AND trigger_name = 'trigger_update_user_progress_from_session'
      )
    )
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND (
        event_object_table IN ('user_api_keys', 'user_progress', 'export_history')
        OR (
          event_object_table = 'sessions'
          AND trigger_name = 'trigger_update_user_progress_from_session'
        )
      )
    ) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 6. VERIFY FUNCTIONS CREATED
-- ============================================================================
SELECT
  'Functions Created' as check_category,
  4 as expected,
  (
    SELECT COUNT(*)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_user_api_keys_updated_at',
      'update_user_progress_updated_at',
      'update_export_history_updated_at',
      'update_user_progress_from_session'
    )
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_user_api_keys_updated_at',
        'update_user_progress_updated_at',
        'update_export_history_updated_at',
        'update_user_progress_from_session'
      )
    ) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 7. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================
SELECT
  'Foreign Keys' as check_category,
  3 as expected, -- Each table has FK to users
  (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name IN ('user_api_keys', 'user_progress', 'export_history')
    AND constraint_type = 'FOREIGN KEY'
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
      AND table_name IN ('user_api_keys', 'user_progress', 'export_history')
      AND constraint_type = 'FOREIGN KEY'
    ) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 8. VERIFY UNIQUE CONSTRAINTS
-- ============================================================================
SELECT
  'Unique Constraints' as check_category,
  2 as expected, -- user_api_keys and user_progress have UNIQUE(user_id)
  (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name IN ('user_api_keys', 'user_progress')
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user%'
  ) as actual,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
      AND table_name IN ('user_api_keys', 'user_progress')
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%user%'
    ) = 2 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 9. VERIFY INITIAL DATA MIGRATION
-- ============================================================================
SELECT
  'Initial Data' as check_category,
  (SELECT COUNT(*) FROM users) as expected,
  (SELECT COUNT(*) FROM user_progress) as actual,
  CASE
    WHEN (SELECT COUNT(*) FROM user_progress) >= (SELECT COUNT(*) FROM users) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- 10. DETAILED TABLE STRUCTURE VERIFICATION
-- ============================================================================

-- User API Keys columns
SELECT 'user_api_keys columns' as info,
       COUNT(*) as column_count,
       CASE WHEN COUNT(*) = 8 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_api_keys';

-- User Progress columns
SELECT 'user_progress columns' as info,
       COUNT(*) as column_count,
       CASE WHEN COUNT(*) >= 20 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_progress';

-- Export History columns
SELECT 'export_history columns' as info,
       COUNT(*) as column_count,
       CASE WHEN COUNT(*) >= 15 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'export_history';

-- ============================================================================
-- 11. FINAL SUMMARY
-- ============================================================================
SELECT
  '=' as "====================",
  'VALIDATION SUMMARY' as "====================",
  '=' as "====================";

SELECT
  tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  (
    SELECT COUNT(*)
    FROM information_schema.columns c
    WHERE c.table_schema = t.schemaname
    AND c.table_name = t.tablename
  ) as columns,
  (
    SELECT COUNT(*)
    FROM pg_indexes i
    WHERE i.schemaname = t.schemaname
    AND i.tablename = t.tablename
  ) as indexes,
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.schemaname = t.schemaname
    AND p.tablename = t.tablename
  ) as policies,
  rowsecurity as rls_enabled
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN ('user_api_keys', 'user_progress', 'export_history')
ORDER BY tablename;

-- Check for any errors in trigger functions
SELECT
  'Trigger Function Health' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user_api_keys%'
   OR routine_name LIKE '%user_progress%'
   OR routine_name LIKE '%export_history%'
ORDER BY routine_name;

-- ============================================================================
-- NOTES
-- ============================================================================
-- If all checks show ✅ PASS, migration was successful
-- If any checks show ❌ FAIL, review migration logs and rerun if needed
-- Expected Results:
--   - 3 tables created
--   - 3 tables with RLS enabled
--   - 12 RLS policies
--   - 7 indexes (excluding PKs)
--   - 4 triggers
--   - 4 functions
--   - 3 foreign keys
--   - 2 unique constraints
--   - user_progress rows >= user rows
