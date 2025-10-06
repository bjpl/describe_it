-- ==============================================
-- DROP ALL OLD TABLES - Clean Slate
-- ==============================================
-- This removes ALL existing tables so we can create fresh ones
-- Run this ONCE, then run the full migration

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS learning_analytics CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS qa_responses CASCADE;
DROP TABLE IF EXISTS saved_descriptions CASCADE;
DROP TABLE IF EXISTS learning_progress CASCADE;
DROP TABLE IF EXISTS vocabulary_items CASCADE;
DROP TABLE IF EXISTS vocabulary_lists CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any other potential old tables
DROP TABLE IF EXISTS descriptions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS phrases CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_api_keys CASCADE;
DROP TABLE IF EXISTS export_history CASCADE;

-- Verify all tables are gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Success message
SELECT '✅ All old tables dropped! Now run the FULL migration (safe-migration-001-complete.sql)' as message;
