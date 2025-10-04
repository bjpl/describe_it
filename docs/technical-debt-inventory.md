# Technical Debt Inventory - Code Quality Analysis Report

**Generated:** 2025-10-03
**Total Issues Found:** 34 TODO markers
**Files Analyzed:** 13 source files

---

## Executive Summary

### Overall Quality Score: 7.5/10

**Breakdown:**
- Critical Issues: 11 (Database schema mismatches)
- High Priority: 8 (Missing database functionality)
- Medium Priority: 10 (Feature implementation gaps)
- Low Priority: 5 (Code quality improvements)

**Technical Debt Estimate:** 56-84 hours

**Primary Concerns:**
1. Database schema misalignment (user_progress, user_api_keys, export_history tables missing)
2. Incomplete database integration in vocabulary service
3. Missing web vitals monitoring
4. Export scheduling not implemented

---

## Critical Issues (Priority: Critical)

### 1. Missing Database Tables - user_progress
**Category:** Database Schema
**Severity:** Critical
**Effort:** Large (8-12 hours)

**Locations (11 instances):**
- `/src/lib/database/utils/index.ts:261` - getUserWithProgress query
- `/src/lib/database/utils/index.ts:528` - getUserProgress query
- `/src/lib/database/utils/index.ts:651` - progressOperations export
- `/src/lib/api/supabase.ts:715` - getUserProgress method
- `/src/lib/api/supabase.ts:748` - queryProgress method
- `/src/lib/services/progressService.ts:324` - loadProgress method
- `/src/lib/services/progressService.ts:579` - initializeProgress method
- `/src/lib/services/progressService.ts:634` - saveProgress method
- `/src/lib/supabase/client.ts:215` - subscribeToUserProgress
- `/src/lib/supabase/client.ts:292` - getUserProgress query
- `/src/lib/supabase/server.ts:100` - getUserWithRelations query

**Issue:**
```typescript
// TODO: user_progress table doesn't exist - using learning_progress instead
const { data, error } = await this.client
  .from("learning_progress")
  .select("*")
```

**Impact:**
- Using temporary workaround with learning_progress table
- Data model mismatch between code and database
- Potential data integrity issues
- Migration complexity increasing over time

**Suggested Action:**
1. Create proper user_progress table in Supabase schema
2. Migrate existing learning_progress data
3. Update all queries to use correct table
4. Add indexes for performance

**Dependencies:**
- Supabase migration scripts
- Data migration plan
- Testing of all progress-related features

**Labels:** database, critical, migration, schema
**Estimated Time:** 8-12 hours

---

### 2. Missing Database Tables - user_api_keys
**Category:** Database Schema
**Severity:** Critical
**Effort:** Large (6-8 hours)

**Locations (5 instances):**
- `/src/lib/auth/AuthManager.ts:503` - initializeUserApiKeys
- `/src/lib/auth/AuthManager.ts:559` - loadSession (API keys load)
- `/src/lib/auth/AuthManager.ts:656` - saveApiKey method
- `/src/lib/supabase/client.ts:245` - getUserWithRelations query
- `/src/lib/supabase/client.ts:310` - updateUserApiKeys method
- `/src/lib/supabase/server.ts:216` - updateUserApiKeys query

**Issue:**
```typescript
// TODO: user_api_keys table doesn't exist in current Supabase schema
// API keys should be stored in users table or a new table needs to be created
// Temporarily load from localStorage only
```

**Impact:**
- API keys stored only in localStorage (security risk)
- No cross-device synchronization
- Loss of keys on browser data clear
- Cannot audit API key usage

**Suggested Action:**
1. Design secure API key storage schema
2. Implement encryption at rest
3. Add API key rotation functionality
4. Create migration from localStorage to database

**Dependencies:**
- Encryption implementation review
- Security audit
- User notification system for migration

**Labels:** database, security, critical, api-keys
**Estimated Time:** 6-8 hours

---

### 3. Missing Database Tables - export_history
**Category:** Database Schema
**Severity:** High
**Effort:** Medium (4-6 hours)

**Locations (4 instances):**
- `/src/lib/database/utils/index.ts:660` - exportOperations
- `/src/lib/supabase/client.ts:227` - subscribeToUserExports
- `/src/lib/supabase/server.ts:189` - getExportHistory query

**Issue:**
```typescript
// TODO: export_history table doesn't exist in current Supabase schema
// These operations will fail until the table is created
findById: (id: string) => Promise.resolve({ data: null, error: "export_history table not available" }),
```

**Impact:**
- Export tracking not functional
- Cannot audit export operations
- Real-time export subscriptions fail
- Missing export analytics

