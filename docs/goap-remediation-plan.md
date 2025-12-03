# GOAP Optimal Remediation Plan - describe-it Project

**Generated**: December 2, 2025
**Planner**: Goal-Oriented Action Planning Agent
**Algorithm**: A* Search with Cost Optimization

---

## Executive Summary

This plan uses Goal-Oriented Action Planning (GOAP) to create an optimal sequence of remediation actions for the describe-it project. The plan identifies the **critical path** (actions that block other work), **parallelization opportunities** (actions that can run concurrently), and **cost-benefit tradeoffs**.

**Total Duration**: ~14 hours (split over 2 days recommended)
**Total Cost**: 22.5 units
**Parallel Agents**: 3 maximum
**Expected Quality Improvement**: 60% → 85%+

---

## Current State Analysis

### World Variables (December 2, 2025)

| Variable | Current | Target | Status |
|----------|---------|--------|--------|
| `tests_runnable` | ❌ FALSE | ✅ TRUE | **CRITICAL BLOCKER** |
| `endpoints_rate_limited` | ⚠️ 47/56 (84%) | ✅ 56/56 | 9 unprotected |
| `learning_algo_coverage` | ❌ 0/10 | ✅ 8/10 | Tests written, not running |
| `logger_count` | ⚠️ 4 loggers | ✅ 1 unified | Fragmented logging |
| `max_route_lines` | ⚠️ Unknown | ✅ <300 | Needs analysis |
| `any_type_count` | 🔴 701 (185 files) | ✅ <200 critical | Type safety poor |
| `backup_files` | ⚠️ 2 found | ✅ 0 | Source tree dirty |

### Critical Issues

1. **Test Infrastructure Broken** (rollup dependency)
   - Blocks: All test-dependent work (80% of plan)
   - Impact: CRITICAL
   - Must fix first

2. **High `any` Type Usage** (701 occurrences)
   - Top offenders:
     - `src/app/api/export/generate/route.ts` (31 any)
     - `src/lib/export/exportManager.ts` (17 any)
     - `src/lib/export/rawDataExporter.ts` (13 any)
   - Impact: Type safety compromised

