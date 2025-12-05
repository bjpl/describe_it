# GOAP Action Plan Summary for describe-it

## Quick Overview

**Transform describe-it from 6.7/10 → 9.0/10 in 3.8 weeks**

### Key Improvements

- 🎯 **99.1% reduction** in `any` types (1,088 → 10)
- 🏗️ **Clean Architecture**: Repository + Service layers
- ✅ **Realistic Tests**: Replace global mocks with test containers
- ⚡ **Optimized Auth**: 1s polling → 5min event-driven
- 📦 **Modular APIs**: 673-line routes → <200 lines
- 🧠 **State Management**: Zustand fully implemented

## Action Dependency Graph

```
                    A1 (Type Consolidation)
                   /  |  \
                  /   |   \
                 /    |    \
               A2    A5    A8
               |      |      |
               |      |      |
              A3     A6     A9
             / |      |      |
            /  |      |      |
           /   |      |      |
         A4   A7     A13   A10
          |    |      |      |
          |    |      |      |
          |    |      |      |
          |   A12 ----+------+
          |    |            |
          +----+------------+
               |
              A14 (Complete!)
               ↓
           Score: 9.0/10
```

## Critical Path (Sequential Execution)

**Must complete in order:**

```
A1 → A2 → A3 → A4 → A7 → A8 → A9 → A10 → A12 → A14
```

**Total Time**: 76 hours (3.8 weeks)

## Parallel Execution Phases

### Phase 1: Foundation (Week 1, Days 1-2)

**BLOCKING** - Everything depends on this

```
A1: Consolidate Types (6h)
```

**Outcome**: Single source of truth for types

---

### Phase 2: Repository Layer (Week 1, Days 3-5)

**BLOCKING** - Services need repositories

```
A2: Create Repository Layer (12h)
```

**Outcome**: All DB operations abstracted

---

### Phase 3: Services + State (Week 2, Days 1-3)

**PARALLEL** - Run simultaneously

```
A3: Create Service Layer (10h)  ║  A5: Implement Zustand (10h)
```

**Outcome**: Business logic isolated + centralized state

---

### Phase 4: API + Auth (Week 2, Days 4-5)

**PARALLEL** - Run simultaneously

```
A4: Refactor API Routes (8h)  ║  A6: Optimize Auth (4h)
```

**Outcome**: Thin controllers + event-driven auth

---

### Phase 5: Testing + Types (Week 3, Days 1-3)

**PARALLEL** - Run simultaneously

```
A7: Realistic Tests (12h)  ║  A8: Type Cleanup Phase 1 (8h)
```

**Outcome**: Tests catch real bugs + utils 100% typed

---

### Phase 6: Advanced Typing (Week 3, Days 4-5)

**PARALLEL** - Run simultaneously

```
A9: Type Cleanup Phase 2 (8h)  ║  A11: AgentDB Integration (6h)
```

**Outcome**: Services typed + pattern learning active

---

### Phase 7: Final Push (Week 4, Days 1-3)

**PARALLEL** - Run simultaneously

```
A10: Final Type Cleanup (6h)  ║  A12: Integration Tests (8h)  ║  A13: Performance (6h)
```

**Outcome**: <10 any usages + full test coverage + optimized

---

### Phase 8: Polish (Week 4, Days 4-5)

**SEQUENTIAL** - Final step

```
A14: Documentation + Review (4h)
```

**Outcome**: Production-ready, score 9.0/10

---

## Milestones & Checkpoints

| Milestone                | Week  | Score   | Achievement                        |
| ------------------------ | ----- | ------- | ---------------------------------- |
| M1: Type System Unified  | 1     | 7.0     | Types consolidated, build stable   |
| M2: Clean Architecture   | 2     | 7.8     | Repository + Service layers active |
| M3: Modern State         | 3     | 8.2     | Zustand integrated, auth optimized |
| M4: Type Safety          | 3     | 8.8     | <10 any usages, realistic tests    |
| **M5: Production Ready** | **4** | **9.0** | **All targets achieved**           |

## Files Affected by Phase

### Phase 1-2: Foundation (18h)

```
src/types/
  ├── index.ts (consolidated)
  ├── unified.ts (consolidated)
  └── database.ts (consolidated)

src/lib/repositories/ (new)
  ├── UserRepository.ts
  ├── VocabularyRepository.ts
  ├── SessionRepository.ts
  ├── ProgressRepository.ts
  ├── ImageRepository.ts
  └── DescriptionRepository.ts
```

### Phase 3-4: Services & APIs (32h)

