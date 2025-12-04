# GOAP Execution Plan - Plans A, B, C Implementation

**Project:** Describe It - Spanish Learning Platform
**Created:** December 3, 2025
**Status:** Ready for Execution
**Estimated Duration:** 16-22 days (3-4 weeks)

---

## 📊 Executive Summary

### Current State Analysis

- **Test Coverage:** 69.2% (36/52 database tests passing)
- **TypeScript Health:** 679 errors (reduced from 913)
- **Recent Progress:** RuVector integration, auto-save, progress endpoints
- **Overall Completion:** ~45% toward production-ready

### Goal State (Plans A+B+C Complete)

- **Plan A:** 95%+ test pass rate, zero TS errors, API alignment, security validated
- **Plan B:** Export/import, dashboard, offline PWA, flashcards, advanced search
- **Plan C:** DB optimization, caching, code splitting, monitoring, benchmarks

### Critical Path to Success

1. **Phase 1 (Days 1-7):** Stabilize core (Plan A) - Fix tests, resolve TS errors, align APIs
2. **Phase 2 (Days 8-15):** Build features (Plan B core) - Export, dashboard, flashcards
3. **Phase 3 (Days 16-22):** Optimize & polish (Plan B+C) - Offline, caching, monitoring

---

## 🎯 GOAP Action Graph

### World State Transformation

| Aspect              | Current    | Goal        | Gap                     |
| ------------------- | ---------- | ----------- | ----------------------- |
| **Tests Passing**   | 69.2%      | 95%+        | Fix 16 failing tests    |
| **TypeScript**      | 679 errors | 0 errors    | Resolve all type issues |
| **API Aligned**     | Partial    | Complete    | Signature validation    |
| **Security**        | Basic      | Validated   | Auth + validation       |
| **Auto-save**       | ✅ Working | ✅ Working  | -                       |
| **Export/Import**   | ❌ Missing | ✅ Complete | Build system            |
| **Dashboard**       | ❌ Missing | ✅ Complete | Build UI + API          |
| **Offline PWA**     | ❌ Missing | ✅ Complete | Service worker          |
| **Flashcards**      | ❌ Missing | ✅ Complete | Review system           |
| **Advanced Search** | Basic      | Semantic    | RuVector integration    |
| **DB Optimized**    | ❌ No      | ✅ Yes      | Indexes + queries       |
| **Caching**         | Basic      | Multi-layer | Browser+CDN+App+DB      |
| **Monitoring**      | ❌ No      | ✅ Active   | Sentry setup            |

### Action Dependencies (GOAP Planning)

```
Critical Path (Sequential):
A1 (Fix DB Tests) → A2 (Fix TS Errors) → A3 (Align APIs) → A4 (Security)
                                                ↓
        B1 (Export) + B2 (Dashboard) + C1 (DB Optimize) + C2 (Pagination)
                                                ↓
                    C3 (Caching) + B4 (Flashcards) + B5 (Search)
                                                ↓
                    B3 (Offline PWA) + C4 (Code Split) + C5 (Monitoring)
                                                ↓
                            C6 (Performance Benchmarks)

Parallel Opportunities:
- A1 + A2 can run concurrently (different teams)
- B1 + B2 + C1 can run in parallel (after Phase 1)
- C3 + C4 + C5 can run in parallel (after core features)
```

---

## 📋 Phase-by-Phase Execution Plan

### **Phase 1: Critical Stability (Days 1-7)**

**Goal:** Achieve 95%+ test pass rate, zero TypeScript errors, API alignment

#### Milestones

**M1.1: Database Tests Passing** (8 hours)

- **Action:** A1 - Fix Database Integration Tests
- **Deliverable:** 52/52 tests passing (current: 36/52)
- **Verification:** `npm run test:integration -- --grep database`
- **Priority:** P0 (Blocker)
- **Files to Fix:**
  - `tests/integration/database/supabase-client.test.ts`
  - Database connection handling
  - Transaction isolation
  - Mock data consistency

**M1.2: TypeScript Clean Build** (12 hours)

- **Action:** A2 - Resolve TypeScript Errors
- **Deliverable:** 0 errors (from 679)
- **Verification:** `npm run typecheck`
- **Priority:** P0 (Blocker)
- **Strategy:**
  1. Fix strict mode violations (any types, null checks)
  2. Update type definitions for RuVector integration
  3. Align component prop types
  4. Fix API response type mismatches

**M1.3: API Signatures Aligned** (6 hours)