3. **Logger Fragmentation** (4 separate implementations)
   - Locations: lib/logger.ts, lib/logging/*, lib/monitoring/logger.ts
   - Impact: Inconsistent logging, maintenance burden

---

## Optimal Action Sequence (A* Search Result)

### Phase 0: Foundation (CRITICAL PATH - BLOCKS EVERYTHING)

**Duration**: 1-2 hours
**Cost**: 1.5 units
**Parallelization**: Minimal

#### Action 1.1: Fix Test Infrastructure ⚡ CRITICAL

```yaml
Preconditions: NONE
Effects: tests_runnable=TRUE (enables all test-dependent work)
Cost: 1.0
Priority: CRITICAL (blocks entire remediation)

Implementation:
  1. Install rollup dependency:
     npm install @rollup/rollup-linux-x64-gnu --save-dev
     OR
     rm -rf node_modules package-lock.json && npm ci

  2. Verify test runner:
     npm test -- --version

  3. Run sample test:
     npm test -- tests/unit/vector/types.test.ts

Success Criteria:
  ✅ Tests execute without rollup errors
  ✅ Sample test passes
  ✅ All 2,715 lines of Phase 1 tests runnable

Failure Handling:
  - If rollup install fails: Try full npm ci
  - If still fails: Check Node version (need 18+)
  - If still fails: ESCALATE (blocks everything)

Replanning Trigger:
  Rollup fix fails after 3 attempts → Switch to alternative test runner
```

#### Action 1.2: Clean Source Tree 🧹

```yaml
Preconditions: NONE (can run parallel with 1.1)
Effects: backup_files=0
Cost: 0.5
Priority: LOW (quick win)

Implementation:
  1. Remove backup files:
     rm src/lib/monitoring/web-vitals.ts.backup
     rm src/app/api/status/route.ts.backup

  2. Verify clean:
     find src -name "*.backup*" -o -name "*~" -o -name "*.bak"

Success Criteria:
  ✅ No backup files in src/
  ✅ Git status clean (no untracked backups)
```

---

### Phase 1: Low-Hanging Fruit (HIGH ROI)

**Duration**: 3-4 hours
**Cost**: 6 units
**Parallelization**: 2-way (rate limiting independent, logger depends on tests)

#### Action 2.1: Implement Rate Limiting 🛡️

```yaml
Preconditions: NONE (independent of test infrastructure)
Effects: endpoints_rate_limited=56/56
Cost: 3.0
Priority: HIGH (security critical)

Implementation:
  1. Audit unprotected endpoints:
     grep -r "export async function" src/app/api/ | \
       xargs -I {} sh -c 'grep -L "rateLimit" {}'

  2. Identify 9 unprotected routes:
     - Check each /api/* route for rate limiting middleware
     - Priority: auth, export, settings endpoints

  3. Apply existing rate limiting patterns:
     import { rateLimit } from '@/lib/rate-limiting'
     export const config = { rateLimit: { ... } }

  4. Test with curl:
     for i in {1..15}; do curl -w "%{http_code}\n" http://localhost:3000/api/test; done

Success Criteria:
  ✅ All 56 /api/* routes have rate limiting
  ✅ Rate limiting returns 429 when exceeded
  ✅ No performance degradation (<10ms overhead)

Parallel Execution: Can run WHILE Action 1.1 is in progress
```

#### Action 2.2: Consolidate Loggers 📝

```yaml
Preconditions: tests_runnable=TRUE (depends on Action 1.1)
Effects: logger_count=1
Cost: 3.0
Priority: MEDIUM (reduces technical debt)

Implementation:
  1. Audit existing loggers:
     - src/lib/logger.ts (11 any types)
     - src/lib/logging/logger.ts (5 any types)
     - src/lib/monitoring/logger.ts (2 any types)
     - src/lib/api/client-logger.ts (6 any types)

  2. Create unified logger:
     File: src/lib/logging/unified-logger.ts
     Features:
       - Structured logging (JSON)
       - Log levels (debug, info, warn, error)
       - Context injection (requestId, userId)
       - Performance tracking
       - Type-safe (remove all any types)

  3. Replace all imports:
     find src -type f -name "*.ts" -o -name "*.tsx" | \
       xargs sed -i "s|from '@/lib/logger'|from '@/lib/logging/unified-logger'|g"

  4. Write comprehensive tests:
     tests/unit/logging/unified-logger.test.ts
       - Log level filtering
       - Context injection
       - Performance tracking
       - Error serialization

  5. Remove duplicate implementations:
     git rm src/lib/logger.ts
     git rm src/lib/monitoring/logger.ts
     git rm src/lib/api/client-logger.ts

Success Criteria:
  ✅ Single logger instance used project-wide
  ✅ All logger tests pass (100% coverage)
  ✅ No duplicate logger files
  ✅ No any types in logger code
  ✅ Existing functionality preserved

Parallel Execution: Can run AFTER Action 1.1, PARALLEL with Action 3.1
```

---

### Phase 2: Test Coverage (QUALITY ASSURANCE)

**Duration**: 3-4 hours
**Cost**: 5 units
**Parallelization**: Can run parallel with Phase 1 actions (after 1.1)

#### Action 3.1: Write Algorithm Tests 🧪

```yaml
Preconditions: tests_runnable=TRUE (depends on Action 1.1)
Effects: learning_algo_coverage=8/10
Cost: 5.0
Priority: MEDIUM (quality assurance)

Implementation:
  1. Identify target algorithms:
     - src/lib/algorithms/spaced-repetition.ts (3 any types)
     - Additional algorithms in src/lib/algorithms/

  2. Write comprehensive tests (follow Phase 1 patterns):
     tests/unit/algorithms/spaced-repetition.test.ts
       - Unit tests for each function
       - Edge cases (boundary conditions)
       - Performance benchmarks

     tests/integration/algorithms/learning-pipeline.test.ts
       - End-to-end learning workflows
       - Multi-algorithm coordination
       - Real-world scenarios

  3. Target coverage: 80%+ for each algorithm

  4. Follow existing test patterns:
     - AAA pattern (Arrange-Act-Assert)
     - beforeAll/afterAll cleanup
     - Parameterized tests for variants
     - Mock external dependencies

Success Criteria:
  ✅ 8/10 algorithms have >=80% test coverage
  ✅ All algorithm tests pass
  ✅ Tests follow project patterns (AAA, cleanup, etc.)
  ✅ Performance benchmarks included
  ✅ Real-world scenarios tested

Parallel Execution: Can run PARALLEL with Action 2.2
```

---

### Phase 3: Code Refactoring (STRUCTURAL IMPROVEMENTS)

**Duration**: 6-8 hours
**Cost**: 13 units
**Parallelization**: 2-way parallel (both actions can run simultaneously)

#### Action 4.1: Refactor Route Handlers 🏗️

```yaml
Preconditions: tests_runnable=TRUE (depends on Action 1.1)
Effects: max_route_lines<300
Cost: 5.0
Priority: MEDIUM (maintainability)

Implementation:
  1. Analyze route files:
     wc -l src/app/api/**/*.ts | sort -rn | head -20

     Top candidates:
       - src/app/api/export/generate/route.ts (likely >300 lines, 31 any types)
       - Large handler files

  2. Extract business logic to services:
     Before (route.ts):
       export async function POST(req) {
         // 300+ lines of logic
       }

     After (route.ts):
       import { ExportService } from '@/lib/services/export'
       export async function POST(req) {
         const service = new ExportService()
         return service.generateExport(req)
       }

     New (services/export.ts):
       export class ExportService {
         async generateExport(req) {
           // Extracted logic, testable
         }
       }

  3. Create service layer pattern:
     - Route handlers: <50 lines (request parsing, response formatting)
     - Services: Business logic (testable, reusable)
     - Clear separation of concerns

  4. Write service tests:
     tests/unit/services/export.test.ts
       - Test business logic in isolation
       - Mock external dependencies
       - Achieve 90%+ coverage

