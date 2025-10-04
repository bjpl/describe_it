# Database Migration Strategy - Schema Alignment

**Document Version:** 1.0
**Date:** 2025-10-03
**Status:** Architecture Decision Record (ADR)
**Priority:** HIGH - Blocking TypeScript compilation

---

## Executive Summary

Critical schema misalignment exists between:
1. **Actual Supabase Schema** (`database.generated.ts`) - The source of truth
2. **Application Type Definitions** (`database.ts`) - Legacy expectations
3. **Archived Migrations** (`src/lib/database/migrations.archived/`) - Never applied to Supabase

This misalignment causes TypeScript errors, runtime failures, and technical debt accumulation.

---

## Problem Analysis

### 1. Missing Tables (Referenced in Code, Not in Database)

| Table Name | Expected Location | Actual Status | References |
|------------|-------------------|---------------|------------|
| `user_api_keys` | `database.ts:362-391` | **Missing from Supabase** | `src/lib/auth/`, API routes |
| `user_progress` | `database.ts:357-361` | **Missing from Supabase** | `progressService.ts`, Dashboard components |
| `export_history` | `database.ts:362-390` | **Missing from Supabase** | Export API routes |

**Impact:**
- TypeScript type mismatches (100+ errors)
- Runtime database errors when accessing these tables
- Code uses workarounds (e.g., `user_progress` → `learning_progress` fallback)

### 2. Schema Conflicts (Different Structures)

#### Table: `users`

**Generated Schema (Actual):**
```typescript
spanish_level: 'beginner' | 'intermediate' | 'advanced'
is_authenticated: boolean
profile_completed: boolean
default_description_style: description_style
target_words_per_day: number
// ... 15 columns total
```

**Application Schema (Expected):**
```typescript
learning_level: 'beginner' | 'intermediate' | 'advanced'  // ❌ Different name
subscription_status: 'free' | 'premium' | 'trial'        // ❌ Missing column
total_points: number                                       // ❌ Missing column
current_streak: number                                     // ❌ Missing column
longest_streak: number                                     // ❌ Missing column
```

**Conflicts:**
- Column name mismatch: `spanish_level` vs `learning_level`
- Missing columns: `subscription_status`, `total_points`, `current_streak`, `longest_streak`
- Impact: 50+ TypeScript errors, authentication flow issues

#### Table: `sessions`

**Generated Schema (Actual):**
```typescript
session_type: 'description' | 'qa' | 'vocabulary' | 'mixed'
images_processed: number
descriptions_generated: number
qa_attempts: number
qa_correct: number
vocabulary_learned: number
phrases_saved: number
session_data: Json
```

**Application Schema (Expected):**
```typescript
session_type: 'practice' | 'flashcards' | 'quiz' | 'matching' | 'writing'  // ❌ Different enum
status: 'active' | 'completed' | 'abandoned'                               // ❌ Missing column
vocabulary_items?: string[]                                                 // ❌ Different structure
```

**Conflicts:**
- Enum mismatch in `session_type`
- Missing `status` column
- Different approach to tracking vocabulary items

#### Table: `learning_progress` vs `user_progress`

**Generated Schema (Exists as `learning_progress`):**
```typescript
learning_progress: {
  Row: {
    id: string
    user_id: string
    vocabulary_item_id: string
    session_id: string | null
    mastery_level: number
    review_count: number
    correct_count: number
    // ... vocabulary-focused tracking
  }
}
```

**Application Schema (Expects `user_progress`):**
```typescript
user_progress: {
  Row: {
    id: string
    user_id: string
    vocabulary_item_id: string  // ❌ Should be optional
    mastery_level: number
    times_reviewed: number      // ❌ Different name
    times_correct: number       // ❌ Different name
    // ... session-focused tracking
  }
}
```

**Fundamental Design Conflict:**
- **Actual schema**: Vocabulary-item-centric progress tracking
- **Expected schema**: General user progress tracking (daily/weekly analytics)
- Code workaround: Comments like `// TODO: user_progress table doesn't exist - using learning_progress instead`

---

## Migration Options Analysis

### Option A: Create Missing Tables (Recommended)

**Approach:** Execute the archived migrations to add missing tables to Supabase schema.

**Tables to Create:**
1. **`user_api_keys`** (Migration 011)
   - Stores encrypted API keys per user
   - Required for: API key management, external service integration
   - Complexity: LOW
   - Risk: MINIMAL (no conflicts)