- **Action:** A3 - Align API Signatures
- **Deliverable:** Type-safe API contracts
- **Verification:** API signature validation tests
- **Priority:** P0 (Blocker)
- **Key Files:**
  - `src/lib/api-client.ts`
  - `src/app/api/progress/route.ts`
  - `src/components/VocabularyBuilder/DescriptionNotebook.tsx`

**M1.4: Security Validation** (8 hours)

- **Action:** A4 - Implement Security Validation
- **Deliverable:** Auth middleware, input validation, rate limiting
- **Verification:** `npm run test -- --grep security`
- **Priority:** P0 (Blocker)
- **Components:**
  - JWT validation
  - Input sanitization
  - Rate limiting middleware
  - CORS configuration

**Phase 1 Total:** 34 hours (5-7 days)

**Success Criteria:**

- ✅ All database integration tests passing
- ✅ Zero TypeScript errors
- ✅ API contracts validated and documented
- ✅ Security middleware active on all protected endpoints
- ✅ CI/CD pipeline green

---

### **Phase 2: Feature Enhancement (Days 8-15)**

**Goal:** Complete export/import, dashboard, flashcards, database optimization

#### Milestones

**M2.1: Export/Import System** (10 hours)

- **Action:** B1 - Build Export/Import System
- **Deliverable:** Export to JSON/CSV, import with validation
- **Verification:** E2E tests for export/import workflows
- **Priority:** P1
- **Features:**
  - Export vocabulary lists to JSON
  - Export to CSV (Excel-compatible)
  - Import with schema validation
  - Bulk operations support

**M2.2: Progress Dashboard** (12 hours)

- **Action:** B2 - Create Progress Dashboard
- **Deliverable:** Dashboard UI with analytics
- **Verification:** Component tests + manual QA
- **Priority:** P1
- **Components:**
  - Stats cards (total learned, mastery level, streak)
  - Progress charts (Chart.js/Recharts)
  - Achievement badges
  - Activity graph
  - Recent activity feed

**M2.3: Flashcard Review System** (14 hours)

- **Action:** B4 - Build Flashcard Review System
- **Deliverable:** Spaced repetition system
- **Verification:** E2E user flow tests
- **Priority:** P1
- **Features:**
  - Flashcard UI (flip animation)
  - Spaced repetition algorithm (SM-2)
  - Review queue management
  - Mastery level tracking
  - Daily review goals

**M2.4: Database Optimization** (8 hours)

- **Action:** C1 - Optimize Database Queries
- **Deliverable:** Indexes, query optimization
- **Verification:** Query performance benchmarks
- **Priority:** P2
- **Optimizations:**
  - Add indexes on user_id, created_at, mastery_level
  - Optimize JOIN queries
  - Connection pooling (pg-pool)
  - Query plan analysis

**M2.5: Pagination Implementation** (6 hours)

- **Action:** C2 - Implement Pagination
- **Deliverable:** Cursor-based pagination for all lists
- **Verification:** Tests with 10k+ items
- **Priority:** P2
- **Implementation:**
  - Cursor-based pagination (not offset)
  - Infinite scroll support
  - Page size configuration
  - Total count optimization

**Phase 2 Total:** 50 hours (6-8 days)

**Success Criteria:**

- ✅ Export/import working for vocabulary, progress, sessions
- ✅ Dashboard showing real-time metrics
- ✅ Flashcard system with spaced repetition
- ✅ Database queries <100ms average
- ✅ Pagination handles large datasets efficiently

---

### **Phase 3: Performance & Polish (Days 16-22)**

**Goal:** Offline support, advanced search, caching, monitoring, benchmarks

#### Milestones

**M3.1: Multi-Layer Caching** (10 hours)

- **Action:** C3 - Multi-Layer Caching
- **Deliverable:** Browser + CDN + App + DB caching
- **Verification:** Cache hit rate >80%
- **Priority:** P1
- **Layers:**
  1. Browser cache (service worker)
  2. CDN cache (Vercel Edge)
  3. Application cache (Vercel KV/Redis)
  4. Database cache (Supabase materialized views)

**M3.2: Advanced Search/Filter** (10 hours)

- **Action:** B5 - Advanced Search/Filter
- **Deliverable:** Semantic search with RuVector
- **Verification:** Search relevance tests
- **Priority:** P1
- **Features:**
  - Semantic search (RuVector embeddings)
  - Full-text search (PostgreSQL)
  - Filters (difficulty, category, mastery)
  - Sorting options
  - Search suggestions