Success Criteria:
  ✅ All route handlers <300 lines (target: <100)
  ✅ Business logic extracted to /services
  ✅ Service tests pass (90%+ coverage)
  ✅ No functionality regression
  ✅ Routes remain thin (request/response only)

Parallel Execution: Can run PARALLEL with Action 4.2
```

#### Action 4.2: Fix `any` Types (Critical Paths) 🔒

```yaml
Preconditions: tests_runnable=TRUE (depends on Action 1.1)
Effects: any_type_count<200 (in critical paths)
Cost: 8.0
Priority: HIGH (type safety critical)

Implementation:
  1. Priority targets (701 total → focus on worst offenders):

     Tier 1 (API Routes - HIGHEST PRIORITY):
       - src/app/api/export/generate/route.ts (31 any) → <5
       - Large route handlers

     Tier 2 (Core Libraries):
       - src/lib/export/exportManager.ts (17 any) → <3
       - src/lib/export/rawDataExporter.ts (13 any) → <3
       - src/lib/database/utils/index.ts (12 any) → <5
       - src/lib/api/optimizedSupabase.ts (11 any) → <5
       - src/lib/monitoring/hooks.ts (11 any) → <5
       - src/lib/performance/index.ts (10 any) → <5

     Tier 3 (Lower Priority):
       - UI components (React event handlers) - DEFER
       - Non-critical utilities - DEFER

  2. Replacement strategy:

     Pattern 1: Use TypeScript generics
       Before: function process(data: any) { }
       After:  function process<T>(data: T): T { }

     Pattern 2: Add Zod schemas for runtime validation
       import { z } from 'zod'
       const RequestSchema = z.object({ ... })
       type Request = z.infer<typeof RequestSchema>

     Pattern 3: Use proper type imports
       Before: export function handler(req: any, res: any) { }
       After:  import { NextRequest, NextResponse } from 'next/server'
               export function handler(req: NextRequest) { }

     Pattern 4: Unknown for truly dynamic data
       Before: const data: any = JSON.parse(...)
       After:  const data: unknown = JSON.parse(...)
               if (isValidData(data)) { /* type guard */ }

  3. Add type guards where needed:
     function isValidData(data: unknown): data is ValidData {
       return typeof data === 'object' && data !== null && ...
     }

  4. Test after each major change:
     npm run typecheck
     npm test

