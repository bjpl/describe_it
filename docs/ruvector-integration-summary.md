# RuVector Integration Coordination Plan

**Issued by:** Queen Coordinator
**Date:** 2025-12-01
**Status:** Ready for Execution
**Complexity:** High (5 phases, 14 hours estimated)

## Executive Summary

This plan orchestrates the full integration of RuVector semantic search, knowledge graphs, and GNN-enhanced learning into the describe_it application. The integration enhances the existing SM-2 spaced repetition algorithm with graph neural network predictions while maintaining backwards compatibility.

## Architecture Analysis

### Existing Infrastructure ✅
- **Vector Services:** 6 services ready at `/src/lib/vector/`
  - EmbeddingService, VectorSearchService, GraphService
  - LearningService, SpacedRepetitionBridge, SemanticCacheService
- **API Layer:** 53 endpoints using Next.js App Router + Supabase
- **Algorithms:** SM-2 Spaced Repetition at `/src/lib/algorithms/spaced-repetition.ts`
- **Search:** SQL LIKE queries at `/src/app/api/search/vocabulary/route.ts`

### Missing Components ⚠️
- **Store Layer:** No `/src/stores/` directory exists (needs `learningSessionStore.ts`)
- **Vector API:** No `/src/app/api/vector/*` endpoints
- **Environment:** RUVECTOR_* environment variables not configured
- **Tests:** No integration tests for vector functionality

## 5-Phase Integration Plan

### Phase 1: API Layer Foundation (2 hours) 🔴 CRITICAL
**Parallel Execution:** Yes
**Dependencies:** None

**Create 5 Vector Endpoints:**
1. `POST /api/vector/embed` - Generate embeddings
2. `GET /api/vector/search` - Semantic vector search
3. `POST /api/vector/predict` - GNN learning predictions
4. `GET /api/vector/cache` - Semantic cache queries
5. `POST/GET /api/vector/graph` - Knowledge graph operations

**Success Criteria:**
- All endpoints respond 200 OK
- Use `@/lib/logger` for logging
- Match existing API error handling pattern
- Rate limiting applied

**Rollback:** Delete `/src/app/api/vector/` directory

---

### Phase 2: Store Layer Integration (3 hours) 🔴 CRITICAL
**Parallel Execution:** No
**Dependencies:** Phase 1

**Create:**
- `/src/stores/learningSessionStore.ts` - Zustand store with GNN integration
- `/src/stores/vectorSearchStore.ts` - Vector search state management

**Modify:**
- `/src/lib/algorithms/spaced-repetition.ts` - Add optional GNN enhancement

**Success Criteria:**
- learningSessionStore created with full type safety
- SM-2 algorithm still works without GNN
- Store state persists across page reloads
- Bridge integration tested

**Rollback:** Revert spaced-repetition.ts, delete store files

---

### Phase 3: Search Enhancement (2 hours) 🟡 HIGH
**Parallel Execution:** No
**Dependencies:** Phases 1, 2

**Create:**
- `/src/lib/search/hybrid-search.ts` - Merge vector + SQL results

**Modify:**
- `/src/app/api/search/vocabulary/route.ts` - Implement hybrid search with fallback

**Algorithm:**
1. Check feature flag `RUVECTOR_ENABLED`
2. If enabled: Run vector search + SQL search in parallel
3. Merge results, rank by (semantic_similarity × 0.6) + (recency × 0.4)
4. If vector fails: Fall back to SQL-only

**Success Criteria:**
- Hybrid search returns combined results
- Graceful fallback to SQL when vector disabled
- Response time < 500ms
- Existing SQL tests still pass

**Rollback:** Revert vocabulary/route.ts to SQL-only

---

### Phase 4: Algorithm Bridge Activation (3 hours) 🟡 HIGH
**Parallel Execution:** No
**Dependencies:** Phase 2

**Create:**
- `/src/lib/algorithms/hybrid-scheduler.ts` - High-level SM-2 + GNN API

**Modify:**
- `/src/stores/learningSessionStore.ts` - Wire to SpacedRepetitionBridge
  - `recordActivity` → sync to graph
  - Add `getEnhancedSchedule` method
  - Add `updateCardWithGNN` method

**Success Criteria:**
- GNN predictions enhance SM-2 when enabled
- SM-2 works normally when GNN unavailable
- Session results sync to vector graph
- Hybrid schedule weights: 60% SM-2, 40% GNN

**Rollback:** Disable GNN feature flag, revert store changes

---

### Phase 5: Environment & Testing (4 hours) 🔴 CRITICAL
**Parallel Execution:** Yes (tests and docs)
**Dependencies:** Phases 1-4