```
src/lib/services/ (new)
  ├── AuthService.ts
  ├── VocabularyService.ts
  ├── LearningService.ts
  └── AnalyticsService.ts

src/store/ (new)
  ├── useImageStore.ts
  ├── useDescriptionStore.ts
  ├── useVocabularyStore.ts
  ├── useAuthStore.ts
  └── useUIStore.ts

src/app/api/**/route.ts (refactored)
  └── All routes become thin controllers
```

### Phase 5-7: Type Safety & Testing (48h)

```
src/lib/utils/**/*.ts (typed)
src/lib/services/**/*.ts (typed)
src/lib/api/**/*.ts (typed)
src/**/*.ts (final cleanup)

tests/
  ├── unit/ (realistic mocking)
  ├── integration/ (new)
  └── setup.ts (test containers)

src/lib/vector/
  └── agentdb-client.ts (new)
```

### Phase 8: Documentation (4h)

```
docs/
  ├── architecture/ (updated)
  ├── api/ (updated)
  └── testing/ (updated)

README.md (updated)
```

## Success Metrics

### Before → After

| Metric            | Before    | After     | Change   |
| ----------------- | --------- | --------- | -------- |
| **Overall Score** | 6.7/10    | 9.0/10    | +34.3% ↑ |
| **Code Quality**  | 6.5/10    | 9.0/10    | +38.5% ↑ |
| **Test Quality**  | 6.5/10    | 9.5/10    | +46.2% ↑ |
| **Architecture**  | 7.2/10    | 9.0/10    | +25.0% ↑ |
| **Type Safety**   | 15%       | 98%       | +553% ↑  |
| **'any' Usages**  | 1,088     | 10        | -99.1% ↓ |
| **Largest Route** | 673 lines | 200 lines | -70.3% ↓ |
| **Auth Polling**  | 1 second  | 5 minutes | -99.7% ↓ |

## Risk Mitigation

### Critical Risks

1. **A2: Repository Extraction**
   - Risk: Breaking existing functionality
   - Mitigation: Create alongside, migrate gradually with tests

2. **A7: Realistic Tests**
   - Risk: Revealing hidden bugs
   - Mitigation: Fix one file at a time, use test containers

### Medium Risks

3. **A4: API Refactoring**
   - Risk: Breaking client apps
   - Mitigation: Keep API contracts stable, only change internals

## AgentDB Tracking

Store and track this plan using AgentDB:

```bash
# Initialize tracking
npx agentdb init --db-path ./agentdb.db

# Store plan
npx agentdb pattern-store \
  --task-type "goap_refactoring" \
  --approach "$(cat docs/planning/goap-action-plan.json)"

# Track each action
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A1" \
  --action "consolidate_types" \
  --reward 1 \
  --success true

# View progress
npx agentdb learning-metrics \
  --session-id "describe-it-refactor" \
  --include-trends true
```

## Quick Start

### Execute Phase 1 Now

```bash
# 1. Setup tracking
npx agentdb init

# 2. Execute first action
npx claude-flow@alpha sparc run architect \
  "Consolidate type definitions in src/types/"

# 3. Validate
npm run typecheck
npm run build

# 4. Track completion
npx agentdb experience-record \
  --session-id "describe-it-refactor" \
  --tool-name "goap_action_A1" \
  --success true
```

### Daily Workflow

```bash
# Morning: Check progress
npx agentdb learning-metrics --session-id "describe-it-refactor"

# Execute assigned actions
npx claude-flow@alpha sparc run <agent-type> "<task>"

# Evening: Track and validate
npm run test:run
npm run typecheck
npx agentdb experience-record --session-id "..." --success true
```

## Files Created

1. **`goap-action-plan.json`** - Machine-readable GOAP data structure
2. **`goap-implementation-guide.md`** - Detailed implementation steps
3. **`goap-execution-commands.md`** - Command-line execution reference
4. **`GOAP-SUMMARY.md`** - This file (executive overview)

## Next Steps

1. ✅ **Review this plan** with team
2. ⬜ **Set up AgentDB** for tracking
3. ⬜ **Execute A1** (Type Consolidation)
4. ⬜ **Daily progress** reviews
5. ⬜ **Adapt plan** based on learnings

---

## The GOAP Advantage

**Why GOAP Planning?**

- ✓ Clear action dependencies
- ✓ Optimal parallel execution
- ✓ Measurable progress
- ✓ Adaptive replanning
- ✓ Machine-trackable via AgentDB

**Result**: Systematic transformation from 6.7 → 9.0 in 3.8 weeks

**Ready to begin? Start with Phase 1!** 🚀