**M3.3: Offline Support (PWA)** (16 hours)

- **Action:** B3 - Implement Offline Support
- **Deliverable:** Service worker, offline mode
- **Verification:** Offline E2E tests
- **Priority:** P2
- **Implementation:**
  - Service worker registration
  - Offline caching strategy
  - Background sync queue
  - Conflict resolution
  - PWA manifest and icons

**M3.4: Code Splitting** (8 hours)

- **Action:** C4 - Code Splitting Optimization
- **Deliverable:** Dynamic imports, lazy loading
- **Verification:** Bundle size <500kb
- **Priority:** P2
- **Optimizations:**
  - Route-based code splitting
  - Component lazy loading
  - Dynamic imports for heavy libraries
  - Tree shaking optimization
  - Bundle analysis

**M3.5: Error Monitoring** (6 hours)

- **Action:** C5 - Error Monitoring Setup
- **Deliverable:** Sentry integration
- **Verification:** Error capture tests
- **Priority:** P2
- **Setup:**
  - Sentry SDK integration
  - Error boundary reporting
  - Performance monitoring
  - User feedback widget
  - Alert configuration

**M3.6: Performance Benchmarks** (8 hours)

- **Action:** C6 - Performance Benchmark Suite
- **Deliverable:** Automated benchmarks
- **Verification:** Baseline established
- **Priority:** P2
- **Benchmarks:**
  - API response times
  - Database query performance
  - Bundle size tracking
  - Lighthouse CI integration
  - Regression detection

**Phase 3 Total:** 58 hours (5-7 days)

**Success Criteria:**

- ✅ Caching reduces API calls by 60%
- ✅ Search returns results in <200ms
- ✅ PWA works offline for core features
- ✅ Bundle size reduced by 30%
- ✅ Error monitoring active with alerts
- ✅ Performance benchmarks passing in CI

---

## 🚀 Immediate Next Actions

### Day 1 (Today)

1. **Start A1: Fix Database Integration Tests** (8 hours)
   - Identify the 16 failing tests
   - Fix connection issues
   - Add transaction isolation
   - Run full test suite

2. **Start A2: Resolve TypeScript Errors (Phase 1)** (4 hours)
   - Categorize 679 errors by type
   - Fix strictNullChecks violations (highest impact)
   - Update RuVector type definitions

### Day 2-3

3. **Complete A2: TypeScript Errors** (8 hours remaining)
   - Fix component prop types
   - Align API response types
   - Run typecheck continuously

4. **Complete A1: Database Tests** (if not done)
   - Verify all 52 tests pass
   - Document test patterns

### Day 4-5

5. **Complete A3: API Signature Alignment** (6 hours)
   - Update `api-client.ts` with proper types
   - Fix DescriptionNotebook API calls
   - Add signature validation tests

6. **Complete A4: Security Validation** (8 hours)
   - Implement JWT validation middleware
   - Add input sanitization
   - Configure rate limiting
   - Test security endpoints

### Day 6-7

7. **Phase 1 Validation & Handoff**
   - Run full test suite (target: 95%+)
   - Verify zero TypeScript errors
   - Security audit review
   - Document API contracts
   - **Decision Point:** Proceed to Phase 2 only if all P0 items complete

---

## 📊 Resource Requirements

### Developer Time

- **Total Estimated Hours:** 142 hours
- **Full-Time Equivalent:** 3.5 weeks (1 developer)
- **Parallel Team:** 2-3 weeks (2-3 developers)

### Skills Needed

1. **TypeScript/React** (Advanced) - for A2, A3, all UI components
2. **Next.js App Router** (Intermediate) - for API routes, SSR
3. **Supabase/PostgreSQL** (Intermediate) - for A1, C1, C2
4. **Testing** (Intermediate) - Jest/Vitest, Playwright
5. **Performance Optimization** (Intermediate) - for C3, C4, C6
6. **PWA Development** (Basic) - for B3

### External Services

- **Supabase:** Database, auth, storage (Free tier → $25/month)
- **Vercel:** Hosting, KV cache ($20/month Pro tier recommended)
- **Sentry:** Error monitoring (Free tier → $26/month)
- **Redis:** Optional for advanced caching (if not using Vercel KV)

### Estimated Monthly Cost

- **Development:** $50-100/month for services
- **Production:** $100-200/month (depends on usage)

---

## ⚠️ Risk Mitigation

### High-Priority Risks