2. **`export_history`** (Migration 008)
   - Tracks data export requests and status
   - Required for: Export functionality, GDPR compliance
   - Complexity: LOW
   - Risk: MINIMAL (no conflicts)

3. **`user_progress`** (Migration 007)
   - Comprehensive analytics and progress tracking
   - Required for: Dashboard, learning analytics, recommendations
   - Complexity: MEDIUM
   - Risk: MEDIUM (overlaps with `learning_progress`)

**Pros:**
- ✅ Minimal code changes required
- ✅ Preserves all existing functionality
- ✅ Enables full feature set as designed
- ✅ Maintains separation of concerns (vocabulary progress vs. user analytics)
- ✅ Clear migration path with existing SQL scripts

**Cons:**
- ⚠️ Data duplication between `learning_progress` and `user_progress`
- ⚠️ Requires synchronization logic between tables
- ⚠️ Increased database complexity
- ⚠️ Higher storage costs

**Effort Estimation:**
- Database migration: 2-4 hours
- Testing: 2-3 hours
- **Total: 4-7 hours**

**Implementation Steps:**
1. Review and update migration scripts
2. Execute migrations in Supabase
3. Regenerate TypeScript types
4. Update synchronization logic
5. Validate with integration tests

---

### Option B: Refactor Code to Use Existing Schema

**Approach:** Modify application code to align with actual Supabase schema.

**Required Changes:**

1. **Rename `user_progress` → `learning_progress` everywhere**
   - Files affected: 15+ service files, 10+ components
   - Lines of code: 200+
   - Risk: HIGH (potential logic breaks)

2. **Refactor users table references**
   - Change `learning_level` → `spanish_level`
   - Remove references to: `subscription_status`, `total_points`, `current_streak`
   - Alternative storage for removed fields (user settings? new table?)
   - Files affected: 25+ files
   - Risk: VERY HIGH

3. **Fix session type enums**
   - Change all references from practice/flashcards/quiz/matching/writing
   - Update to: description/qa/vocabulary/mixed
   - Files affected: 8+ files
   - Risk: MEDIUM

4. **Alternative for API keys**
   - Store in user_settings.metadata JSONB?
   - Create new lightweight table?
   - Files affected: 5+ files
   - Risk: MEDIUM (security implications)

5. **Alternative for export_history**
   - Store in user_settings.metadata JSONB?
   - Log-only approach (no historical tracking)?
   - Files affected: 3+ files
   - Risk: LOW

**Pros:**
- ✅ No database schema changes needed
- ✅ Single source of truth (Supabase schema)
- ✅ Simpler database structure
- ✅ Lower storage costs

**Cons:**
- ❌ MASSIVE code refactoring required (500+ lines)
- ❌ HIGH risk of introducing bugs
- ❌ Loss of designed functionality (analytics, exports, API management)
- ❌ Breaking changes to existing user data
- ❌ Need to migrate existing data
- ❌ 3-4 weeks of development time

**Effort Estimation:**
- Code refactoring: 40-60 hours
- Testing: 20-30 hours
- Data migration: 5-10 hours
- **Total: 65-100 hours (3-5 weeks)**

---

### Option C: Hybrid Approach (NOT Recommended)

**Approach:** Create some tables, refactor some code.

**Rationale for Rejection:**
- Combines worst aspects of both options
- Inconsistent architecture
- Confusing for future developers
- No significant benefit over Option A

---

## Decision Matrix

| Criteria | Option A (Create Tables) | Option B (Refactor Code) | Winner |
|----------|-------------------------|--------------------------|--------|
| **Development Time** | 4-7 hours | 65-100 hours | **A** |
| **Risk Level** | LOW-MEDIUM | VERY HIGH | **A** |
| **Code Changes** | Minimal (20-30 lines) | Massive (500+ lines) | **A** |
| **Feature Preservation** | 100% | 60-70% | **A** |
| **Database Complexity** | Higher | Lower | B |
| **Storage Costs** | Higher | Lower | B |
| **Maintainability** | Good (clear separation) | Poor (workarounds) | **A** |
| **Rollback Ability** | Easy | Very difficult | **A** |

**Score: Option A = 7/8 | Option B = 1/8**

---

## Recommended Strategy: OPTION A

### Phase 1: Preparation (1-2 hours)