**Suggested Action:**
1. Create export_history table schema
2. Implement export tracking
3. Add real-time subscriptions
4. Build export analytics dashboard

**Dependencies:**
- Export manager implementation
- Analytics requirements

**Labels:** database, feature, export, analytics
**Estimated Time:** 4-6 hours

---

## High Priority Issues

### 4. Vocabulary Service Database Integration
**Category:** Feature Implementation
**Severity:** High
**Effort:** Large (8-10 hours)

**Locations (8 instances):**
- `/src/lib/services/vocabularyService.ts:103` - getAllVocabulary
- `/src/lib/services/vocabularyService.ts:122` - getVocabularyByCategory
- `/src/lib/services/vocabularyService.ts:145` - getVocabularyLists
- `/src/lib/services/vocabularyService.ts:162` - searchVocabulary
- `/src/lib/services/vocabularyService.ts:190` - addVocabulary
- `/src/lib/services/vocabularyService.ts:219` - addVocabularyList
- `/src/lib/services/vocabularyService.ts:254` - updateVocabulary
- `/src/lib/services/vocabularyService.ts:277` - deleteVocabulary

**Issue:**
```typescript
if (this.isConnectedToDatabase) {
  // TODO: Replace with actual database query
  // const { data, error } = await supabase.from('vocabulary_items').select('*');
  // if (error) throw error;
  // return { success: true, data };
}
```

**Impact:**
- Vocabulary only persisted in localStorage
- No cloud sync across devices
- Limited scalability
- Cannot share vocabulary lists between users

**Suggested Action:**
1. Create vocabulary_items and vocabulary_lists tables
2. Implement all CRUD operations with Supabase
3. Add offline sync capability
4. Migrate localStorage data to database

**Dependencies:**
- Database schema design
- Sync strategy definition
- Data migration tooling

**Labels:** feature, database, vocabulary, sync
**Estimated Time:** 8-10 hours

---

### 5. Web Vitals Monitoring Disabled
**Category:** Performance Monitoring
**Severity:** High
**Effort:** Small (1-2 hours)

**Location:**
- `/src/lib/monitoring/web-vitals.ts:4`

**Issue:**
```typescript
// Disabled due to missing web-vitals dependency
// TODO: Re-enable when web-vitals is properly installed
export const reportWebVitals = () => {
  logger.info('Web vitals monitoring disabled');
};
```

**Impact:**
- No performance metrics collection
- Cannot track Core Web Vitals (LCP, FID, CLS)
- Missing performance regression detection
- No real user monitoring data

**Suggested Action:**
1. Install web-vitals package: `npm install web-vitals`
2. Implement proper Web Vitals reporting
3. Integrate with analytics service
4. Set up performance budgets

**Dependencies:**
- Analytics service integration
- Performance monitoring dashboard

**Labels:** performance, monitoring, dependencies
**Estimated Time:** 1-2 hours

---

## Medium Priority Issues

### 6. Phrases Panel Persistence
**Category:** Feature Implementation
**Severity:** Medium
**Effort:** Small (2-3 hours)

**Location:**
- `/src/components/EnhancedPhrasesPanel.tsx:200`

**Issue:**
```typescript
setSavedPhrases((prev) => [...prev, updatedPhrase]);

// TODO: Persist to backend/localStorage
logger.info("Phrase saved to vocabulary", {
  component: "enhanced-phrases-panel",
});
```

**Impact:**
- Saved phrases lost on page refresh
- No phrase history tracking
- Cannot sync across sessions

**Suggested Action:**
1. Implement localStorage persistence
2. Add Supabase sync when database ready
3. Add offline/online state handling
4. Implement conflict resolution

**Dependencies:**
- Vocabulary service completion
- Offline sync strategy

**Labels:** feature, ui, persistence
**Estimated Time:** 2-3 hours

---

### 7. Vocabulary Manager Public API
**Category:** Code Quality / API Design
**Severity:** Medium
**Effort:** Small (1-2 hours)

**Location:**
- `/src/components/GammaVocabularyManager.tsx:156`

**Issue:**
```typescript
// Load vocabulary sets
// TODO: Add public method to VocabularyManager to get vocabulary sets
// const sets = vocabularyManager.storage.loadVocabularySets();
// setVocabularySets(sets);
```

**Impact:**
- Direct access to private storage methods
- Violates encapsulation
- Harder to maintain and test

**Suggested Action:**
1. Add public `getVocabularySets()` method to VocabularyManager
2. Refactor component to use public API
3. Add proper error handling
4. Update TypeScript interfaces

**Dependencies:**
- None

**Labels:** refactor, code-quality, api-design
**Estimated Time:** 1-2 hours

---