**Risk 1: TypeScript errors prove intractable**

- **Probability:** Medium
- **Impact:** High (blocks Phase 1)
- **Mitigation:**
  - Incremental fixing by module
  - Use `// @ts-expect-error` as last resort with explanation
  - Separate PR per module for easier review
  - Consider temporary strictness reduction if necessary

**Risk 2: Database tests remain unstable**

- **Probability:** Low
- **Impact:** Critical (blocks all phases)
- **Mitigation:**
  - Isolate test database from development
  - Use database transactions for test isolation
  - Add retry logic for flaky tests
  - Mock external dependencies consistently

**Risk 3: Offline support complexity underestimated**

- **Probability:** High
- **Impact:** Medium (can defer to Phase 4)
- **Mitigation:**
  - Start with read-only offline support
  - Defer conflict resolution to later phase
  - Use battle-tested libraries (Workbox)
  - Incremental rollout with feature flags

**Risk 4: Scope creep during implementation**

- **Probability:** High
- **Impact:** High (timeline slip)
- **Mitigation:**
  - Strict adherence to GOAP action plan
  - "Nice-to-have" features go to backlog
  - Weekly progress review against plan
  - Clear definition of "done" for each action

---

## 📈 Success Metrics

### Plan A Success Metrics

- **Test Pass Rate:** ≥95% (target: 100%)
- **TypeScript Errors:** 0
- **API Test Coverage:** ≥90%
- **Security Audit:** Passing
- **CI/CD Pipeline:** Green

### Plan B Success Metrics

- **Export Formats:** ≥2 (JSON, CSV)
- **Dashboard Components:** ≥5 (stats, charts, achievements, streak, activity)
- **Flashcard Coverage:** 100% of vocabulary
- **Search Response Time:** <200ms
- **Offline Features:** ≥3 (browse, study, flashcards)

### Plan C Success Metrics

- **DB Query Performance:** <100ms average
- **Cache Hit Rate:** >80%
- **Bundle Size Reduction:** ≥30%
- **Error Monitoring Coverage:** 100%
- **Lighthouse Performance Score:** ≥90

---

## 📚 Documentation Updates Required

As each phase completes, update:

1. **API Documentation**
   - Aligned signatures and contracts
   - New endpoints (export, import, flashcards)
   - Rate limiting details

2. **User Guides**
   - Export/import instructions
   - Dashboard feature guide
   - Flashcard review system

3. **Developer Docs**
   - Caching strategy documentation
   - Performance optimization guide
   - Offline PWA architecture

4. **Deployment Checklist**
   - Updated environment variables
   - Database migration steps
   - Monitoring setup guide

---

## 🎯 Decision Points

### After Phase 1 (Day 7)

**Decision:** Proceed to Phase 2?

- **Criteria:**
  - ✅ All P0 blockers resolved
  - ✅ Test pass rate ≥95%
  - ✅ Zero TypeScript errors
  - ✅ Security validated
- **If No:** Extend Phase 1, reassess timeline

### After Phase 2 (Day 15)

**Decision:** Proceed to Phase 3?

- **Criteria:**
  - ✅ Export/import working
  - ✅ Dashboard functional
  - ✅ Flashcards implemented
  - ✅ Database optimized
- **If No:** Defer Phase 3 features, ship MVP

### After Phase 3 (Day 22)

**Decision:** Production deployment?

- **Criteria:**
  - ✅ All success metrics met
  - ✅ Performance benchmarks passing
  - ✅ Security audit complete
  - ✅ Monitoring active
- **If No:** Extend polish phase, fix critical issues

---

## 🏁 Final Checklist (Pre-Production)

- [ ] All 52 database tests passing
- [ ] Zero TypeScript errors
- [ ] API documentation complete
- [ ] Security audit passed
- [ ] Performance benchmarks established
- [ ] Error monitoring active
- [ ] Export/import tested with real data
- [ ] Dashboard showing accurate metrics
- [ ] Flashcard system user-tested
- [ ] Offline mode functional (if in scope)
- [ ] Caching strategy validated
- [ ] CI/CD pipeline configured
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Deployment runbook created

---

**Next Step:** Start with Action A1 (Fix Database Integration Tests) and Action A2 (Resolve TypeScript Errors) in parallel if possible.

**Review Frequency:** Weekly progress review against this plan, adjust as needed based on actual velocity.

**Contact:** For questions or clarifications, refer to the detailed JSON plan at `docs/planning/goap-execution-plan.json`.