Success Criteria:
  ✅ Tier 1 files: <5 any types each
  ✅ Tier 2 files: <5 any types each
  ✅ Total critical path any types: <200 (from 701)
  ✅ No new type errors introduced
  ✅ All tests still pass
  ✅ Type safety improves by 70%+

Parallel Execution: Can run PARALLEL with Action 4.1
```

---

## Execution Timeline (Optimal Path)

```
Hour 0-2: FOUNDATION (SERIAL - CRITICAL PATH)
├─ [0:00] 🚀 Start Action 1.1: Fix Test Infrastructure
├─ [0:15] 🚀 Start Action 1.2: Clean Source Tree (parallel)
├─ [0:20] ✅ Complete Action 1.2
└─ [1:30] ✅ Complete Action 1.1 ⚡ GATE OPENS

Hour 2-6: LOW-HANGING + TESTS (3-WAY PARALLEL)
├─ [2:00] 🚀 Agent A: Start Action 2.1 (Rate Limiting)
├─ [2:00] 🚀 Agent B: Start Action 2.2 (Consolidate Loggers)
├─ [2:00] 🚀 Agent C: Start Action 3.1 (Algorithm Tests)
├─ [4:30] ✅ Agent A: Complete Action 2.1
├─ [5:00] ✅ Agent B: Complete Action 2.2
└─ [6:00] ✅ Agent C: Complete Action 3.1

Hour 6-14: REFACTORING (2-WAY PARALLEL)
├─ [6:00] 🚀 Agent A: Start Action 4.1 (Refactor Routes)
├─ [6:00] 🚀 Agent B: Start Action 4.2 (Fix any Types)
├─ [12:00] ✅ Agent A: Complete Action 4.1
└─ [14:00] ✅ Agent B: Complete Action 4.2

TOTAL: 14 hours (can split over 2 days)
```

---

## Parallelization Strategy

### Batch 1: Foundation (Hour 0-2)
**Sequential** - Action 1.1 blocks everything
- ⚡ Action 1.1: Fix tests (CRITICAL PATH)
- 🧹 Action 1.2: Clean backups (can overlap)

### Batch 2: Quick Wins (Hour 2-6)
**3-way Parallel** - Maximum concurrency
- 🛡️ Agent A: Rate limiting (independent)
- 📝 Agent B: Consolidate loggers (test-dependent)
- 🧪 Agent C: Algorithm tests (test-dependent)

### Batch 3: Refactoring (Hour 6-14)
**2-way Parallel** - Intensive work
- 🏗️ Agent A: Refactor routes (test-dependent)
- 🔒 Agent B: Fix any types (test-dependent)

---

## Success Criteria & Validation

### Phase 0 Validation
```bash
# Test infrastructure
npm test -- tests/unit/vector/types.test.ts
✅ Tests run without errors

# Source tree
find src -name "*.backup*"
✅ No backup files found
```

### Phase 1 Validation
```bash
# Rate limiting
curl -w "%{http_code}\n" -X POST http://localhost:3000/api/test (repeat 15x)
✅ Returns 429 after threshold

# Unified logger
npm test -- tests/unit/logging/unified-logger.test.ts
✅ All logger tests pass
grep -r "from '@/lib/logger'" src/
✅ No old logger imports
```

### Phase 2 Validation
```bash
# Algorithm coverage
npm test -- tests/unit/algorithms/ --coverage
✅ 8/10 algorithms >=80% coverage
✅ All tests pass
```

### Phase 3 Validation
```bash
# Route size
wc -l src/app/api/**/*.ts | awk '$1 > 300'
✅ No routes >300 lines

# Type safety
npm run typecheck
✅ No type errors