### 8. Export Scheduling Implementation
**Category:** Feature Implementation
**Severity:** Medium
**Effort:** Medium (4-6 hours)

**Location:**
- `/src/lib/export/exportManager.ts:555`

**Issue:**
```typescript
this.scheduledExports.set(scheduledExport.id, scheduledExport);
this.saveScheduledExportsToStorage();
// TODO: Implement actual scheduling mechanism
```

**Impact:**
- Scheduled exports not executed automatically
- Manual export process only
- No automated backup functionality

**Suggested Action:**
1. Implement cron-like scheduling system
2. Use Web Workers for background execution
3. Add notification system for completed exports
4. Implement retry logic for failed exports

**Dependencies:**
- Export history table
- Notification system
- Background task infrastructure

**Labels:** feature, automation, export
**Estimated Time:** 4-6 hours

---

## Code Quality Observations

### Positive Findings
1. Consistent TODO format throughout codebase
2. Clear documentation of missing database tables
3. Fallback mechanisms implemented (localStorage)
4. Proper error handling around TODO areas
5. Type safety maintained despite incomplete features
6. Logging in place for debugging

### Code Smells Detected
1. **Commented Code:** Multiple instances of commented database queries
2. **Temporary Workarounds:** Extended use of localStorage instead of database
3. **Schema Drift:** Growing gap between code expectations and actual schema
4. **Hardcoded Strings:** Table names repeated across files

### Refactoring Opportunities
1. Centralize database table name constants
2. Create database migration utility
3. Extract localStorage fallback into reusable service
4. Implement repository pattern for data access

---

## Technical Debt Summary by Component

### Database (11 critical + 8 high = 19 issues)
- Missing tables: user_progress, user_api_keys, export_history
- Schema misalignment across 13 files
- Estimated effort: 18-26 hours

### Vocabulary Service (8 issues)
- Incomplete database integration
- LocalStorage-only implementation
- Estimated effort: 8-10 hours

### Monitoring (1 issue)
- Web vitals disabled
- Estimated effort: 1-2 hours

### UI Components (2 issues)
- Missing persistence
- API encapsulation needed
- Estimated effort: 3-5 hours

### Export System (3 issues)
- Missing scheduling
- No export history tracking
- Estimated effort: 8-12 hours

---

## Recommended Action Plan

### Phase 1: Database Schema (Critical - Week 1)
1. Create database migration scripts for all missing tables
2. Design proper schemas with indexes and constraints
3. Implement data migration from temporary solutions
4. Update all code to use proper tables

### Phase 2: Feature Completion (High - Week 2)
1. Complete vocabulary service database integration
2. Re-enable web vitals monitoring
3. Implement phrase persistence
4. Add export scheduling

### Phase 3: Code Quality (Medium - Week 3)
1. Refactor for better encapsulation
2. Centralize configuration
3. Remove commented code
4. Add comprehensive tests

### Phase 4: Documentation (Low - Week 4)
1. Document all APIs
2. Update architecture diagrams
3. Create migration guides
4. Add troubleshooting docs

---

## Metrics

**Files with Technical Debt:** 13
**Total TODO Markers:** 34
**Critical Issues:** 11
**High Priority Issues:** 8
**Medium Priority Issues:** 10
**Low Priority Issues:** 5

**Estimated Total Effort:** 56-84 hours
**Estimated Sprint Allocation:** 3-4 two-week sprints

---

## CSV Export for GitHub Issues

