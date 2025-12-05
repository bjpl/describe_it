# GOAP Execution Commands

Quick reference for executing each GOAP action using Claude Flow and AgentDB.

## Setup

```bash
# Initialize AgentDB for tracking
npx agentdb init --db-path ./agentdb.db

# Store GOAP plan in AgentDB
npx agentdb pattern-store \
  --task-type "goap_refactoring" \
  --approach "$(cat docs/planning/goap-action-plan.json)" \
  --success-rate 0

# Initialize Claude Flow coordination
npx claude-flow@alpha swarm init --topology mesh --max-agents 8
```

## Phase 1: Foundation

### A1: Consolidate Type Definitions

```bash
# Execute action
npx claude-flow@alpha sparc run architect \
  "Consolidate type definitions in src/types/ - merge legacy and modular systems"

# Validate
npm run typecheck
npm run build

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A1" \
  --action "consolidate_types" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 2: Architecture Setup

### A2: Create Repository Layer

```bash
# Execute action
npx claude-flow@alpha sparc run architect \
  "Create repository layer: UserRepository, VocabularyRepository, SessionRepository, ProgressRepository, ImageRepository, DescriptionRepository"

# Run tests
npm run test:unit tests/lib/repositories/

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A2" \
  --action "create_repositories" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 3: Service Layer & State (Parallel)

### A3: Create Service Layer

```bash
# Execute action
npx claude-flow@alpha sparc run architect \
  "Create service layer: AuthService, VocabularyService, LearningService, AnalyticsService"

# Run tests
npm run test:unit tests/lib/services/

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A3" \
  --action "create_services" \
  --outcome "success" \
  --reward 1 \
  --success true
```

### A5: Implement Zustand (Parallel with A3)

```bash
# Execute action in parallel
npx claude-flow@alpha sparc run coder \
  "Implement Zustand stores: useImageStore, useDescriptionStore, useVocabularyStore, useAuthStore, useUIStore"

# Test stores
npm run test:unit tests/store/

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A5" \
  --action "implement_zustand" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 4: API Refactoring & Auth (Parallel)

### A4: Refactor API Routes

```bash
# Execute action
npx claude-flow@alpha sparc run coder \
  "Refactor all API routes to thin controllers using service layer"

# Run integration tests
npm run test:integration

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A4" \
  --action "refactor_routes" \
  --outcome "success" \
  --reward 1 \
  --success true
```

### A6: Optimize Auth Polling (Parallel with A4)

```bash
# Execute action
npx claude-flow@alpha sparc run coder \
  "Replace auth polling with event-driven updates, change interval to 5 minutes"

# Test auth flow
npm run test:unit tests/lib/auth/

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A6" \
  --action "optimize_auth" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 5: Type Safety Phase 1 (Parallel)

### A7: Replace Global Mocks

```bash
# Execute action
npx claude-flow@alpha sparc run tester \
  "Replace global mocks with test containers and scoped mocking"

# Run tests with new approach
npm run test:run

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A7" \
  --action "realistic_tests" \
  --outcome "success" \
  --reward 1 \
  --success true
```

### A8: Eliminate 'any' Phase 1 (Parallel with A7)

```bash
# Execute action
npx claude-flow@alpha sparc run coder \
  "Replace all 'any' types in src/lib/utils/ with proper TypeScript types"

# Validate
npm run typecheck

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A8" \
  --action "type_cleanup_phase1" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 6: Type Safety Phase 2 (Parallel)

### A9: Eliminate 'any' Phase 2

```bash
# Execute action
npx claude-flow@alpha sparc run coder \
  "Replace all 'any' types in src/lib/services/ and src/lib/api/ with proper types and Zod schemas"

# Validate
npm run typecheck

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A9" \
  --action "type_cleanup_phase2" \
  --outcome "success" \
  --reward 1 \
  --success true
```

### A11: AgentDB Integration (Parallel with A9)

```bash
# Execute action
npx claude-flow@alpha sparc run ml-developer \
  "Implement AgentDB integration for pattern learning and vector search"

# Test AgentDB
npm run test:unit tests/lib/vector/

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A11" \
  --action "agentdb_integration" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 7: Final Cleanup (Parallel)

### A10: Eliminate 'any' Phase 3