# Any type count
grep -r ": any" src/app/api/ src/lib/{export,database,api,monitoring,performance}/ | wc -l
✅ <200 in critical paths
```

### Final Validation
```bash
npm test              # All tests pass
npm run build         # Successful build
npm run lint          # No critical errors
npm run typecheck     # No type errors
```

---

## Risk Mitigation & Replanning

### Trigger 1: Test Infrastructure Fix Fails
**Probability**: LOW
**Impact**: CRITICAL (blocks everything)

**Symptoms**:
- Rollup errors persist after install
- Tests won't execute

**Fallback Plan**:
1. Try full reinstall: `rm -rf node_modules package-lock.json && npm ci`
2. Check Node version: `node -v` (need 18+)
3. Try alternative test runner (Jest)
4. If all fails: ESCALATE (blocker)

**Replanning**: Switch critical path to manual testing temporarily

---

### Trigger 2: Rate Limiting Reveals Architectural Issues
**Probability**: MEDIUM
**Impact**: MEDIUM (affects only rate limiting)

**Symptoms**:
- Rate limiting breaks existing clients
- Performance degradation >10ms
- Middleware conflicts

**Fallback Plan**:
1. Create rate limiting facade for compatibility
2. Implement gradual rollout with feature flags
3. Add bypass mechanism for admin/trusted clients
4. Defer deep architectural changes to Phase 2

**Replanning**: Reduce scope to essential endpoints only

---

### Trigger 3: Logger Consolidation Breaks Functionality
**Probability**: LOW
**Impact**: MEDIUM (affects logging only)

**Symptoms**:
- Missing logs after migration
- Runtime errors in logger calls
- Performance issues

**Fallback Plan**:
1. Create adapter pattern for backward compatibility
2. Keep old loggers temporarily (mark deprecated)
3. Gradual migration with feature flag
4. Extensive testing before full rollout

**Replanning**: Phase logger consolidation over 2 sprints

---

### Trigger 4: Route Refactoring Introduces Bugs
**Probability**: MEDIUM
**Impact**: HIGH (affects user-facing features)

**Symptoms**:
- Tests fail after refactoring
- Functionality regression
- Performance degradation

**Fallback Plan**:
1. Rollback to previous commit (git revert)
2. Use smaller, incremental changes
3. Add comprehensive integration tests first
4. Refactor one route at a time

**Replanning**: Reduce parallelization, increase testing

---

### Trigger 5: Any Type Fixes Cause Cascading Failures
**Probability**: MEDIUM
**Impact**: MEDIUM (can reduce scope)

**Symptoms**:
- Type errors spread across codebase
- Build failures
- Tests break due to type changes

**Fallback Plan**:
1. Focus only on Tier 1 files (API routes)
2. Use gradual typing approach (add types incrementally)
3. Add `@ts-expect-error` comments with TODOs
4. Defer non-critical files to future sprint

**Replanning**: Reduce target to <400 any types (50% improvement)

---

## Cost-Benefit Analysis

### High ROI (Cost < 3, High Impact)
| Action | Cost | Impact | ROI |
|--------|------|--------|-----|
| Fix test infrastructure | 1.0 | CRITICAL | ⭐⭐⭐⭐⭐ |
| Clean source tree | 0.5 | LOW | ⭐⭐⭐⭐ |
| Implement rate limiting | 3.0 | HIGH | ⭐⭐⭐⭐ |

### Medium ROI (Cost 3-5)
| Action | Cost | Impact | ROI |
|--------|------|--------|-----|
| Consolidate loggers | 3.0 | MEDIUM | ⭐⭐⭐ |
| Refactor routes | 5.0 | MEDIUM | ⭐⭐⭐ |
| Write algorithm tests | 5.0 | MEDIUM | ⭐⭐⭐ |

### Lower ROI (Cost > 5)
| Action | Cost | Impact | ROI |
|--------|------|--------|-----|
| Fix any types | 8.0 | MEDIUM | ⭐⭐ |

**Note**: "Lower ROI" doesn't mean low value - fixing any types improves long-term maintainability significantly, but requires more effort per unit of impact.

---

## Agent Coordination Protocol

### Agent Roles

**Agent A (Infrastructure)**:
- Action 1.1: Fix test infrastructure
- Action 2.1: Implement rate limiting
- Action 4.1: Refactor routes

**Agent B (Core)**:
- Action 1.2: Clean source tree
- Action 2.2: Consolidate loggers
- Action 4.2: Fix any types

**Agent C (Quality)**:
- Action 3.1: Write algorithm tests
- Validate success criteria
- Monitor test coverage

**GOAP Planner** (this agent):
- Monitor overall progress
- Trigger replanning if needed
- Coordinate agent handoffs
- Track success criteria

---

### Communication Protocol

**Memory Keys**:
```
goap/phase-0-status        # Foundation progress
goap/phase-1-status        # Low-hanging fruit progress
goap/phase-2-status        # Test coverage progress
goap/phase-3-status        # Refactoring progress

