# Migration 001: Schema Alignment - Add Missing Tables

## Overview

**Date:** 2025-10-03
**Status:** Ready for Review
**Type:** Schema Addition (New Tables)
**Risk Level:** Low (Additive, no data modification)

## Problem Statement

The application codebase references three database tables that don't exist in the current Supabase schema:

1. **user_api_keys** - Referenced in 6 files for storing API credentials
2. **user_progress** - Referenced in 4 files for tracking overall user statistics
3. **export_history** - Referenced in 2 files for audit trail of data exports

This mismatch causes type errors and prevents features from working correctly.

## Analysis

### Current State
- **Existing Table:** `learning_progress` - Tracks vocabulary-specific learning progress
- **Missing Tables:** `user_api_keys`, `user_progress`, `export_history`
- **Impact:** Type errors in TypeScript, runtime failures for related features

### Code References

```typescript
// Files referencing missing tables:
src/types/database.ts (defines TableTypeMap with missing tables)
src/lib/supabase/types.ts (deprecated type aliases)
src/lib/services/progressService.ts (attempts to query user_progress)
src/lib/api/supabase.ts (references user_api_keys)
src/lib/database/utils/index.ts (type utilities)
src/lib/auth/AuthManager.ts (API key management)
```

## Solution Approach

**Decision:** Create the missing tables rather than refactor code

**Rationale:**
1. Tables serve distinct, valid purposes
2. Less risky than widespread code refactoring
3. Maintains backward compatibility
4. Enables future features (API key management, exports)

## Migration Details

### Tables Created

#### 1. user_api_keys
**Purpose:** Secure storage for user API credentials

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| openai_api_key | TEXT | OpenAI API key (encrypted) |
| unsplash_api_key | TEXT | Unsplash API key (encrypted) |
| anthropic_api_key | TEXT | Anthropic API key (encrypted) |
| last_validated_at | TIMESTAMPTZ | Last validation check |
| is_active | BOOLEAN | Whether keys are active |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**Constraints:**
- UNIQUE(user_id) - One record per user
- Foreign key to users ON DELETE CASCADE

#### 2. user_progress
**Purpose:** Aggregate user statistics and achievements

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| total_descriptions | INTEGER | Count of descriptions created |
| total_images | INTEGER | Count of images processed |
| total_questions_answered | INTEGER | Total Q&A attempts |
| total_vocabulary_learned | INTEGER | Vocabulary items learned |
| total_sessions | INTEGER | Session count |
| total_time_spent_minutes | INTEGER | Total learning time |
| current_streak_days | INTEGER | Current daily streak |
| longest_streak_days | INTEGER | Best streak achieved |
| total_points | INTEGER | Gamification points |
| average_accuracy | DECIMAL(5,2) | Overall accuracy % |
| mastered_words_count | INTEGER | Fully mastered words |
| learning_words_count | INTEGER | Currently learning |
| new_words_count | INTEGER | New/unseen words |
| last_activity_at | TIMESTAMPTZ | Most recent activity |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**Constraints:**
- UNIQUE(user_id) - One record per user
- Foreign key to users ON DELETE CASCADE

**Automatic Updates:**
- Trigger updates progress when sessions complete
- Calculates aggregates from session data

#### 3. export_history
**Purpose:** Audit trail for data exports

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| export_type | VARCHAR(50) | Export type identifier |
| export_format | VARCHAR(20) | File format (csv, json, etc.) |
| status | VARCHAR(20) | pending/processing/completed/failed |
| records_count | INTEGER | Number of records exported |
| file_size_bytes | BIGINT | Export file size |
| file_url | TEXT | Storage URL if applicable |
| filters | JSONB | Export filters applied |
| data | JSONB | Metadata or small payloads |
| error_message | TEXT | Error details if failed |
| retry_count | INTEGER | Number of retries |
| started_at | TIMESTAMPTZ | Export start time |
| completed_at | TIMESTAMPTZ | Export completion time |
| processing_time_seconds | INTEGER | Time taken |
| expires_at | TIMESTAMPTZ | Temporary file expiration |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**Constraints:**
- Foreign key to users ON DELETE CASCADE

### Security (RLS Policies)

All tables have Row Level Security enabled with policies:

```sql
-- Users can only access their own data
SELECT: WHERE auth.uid() = user_id
INSERT: WITH CHECK (auth.uid() = user_id)
UPDATE: USING/WITH CHECK (auth.uid() = user_id)
DELETE: USING (auth.uid() = user_id)
```

### Indexes

```sql
-- user_api_keys
idx_user_api_keys_user_id

-- user_progress
idx_user_progress_user_id
idx_user_progress_last_activity

-- export_history
idx_export_history_user_id
idx_export_history_status
idx_export_history_created_at
idx_export_history_export_type
```

### Triggers

1. **Updated At Triggers** - Auto-update `updated_at` timestamp
2. **Session Completion Trigger** - Auto-update user_progress from sessions table