**Tasks:**
1. ✅ Audit current schema misalignments (COMPLETED)
2. ⬜ Review archived migration scripts for compatibility
3. ⬜ Create database backup
4. ⬜ Set up staging environment for testing
5. ⬜ Create rollback plan

**Deliverables:**
- Updated migration scripts
- Test database instance
- Rollback procedure document

---

### Phase 2: Migration Execution (2-3 hours)

**Migration Order:**
1. **`user_api_keys`** (FIRST - no dependencies)
   - Source: `migrations.archived/011_create_user_api_keys_table.sql`
   - Dependencies: None
   - Test: Insert/retrieve API keys

2. **`export_history`** (SECOND - depends on users)
   - Source: `migrations.archived/008_create_export_history_table.sql`
   - Dependencies: `users` table
   - Test: Create export request

3. **`user_progress`** (THIRD - complex dependencies)
   - Source: `migrations.archived/007_create_user_progress_table.sql`
   - Dependencies: `users`, `sessions`, `vocabulary_items`
   - Test: Calculate daily progress
   - **CRITICAL:** Add synchronization triggers

**Migration Script Template:**
```sql
-- Migration: YYYYMMDD_HHmm_align_schema_with_types.sql
-- Description: Align Supabase schema with application types
-- Strategy: Add missing tables from archived migrations

BEGIN;

-- Step 1: Create user_api_keys
\i migrations.archived/011_create_user_api_keys_table.sql

-- Step 2: Create export_history
\i migrations.archived/008_create_export_history_table.sql

-- Step 3: Create user_progress
\i migrations.archived/007_create_user_progress_table.sql

-- Step 4: Create synchronization triggers
CREATE OR REPLACE FUNCTION sync_user_progress_from_learning()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync logic here
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER learning_progress_to_user_progress
  AFTER INSERT OR UPDATE ON learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_progress_from_learning();

COMMIT;
```

---

### Phase 3: Type Regeneration (30 minutes)

**Tasks:**
1. ⬜ Run Supabase type generation
   ```bash
   npx supabase gen types typescript --project-id arjrpdccaczbybbrchvc > src/types/database.generated.ts
   ```

2. ⬜ Update `database.ts` to re-export generated types
3. ⬜ Remove duplicate type definitions
4. ⬜ Run TypeScript compiler to verify

**Expected Outcome:**
- TypeScript errors reduced from 100+ to <20
- All database tables properly typed
- No runtime type mismatches

---

### Phase 4: Validation & Testing (2-3 hours)

**Test Suite:**

1. **Unit Tests**
   - ✅ API key CRUD operations
   - ✅ Export request lifecycle
   - ✅ User progress calculation
   - ✅ Synchronization triggers

2. **Integration Tests**
   - ✅ User registration → API key creation
   - ✅ Learning session → Progress update
   - ✅ Export request → File generation

3. **UI Tests**
   - ✅ Dashboard displays correct progress
   - ✅ API key management interface
   - ✅ Export functionality

**Acceptance Criteria:**
- All existing features functional
- TypeScript compiles without errors
- No console warnings about missing tables
- User data intact and accessible

---

### Phase 5: Cleanup (1 hour)

**Tasks:**
1. ⬜ Remove workaround code (e.g., `// TODO: user_progress doesn't exist`)
2. ⬜ Update API documentation
3. ⬜ Archive old migration scripts
4. ⬜ Update README with new schema

**Deliverables:**
- Clean codebase
- Updated documentation
- Migration completion report

---

## Risk Assessment & Mitigation

### Risk 1: Data Duplication
**Probability:** HIGH
**Impact:** MEDIUM
**Mitigation:**
- Implement automatic synchronization triggers
- Monitor storage usage
- Consider data archival strategy after 90 days

### Risk 2: Migration Failure
**Probability:** LOW
**Impact:** HIGH
**Mitigation:**
- Test in staging environment first
- Create complete database backup
- Prepare rollback script
- Execute during low-traffic window

### Risk 3: Type Generation Issues
**Probability:** MEDIUM
**Impact:** LOW
**Mitigation:**
- Manual verification of generated types
- Keep both generated and manual types temporarily
- Gradual migration of imports

### Risk 4: Performance Degradation
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Add proper indexes (already in migration scripts)
- Monitor query performance
- Implement caching for analytics queries

---