goap/agent-a-progress      # Agent A current task
goap/agent-b-progress      # Agent B current task
goap/agent-c-progress      # Agent C current task

goap/failures-log          # Replanning triggers
goap/success-metrics       # Validation results
```

**Hooks**:
```bash
# Before starting action
npx claude-flow@alpha hooks pre-task --description "Action X.Y: [name]"

# During action (for coordination)
npx claude-flow@alpha hooks post-edit --file "[file]" \
  --memory-key "goap/agent-[A-C]/[action]"

npx claude-flow@alpha hooks notify --message "[what was done]"

# After completing action
npx claude-flow@alpha hooks post-task --task-id "[task-id]"

# Session checkpoints (end of each phase)
npx claude-flow@alpha hooks session-end --export-metrics true
```

---

## Monitoring & Metrics

### Key Performance Indicators (KPIs)

**Code Quality**:
- Test coverage: Target 85%+ (from current ~60%)
- Type safety: <200 any types in critical paths (from 701)
- Route handler size: <300 lines (from unknown)

**Security**:
- Rate-limited endpoints: 56/56 (from 47/56)
- API security score: Target 95%+

**Technical Debt**:
- Logger instances: 1 (from 4)
- Backup files: 0 (from 2)
- Code duplication: Reduce by 30%

**Velocity**:
- Actions completed per hour: Target 0.5-1
- Parallel agent efficiency: Target 80%+
- Replanning events: Target <2 total

---

## Next Steps (Post-Remediation)

After completing this 7-phase plan:

1. **RuVector Integration** (from roadmap):
   - Sprint 0: Foundation setup
   - Sprint 1: Embedding service
   - Sprint 2-3: Vector search
   - Sprint 4-5: Knowledge graph
   - Sprint 6-7: GNN learning

2. **Continuous Improvement**:
   - Monitor KPIs weekly
   - Gradually reduce remaining any types
   - Expand test coverage to 95%+
   - Performance optimization

3. **Documentation**:
   - Update architecture docs
   - Create type safety guidelines
   - Document refactoring patterns

---

## Appendix: Action Dependencies Graph

```
Action 1.1 (fix_test_infrastructure) ──┐
                                        ├──> Action 2.2 (consolidate_loggers)
                                        │
                                        ├──> Action 3.1 (write_algorithm_tests)
                                        │
                                        ├──> Action 4.1 (refactor_routes)
                                        │
                                        └──> Action 4.2 (fix_any_types)

Action 1.2 (clean_source_tree) ────────> (independent, no dependencies)

Action 2.1 (implement_rate_limiting) ──> (independent, no dependencies)
```

**Critical Path**: 1.1 → {2.2, 3.1, 4.1, 4.2}
**Total Critical Path Duration**: 1.5 + max(3, 5, 5, 8) = 9.5 hours
**With Parallelization**: 14 hours (actual) vs. 22.5 hours (sequential) = **38% time savings**

---

**Plan Status**: ✅ READY FOR EXECUTION
**Next Action**: Begin Phase 0 - Action 1.1 (Fix Test Infrastructure)
**Coordination**: Use Claude Code Task tool with hooks for agent spawning