**Create:**
- `/tests/integration/vector-api.test.ts` - Test all 5 vector endpoints
- `/tests/unit/spaced-repetition-bridge.test.ts` - Bridge unit tests
- `/tests/unit/hybrid-search.test.ts` - Hybrid search tests
- `/docs/ruvector-integration-guide.md` - User documentation
- `/scripts/validate-ruvector.ts` - Setup validation script

**Modify:**
- `/.env.example` - Add RUVECTOR_* variables section

**Success Criteria:**
- All tests pass (existing 122 + new tests)
- Environment fully documented
- Validation script confirms setup
- Zero breaking changes

**Rollback:** Revert .env changes, disable feature flags

---

## Environment Configuration

### Required Variables
```bash
RUVECTOR_ENABLED=false                    # Master switch
RUVECTOR_API_KEY=                         # Optional (local agentdb)
RUVECTOR_ENDPOINT=http://localhost:8080   # Service endpoint
```

### Optional Variables
```bash
RUVECTOR_GNN_ENABLED=false               # Enable GNN predictions
RUVECTOR_CACHE_ENABLED=true              # Enable semantic cache
RUVECTOR_SEARCH_THRESHOLD=0.7            # Min similarity threshold
RUVECTOR_EMBEDDING_MODEL=claude-3-5-sonnet-20241022
RUVECTOR_EMBEDDING_DIMENSIONS=1536
RUVECTOR_BATCH_SIZE=10
RUVECTOR_SEARCH_LIMIT=10
RUVECTOR_CACHE_TTL=3600
```

## Execution Strategy

### Critical Path
```
Phase 1 (API) → Phase 2 (Stores) → Phase 4 (Bridge) → Phase 5 (Tests)
```

### Parallelization Opportunities
- **Phase 1:** All 5 API endpoints created concurrently
- **Phase 5:** Tests and documentation created concurrently
- **Phases 2-4:** Sequential (dependencies)

### Risk Mitigation
1. **Feature Flags:** Gradual rollout with `RUVECTOR_ENABLED`
2. **Backwards Compatibility:** All phases preserve existing functionality
3. **Fallback Strategy:** Graceful degradation on vector service failure
4. **Rollback Plans:** Each phase has specific rollback instructions
5. **Test Preservation:** All 122 existing tests must remain passing

## Quality Gates

### Phase Checkpoints
- ✅ Phase 1: All vector endpoints operational
- ✅ Phase 2: Stores integrated with GNN bridge
- ✅ Phase 3: Hybrid search functional with fallback
- ✅ Phase 4: GNN-enhanced scheduling active
- ✅ Phase 5: Integration validated and documented

### Metrics to Track
- Files created/modified
- Tests passing/failing (target: 100%)
- API response times (target: <500ms)
- GNN prediction accuracy (if enabled)

## Total Estimated Time: 14 hours

### By Phase
- Phase 1: 2 hours (API endpoints)
- Phase 2: 3 hours (Store integration)
- Phase 3: 2 hours (Hybrid search)
- Phase 4: 3 hours (Bridge activation)
- Phase 5: 4 hours (Testing & docs)

## Royal Decree

**Mandate:** This integration shall proceed in phases with strict checkpoints. Each phase must complete successfully before the next begins. Backwards compatibility is NON-NEGOTIABLE.

**Succession Protocol:** If the Queen Coordinator becomes unavailable, the collective-intelligence-coordinator shall assume command using this plan.

**Reporting Frequency:** Every phase completion must be reported with:
- Files created/modified
- Tests passing/failing
- Any blockers encountered
- Time spent vs estimated

---

## Next Steps

1. **Human Approval:** Review this plan for approval
2. **Environment Setup:** Add RUVECTOR_* variables to `.env.local`
3. **Phase 1 Execution:** Create 5 vector API endpoints (parallel)
4. **Checkpoint Review:** Validate Phase 1 before proceeding
5. **Sequential Execution:** Phases 2-4 in order
6. **Final Validation:** Phase 5 tests and documentation

## Files Reference

- **Full Plan:** `/docs/ruvector-integration-plan.json`
- **This Summary:** `/docs/ruvector-integration-summary.md`
- **Vector Services:** `/src/lib/vector/`
- **Existing Search:** `/src/app/api/search/vocabulary/route.ts`
- **SM-2 Algorithm:** `/src/lib/algorithms/spaced-repetition.ts`

---

**Issued by Queen Coordinator**
**Reign Commenced:** 2025-12-01T00:00:00Z
**Throne Room:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/describe_it`