## Execution Plan

### Pre-Migration Checklist

- [ ] Review migration SQL script
- [ ] Verify rollback script
- [ ] Database backup completed
- [ ] Test in staging environment
- [ ] Update type definitions generated
- [ ] Code type-checks successfully
- [ ] All tests pass

### Migration Steps

1. **Backup Database**
   ```bash
   # Use Supabase dashboard or CLI
   supabase db dump > backup_pre_migration_001.sql
   ```

2. **Run Migration**
   ```bash
   # Via Supabase SQL Editor or CLI
   psql -h <host> -U <user> -d <database> -f migrations/001_add_missing_tables.sql
   ```

3. **Verify Migration**
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('user_api_keys', 'user_progress', 'export_history');

   -- Check RLS enabled
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('user_api_keys', 'user_progress', 'export_history');

   -- Check initial data
   SELECT COUNT(*) FROM user_progress;
   ```

4. **Regenerate Types**
   ```bash
   npm run generate:types
   # Or manually via Supabase CLI
   supabase gen types typescript --local > src/types/database.generated.ts
   ```

5. **Run Type Check**
   ```bash
   npm run typecheck
   ```

6. **Run Tests**
   ```bash
   npm run test
   ```

### Rollback Procedure

If issues occur:

```bash
# Run rollback script
psql -h <host> -U <user> -d <database> -f migrations/001_add_missing_tables_rollback.sql

# Restore from backup if needed
psql -h <host> -U <user> -d <database> < backup_pre_migration_001.sql
```

## Testing Checklist

### Database Tests

- [ ] Tables created successfully
- [ ] All indexes exist
- [ ] RLS policies working correctly
- [ ] Triggers fire as expected
- [ ] Foreign key constraints enforced
- [ ] Initial data migrated for existing users

### Application Tests

- [ ] TypeScript compilation successful (0 errors)
- [ ] Type definitions match schema
- [ ] Services can query new tables
- [ ] API endpoints work correctly
- [ ] User progress updates automatically
- [ ] API key management functional
- [ ] Export history tracking works

### Security Tests

- [ ] Users can only see their own data
- [ ] Cannot access other users' records
- [ ] All CRUD operations respect RLS
- [ ] API keys properly encrypted (application layer)

### Performance Tests

- [ ] Index usage verified (EXPLAIN ANALYZE)
- [ ] Query performance acceptable
- [ ] No unexpected table scans
- [ ] Trigger overhead minimal

## Post-Migration Tasks

1. **Update Documentation**
   - [ ] Update database schema diagrams
   - [ ] Document new table structures
   - [ ] Update API documentation

2. **Code Updates**
   - [ ] Remove deprecated type aliases
   - [ ] Update service implementations
   - [ ] Add API key encryption/decryption
   - [ ] Implement export functionality

3. **Monitoring**
   - [ ] Monitor table growth
   - [ ] Check trigger performance
   - [ ] Verify RLS policy effectiveness
   - [ ] Track error rates

## Impact Assessment

### Positive Impacts
- ✅ Resolves type errors in TypeScript
- ✅ Enables API key management feature
- ✅ Enables user progress tracking
- ✅ Enables export audit trail
- ✅ Improves data security (RLS)
- ✅ Automatic progress updates via triggers

### Potential Risks
- ⚠️ Additional database storage required
- ⚠️ Trigger overhead on session completion
- ⚠️ Need to implement API key encryption
- ⚠️ Export file storage needs implementation

### Mitigation Strategies
- Start with small user base (gradual rollout)
- Monitor database performance metrics
- Implement proper encryption before production
- Use TTL for export file cleanup

## Dependencies

- Supabase PostgreSQL 14+
- Application code updates (type definitions)
- API key encryption implementation (future)
- Export file storage solution (future)

## Success Criteria

- [ ] All tables created and accessible
- [ ] TypeScript builds with 0 errors
- [ ] All existing tests pass
- [ ] New features functional
- [ ] No performance degradation
- [ ] RLS policies enforced correctly

## Rollback Criteria

Rollback if:
- Migration fails midway
- Critical bugs discovered
- Performance severely impacted
- Data integrity issues
- RLS policies not working

## Timeline

- **Planning:** 2025-10-03
- **Testing (Staging):** TBD
- **Production Deployment:** TBD
- **Post-Deployment Monitoring:** 7 days

## Approvals

- [ ] Database Admin
- [ ] Tech Lead
- [ ] Security Review
- [ ] QA Sign-off

## Notes

- API key encryption MUST be implemented before storing real credentials
- Export file storage needs separate implementation
- Consider adding monitoring for trigger performance
- Plan for data archival of old export_history records

## References

- Migration SQL: `/migrations/001_add_missing_tables.sql`
- Rollback SQL: `/migrations/001_add_missing_tables_rollback.sql`
- Type Definitions: `/src/types/database.generated.ts`
- Issue Tracking: [Link to issue tracker]
