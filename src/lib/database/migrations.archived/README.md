# Archived Application Migrations

## Status: ARCHIVED (2025-10-02)

These migration files have been **archived** and are no longer used in the application.

## Why Archived?

On October 2, 2025, the project consolidated to a single migration system. After analysis, **Supabase migrations** were chosen as the canonical system because they include:

- Complete schema with all tables from these migrations
- Row Level Security (RLS) policies for data protection
- Advanced features (functions, views, analytics)
- GDPR compliance features
- Better integration with deployment pipeline
- Professional PostgreSQL best practices

## Migration Mapping

| App Migration | Supabase Migration | Status |
|---------------|-------------------|---------|
| 001_create_users_table.sql | 001_initial_schema.sql | ✅ Included |
| 002_create_sessions_table.sql | 001_initial_schema.sql | ✅ Included |
| 003_create_images_table.sql | 001_initial_schema.sql | ✅ Included |
| 004_create_descriptions_table.sql | 001_initial_schema.sql | ✅ Included |
| 005_create_questions_table.sql | 001_initial_schema.sql | ✅ Included |
| 006_create_phrases_table.sql | 001_initial_schema.sql | ✅ Included |
| 007_create_user_progress_table.sql | 001_initial_schema.sql | ✅ Included |
| 008_create_export_history_table.sql | 003_advanced_features.sql | ✅ Enhanced |
| 009_create_additional_indexes.sql | 001_initial_schema.sql | ✅ Included |
| 010_create_triggers_and_functions.sql | 003_advanced_features.sql | ✅ Enhanced |
| 011_create_user_api_keys_table.sql | (Not yet migrated) | ⚠️ Action needed |

## Action Items

### API Keys Table Migration

The `011_create_user_api_keys_table.sql` migration is **not yet included** in Supabase migrations.

**To migrate this table:**

1. Review the schema in `011_create_user_api_keys_table.sql`
2. Create new Supabase migration:
   ```bash
   supabase migration new add_user_api_keys_table
   ```
3. Copy the table definition
4. Add RLS policies
5. Add appropriate indexes
6. Test locally

Example RLS policies needed:
```sql
-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only view their own API keys
CREATE POLICY "Users can view own API keys" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own API keys" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);
```

## Historical Reference

These files are preserved for:
- Historical record of schema evolution
- Reference for understanding migration decisions
- Rollback scenarios (emergency only)
- Audit trail for compliance

## Do Not Use

**Important**: Do not apply these migrations to any environment. They are kept for reference only.

For all database schema changes, use the Supabase migration system:
- Location: `/supabase/migrations/`
- Guide: `/docs/database/MIGRATION_GUIDE.md`
- Decision: `/docs/database/MIGRATION_DECISION.md`

## Migration History

Created: August 31, 2024
Archived: October 2, 2025
Reason: Consolidated to Supabase migration system
Decision Document: `/docs/database/MIGRATION_DECISION.md`
