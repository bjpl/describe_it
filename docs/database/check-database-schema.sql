-- Check which tables already exist in your Supabase database
-- Run this in Supabase SQL Editor to see what you have

SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Also check for the analytics_events table specifically
SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'analytics_events'
) as analytics_table_exists;

-- Check for migrations tracking table (if using Supabase migrations)
SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'schema_migrations'
) as has_migration_tracking;