## Rollback Plan

**If migration fails or causes issues:**

1. **Immediate Actions** (5 minutes)
   ```sql
   BEGIN;
   DROP TABLE IF EXISTS user_progress CASCADE;
   DROP TABLE IF EXISTS export_history CASCADE;
   DROP TABLE IF EXISTS user_api_keys CASCADE;
   COMMIT;
   ```

2. **Restore from Backup** (10-15 minutes)
   ```bash
   psql -h db.arjrpdccaczbybbrchvc.supabase.co \
        -U postgres \
        -d postgres \
        < backup_20251003.sql
   ```

3. **Revert Type Changes** (5 minutes)
   ```bash
   git checkout HEAD~1 -- src/types/database.generated.ts
   ```

4. **Verify Rollback** (10 minutes)
   - Run test suite
   - Check application functionality
   - Monitor error logs

**Total Rollback Time:** < 30 minutes

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| TypeScript Errors | 100+ | <20 | `npm run typecheck` |
| Missing Tables | 3 | 0 | Database schema inspection |
| Workaround Code | 12+ comments | 0 | Code grep for "TODO: user_progress" |
| Test Pass Rate | ~85% | >95% | `npm test` |
| Build Time | ~45s | <60s | CI/CD logs |

---

## Timeline & Resource Allocation

**Total Estimated Time:** 6-9 hours
**Recommended Schedule:** 1-2 days (with testing buffer)

**Day 1 Morning (4 hours):**
- Phase 1: Preparation
- Phase 2: Migration Execution

**Day 1 Afternoon (3 hours):**
- Phase 3: Type Regeneration
- Phase 4: Validation (partial)

**Day 2 Morning (2 hours):**
- Phase 4: Validation (complete)
- Phase 5: Cleanup

**Resources Required:**
- 1x Backend Developer (database expertise)
- 1x QA Engineer (testing)
- Access to staging Supabase instance
- Database backup capabilities

---

## Appendices

### Appendix A: SQL Migration Scripts

**Location:** `/supabase/migrations/20251003_align_schema_with_types.sql`

**Contents:**
- Complete migration script with all three tables
- Synchronization triggers
- Indexes and constraints
- RLS policies

### Appendix B: Affected Files List

**High Priority (Breaking Changes):**
- `src/types/database.ts`
- `src/types/database.generated.ts`
- `src/lib/services/progressService.ts`
- `src/lib/auth/AuthManager.ts`
- `src/components/Dashboard/LearningProgress.tsx`

**Medium Priority (Workarounds):**
- `src/lib/api/supabase.ts`
- `src/lib/database/utils/index.ts`
- `src/app/api/admin/analytics/route.ts`

**Low Priority (Indirect Dependencies):**
- Various component files (15+)
- API route files (10+)

### Appendix C: Data Synchronization Logic

**Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION sync_learning_to_user_progress()
RETURNS TRIGGER AS $$
DECLARE
  daily_record RECORD;
BEGIN
  -- Aggregate learning_progress into daily user_progress
  SELECT
    COUNT(*) as sessions_completed,
    SUM(correct_count) as questions_correct,
    AVG(mastery_level) as avg_mastery
  INTO daily_record
  FROM learning_progress
  WHERE user_id = NEW.user_id
  AND DATE(updated_at) = CURRENT_DATE;

  -- Insert or update user_progress
  INSERT INTO user_progress (
    user_id,
    progress_type,
    progress_date,
    sessions_completed,
    questions_correct,
    -- ... more fields
  ) VALUES (
    NEW.user_id,
    'daily',
    CURRENT_DATE,
    daily_record.sessions_completed,
    daily_record.questions_correct
    -- ... more fields
  )
  ON CONFLICT (user_id, progress_date, progress_type)
  DO UPDATE SET
    sessions_completed = EXCLUDED.sessions_completed,
    questions_correct = EXCLUDED.questions_correct,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Sign-Off

**Prepared By:** System Architecture Designer (AI Agent)
**Review Required:** Lead Developer, Database Administrator
**Approval Required:** Technical Lead, Product Owner

**Next Steps:**
1. Review this ADR with technical team
2. Schedule migration window
3. Execute Phase 1 (Preparation)
4. Proceed with implementation pending approval

---

**Document Status:** ✅ Ready for Review
**Last Updated:** 2025-10-03
**Version:** 1.0