```bash
# Execute action
npx claude-flow@alpha sparc run coder \
  "Final cleanup: reduce 'any' usage to <10 total with documentation"

# Validate
npm run typecheck
grep -r "any" src/ --include="*.ts" | wc -l  # Should be < 10

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A10" \
  --action "type_cleanup_final" \
  --outcome "success" \
  --reward 1 \
  --success true
```

### A12: Integration Testing (Parallel with A10)

```bash
# Execute action
npx claude-flow@alpha sparc run tester \
  "Create comprehensive integration test suite"

# Run all tests
npm run test:integration
npm run test:coverage

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A12" \
  --action "integration_tests" \
  --outcome "success" \
  --reward 1 \
  --success true
```

### A13: Performance Optimization (Parallel with A10, A12)

```bash
# Execute action
npx claude-flow@alpha sparc run perf-analyzer \
  "Optimize bundle size, lazy loading, and runtime performance"

# Benchmark
npm run build:analyze
npm run lighthouse

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A13" \
  --action "performance_optimization" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Phase 8: Polish

### A14: Documentation

```bash
# Execute action
npx claude-flow@alpha sparc run reviewer \
  "Update all documentation and perform final code review"

# Validate
npm run lint
npm run typecheck
npm run test:run

# Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A14" \
  --action "documentation" \
  --outcome "success" \
  --reward 1 \
  --success true
```

## Progress Tracking

### Check Current State

```bash
# View AgentDB metrics
npx agentdb learning-metrics \
  --session-id "describe-it-refactor" \
  --include-trends true

# Count remaining 'any' usages
grep -r "any" src/ --include="*.ts" | wc -l

# Check test coverage
npm run test:coverage

# Validate type safety
npm run typecheck
```

### Generate Progress Report

```bash
# Get completion statistics
npx agentdb pattern-search \
  --task "goap_refactoring" \
  --k 1

# Export session data
npx agentdb learning-explain \
  --query "describe-it refactoring progress" \
  --include-evidence true
```

## Parallel Execution Examples

### Execute Phase 3 (A3 + A5 in parallel)

```bash
# Terminal 1
npx claude-flow@alpha sparc run architect "Create service layer"

# Terminal 2 (run simultaneously)
npx claude-flow@alpha sparc run coder "Implement Zustand stores"

# Wait for both to complete, then validate
npm run test:unit
npm run typecheck
```

### Execute Phase 5 (A7 + A8 in parallel)

```bash
# Terminal 1
npx claude-flow@alpha sparc run tester "Replace global mocks with realistic tests"

# Terminal 2 (run simultaneously)
npx claude-flow@alpha sparc run coder "Replace any types in utils"

# Validate
npm run test:run
npm run typecheck
```

## Rollback Procedures

### If Action Fails

```bash
# Record failure
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A<N>" \
  --action "<action_name>" \
  --outcome "failure" \
  --reward 0 \
  --success false

# Rollback via git
git reset --hard HEAD~1

# Or rollback specific files
git checkout HEAD -- src/lib/repositories/*.ts
```

### Emergency Rollback

```bash
# Return to last stable checkpoint
git checkout main
git pull origin main

# Clear AgentDB session
npx agentdb db-stats  # Review current state
# Optionally reset session data
```

## Completion Checklist

After all actions complete:

```bash
# ✓ Final validation
npm run typecheck          # TSC strict mode passes
npm run lint               # No lint errors
npm run test:run           # All tests pass
npm run test:coverage      # >95% coverage
npm run build              # Production build succeeds
npm run lighthouse         # Score >90

# ✓ Metrics achieved
grep -r "any" src/ --include="*.ts" | wc -l  # <10
find src/app/api -name "route.ts" -exec wc -l {} \;  # All <200

# ✓ Update tracking
npx agentdb pattern-store \
  --task-type "goap_refactoring" \
  --approach "$(cat docs/planning/goap-action-plan.json)" \
  --success-rate 1.0  # 100% success!

# ✓ Generate final report
npx agentdb learning-explain \
  --query "describe-it refactoring summary" \
  --explain-depth "full" \
  --include-evidence true
```

## Success!

When all actions complete:

- Overall score: 6.7 → 9.0 ✓
- Type safety: 99.1% improvement ✓
- Architecture: Clean and maintainable ✓
- Tests: Realistic and comprehensive ✓

**Production ready! 🚀**