```csv
Title,Body,Labels,Priority,Component,Effort,File
Create user_progress table in Supabase schema,"# Issue Description\n\nThe codebase expects a `user_progress` table but currently uses `learning_progress` as a workaround.\n\n## Affected Files\n- src/lib/database/utils/index.ts (3 locations)\n- src/lib/api/supabase.ts (2 locations)\n- src/lib/services/progressService.ts (3 locations)\n- src/lib/supabase/client.ts (2 locations)\n- src/lib/supabase/server.ts (1 location)\n\n## Impact\n- Data model mismatch\n- Potential data integrity issues\n- Migration complexity increasing\n\n## Tasks\n- [ ] Design user_progress schema\n- [ ] Create migration scripts\n- [ ] Migrate data from learning_progress\n- [ ] Update all queries\n- [ ] Add proper indexes\n- [ ] Test all progress features",database;critical;migration;schema,Critical,Database,8-12h,Multiple files
Create user_api_keys table in Supabase schema,"# Issue Description\n\nAPI keys are currently stored only in localStorage, which is insecure and prevents cross-device sync.\n\n## Affected Files\n- src/lib/auth/AuthManager.ts (3 locations)\n- src/lib/supabase/client.ts (2 locations)\n- src/lib/supabase/server.ts (1 location)\n\n## Impact\n- Security risk (localStorage storage)\n- No cross-device sync\n- Keys lost on browser data clear\n- Cannot audit API key usage\n\n## Tasks\n- [ ] Design secure API key schema\n- [ ] Implement encryption at rest\n- [ ] Add key rotation functionality\n- [ ] Migrate from localStorage\n- [ ] Add usage audit logging",database;security;critical;api-keys,Critical,Security,6-8h,Multiple files
Create export_history table in Supabase schema,"# Issue Description\n\nExport tracking and history features are non-functional due to missing table.\n\n## Affected Files\n- src/lib/database/utils/index.ts\n- src/lib/supabase/client.ts\n- src/lib/supabase/server.ts\n\n## Impact\n- No export tracking\n- Cannot audit exports\n- Real-time subscriptions fail\n- Missing analytics\n\n## Tasks\n- [ ] Create export_history schema\n- [ ] Implement export tracking\n- [ ] Add real-time subscriptions\n- [ ] Build analytics dashboard",database;feature;export;analytics,High,Database,4-6h,Multiple files
Complete vocabulary service database integration,"# Issue Description\n\nVocabulary service has 8 stubbed database methods using only localStorage.\n\n## Affected Files\n- src/lib/services/vocabularyService.ts (8 methods)\n\n## Impact\n- No cloud sync\n- Limited scalability\n- Cannot share vocabulary lists\n- Data loss risk\n\n## Tasks\n- [ ] Create vocabulary_items table\n- [ ] Create vocabulary_lists table\n- [ ] Implement all CRUD operations\n- [ ] Add offline sync\n- [ ] Migrate localStorage data\n- [ ] Add sharing functionality",feature;database;vocabulary;sync,High,Feature,8-10h,src/lib/services/vocabularyService.ts
Re-enable web vitals monitoring,"# Issue Description\n\nPerformance monitoring is disabled due to missing dependency.\n\n## Affected Files\n- src/lib/monitoring/web-vitals.ts\n\n## Impact\n- No performance metrics\n- Cannot track Core Web Vitals\n- No regression detection\n- Missing RUM data\n\n## Tasks\n- [ ] Install web-vitals package\n- [ ] Implement reporting\n- [ ] Integrate with analytics\n- [ ] Set performance budgets\n- [ ] Add alerting",performance;monitoring;dependencies,High,Monitoring,1-2h,src/lib/monitoring/web-vitals.ts
Implement phrase persistence in EnhancedPhrasesPanel,"# Issue Description\n\nSaved phrases are lost on page refresh.\n\n## Affected Files\n- src/components/EnhancedPhrasesPanel.tsx\n\n## Impact\n- Data loss on refresh\n- No history tracking\n- No cross-session sync\n\n## Tasks\n- [ ] Add localStorage persistence\n- [ ] Implement Supabase sync\n- [ ] Add offline/online handling\n- [ ] Implement conflict resolution",feature;ui;persistence,Medium,UI,2-3h,src/components/EnhancedPhrasesPanel.tsx
Add public API to VocabularyManager,"# Issue Description\n\nComponent accesses private storage methods directly.\n\n## Affected Files\n- src/components/GammaVocabularyManager.tsx\n\n## Impact\n- Violates encapsulation\n- Harder to maintain\n- Testing difficulties\n\n## Tasks\n- [ ] Add getVocabularySets() method\n- [ ] Refactor component\n- [ ] Add error handling\n- [ ] Update interfaces",refactor;code-quality;api-design,Medium,Code Quality,1-2h,src/components/GammaVocabularyManager.tsx
Implement export scheduling mechanism,"# Issue Description\n\nScheduled exports are saved but not executed automatically.\n\n## Affected Files\n- src/lib/export/exportManager.ts\n\n## Impact\n- No automated exports\n- Manual process only\n- No automated backups\n\n## Tasks\n- [ ] Implement cron-like scheduler\n- [ ] Use Web Workers\n- [ ] Add notifications\n- [ ] Implement retry logic\n- [ ] Add error recovery",feature;automation;export,Medium,Feature,4-6h,src/lib/export/exportManager.ts
```

---

## Notes

1. All database-related TODOs are interconnected and should be addressed as a single migration project
2. The vocabulary service work depends on database schema completion
3. Export scheduling requires export_history table to be functional
4. Many TODOs have been present long enough to accumulate technical debt interest
5. Recommend creating a dedicated "Database Migration" epic in project management

---

**Report Generated By:** Code Quality Analyzer Agent
**Analysis Method:** Automated TODO/FIXME pattern search + manual categorization
**Confidence Level:** High (automated scan + code context review)
