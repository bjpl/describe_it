# GOAP Implementation Guide for describe-it

## Executive Summary

This document provides a Goal-Oriented Action Planning (GOAP) implementation roadmap for transforming describe-it from its current state (score: 6.7/10) to production-ready (score: 9.0/10).

**Timeline**: 3.8 weeks (76 hours)
**Key Improvements**: 99% reduction in `any` types, clean architecture, realistic tests
**Approach**: Phased parallel execution with critical path optimization

## Current vs Goal State

### Current State (6.7/10)

```typescript
{
  type_safety: false,           // 1,088 'any' usages
  has_repository_layer: false,  // DB ops in routes
  has_service_layer: false,     // Logic in handlers
  zustand_implemented: false,   // Unused dependency
  auth_simplified: false,       // 1-second polling
  tests_realistic: false,       // Global mocking
  api_routes_modular: false,    // 673-line files
}
```

### Goal State (9.0/10)

```typescript
{
  type_safety: true,            // <10 'any' usages
  has_repository_layer: true,   // Repository pattern
  has_service_layer: true,      // Business logic isolated
  zustand_implemented: true,    // Active state management
  auth_simplified: true,        // Event-driven auth
  tests_realistic: true,        // Test containers
  api_routes_modular: true,     // <200 lines each
}
```

## GOAP Action Sequence

### Phase 1: Foundation (6 hours)

**Blocking Phase - Must Complete First**

#### A1: Consolidate Type Definitions

- **Agent**: code-analyzer
- **Priority**: Critical
- **Files**: `src/types/{index,unified,database,comprehensive}.ts`
- **Goal**: Single source of truth for types
- **Outcome**: -150 any usages, build stability

```bash
# Execution
npx claude-flow sparc run architect "Consolidate type definitions"
```

**Validation**:

- ✓ No duplicate type definitions
- ✓ All imports resolve correctly
- ✓ Build passes with no type errors

---

### Phase 2: Architecture Setup (12 hours)

**Blocking Phase - Enables All Service Work**

#### A2: Create Repository Layer

- **Agent**: backend-dev
- **Priority**: Critical
- **Files**: Create `src/lib/repositories/*.ts`
- **Goal**: Abstract all database operations
- **Outcome**: -200 any usages, testable data layer

**Repositories to Create**:

1. `UserRepository.ts` - Auth and user management
2. `VocabularyRepository.ts` - Vocab CRUD
3. `SessionRepository.ts` - Session tracking
4. `ProgressRepository.ts` - Learning progress
5. `ImageRepository.ts` - Image metadata
6. `DescriptionRepository.ts` - AI descriptions

```typescript
// Example Repository Pattern
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

class UserRepository implements IUserRepository {
  constructor(private db: SupabaseClient) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db.from('users').select('*').eq('id', id).single();

    if (error) throw new RepositoryError(error);
    return data;
  }
}
```

**Validation**:

- ✓ All DB operations abstracted
- ✓ Repository interfaces fully typed
- ✓ Unit tests for each repository

---

### Phase 3: Service Layer & State (10 hours, Parallel)

**Independent Actions - Can Run Simultaneously**

#### A3: Create Service Layer

- **Agent**: backend-dev
- **Priority**: Critical
- **Depends**: A2
- **Files**: Create `src/lib/services/*.ts`
- **Outcome**: -150 any usages, business logic isolated

**Services to Create**:

1. `AuthService.ts` - Authentication logic
2. `VocabularyService.ts` - Vocab operations
3. `LearningService.ts` - Spaced repetition
4. `AnalyticsService.ts` - Progress tracking

```typescript
// Example Service Pattern
class VocabularyService {
  constructor(
    private vocabularyRepo: IVocabularyRepository,
    private userProgressRepo: IUserProgressRepository
  ) {}

  async addVocabularyItem(userId: string, word: string, context: string): Promise<VocabularyItem> {
    // Business logic here
    const difficulty = this.calculateDifficulty(word);

    return this.vocabularyRepo.create({
      userId,
      word,
      context,
      difficulty,
      nextReview: this.scheduleNextReview(difficulty),
    });
  }
}
```

#### A5: Implement Zustand State Management (Parallel with A3)

- **Agent**: coder
- **Priority**: High
- **Depends**: A1
- **Files**: Create `src/store/*.ts`
- **Outcome**: -80 any usages, centralized state

**Stores to Create**:

1. `useImageStore.ts` - Image search state
2. `useDescriptionStore.ts` - Description state
3. `useVocabularyStore.ts` - Vocab state
4. `useAuthStore.ts` - Auth state
5. `useUIStore.ts` - UI preferences

```typescript
// Example Zustand Store
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ImageState {
  images: Image[];
  selectedImage: Image | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  setImages: (images: Image[]) => void;
  selectImage: (image: Image) => void;
  clearImages: () => void;
}

export const useImageStore = create<ImageState>()(
  devtools(
    persist(
      set => ({
        images: [],
        selectedImage: null,
        isLoading: false,
        error: null,
        searchQuery: '',

        setImages: images => set({ images }),
        selectImage: image => set({ selectedImage: image }),
        clearImages: () => set({ images: [], selectedImage: null }),
      }),
      { name: 'image-store' }
    )
  )
);
```

**Validation Phase 3**:

- ✓ Business logic isolated from routes
- ✓ Services use repository layer only
- ✓ All global state in Zustand
- ✓ No prop drilling

---

### Phase 4: API Refactoring & Auth (8 hours, Parallel)

#### A4: Refactor API Routes to Thin Controllers

- **Agent**: backend-dev
- **Priority**: High
- **Depends**: A3
- **Files**: `src/app/api/*/route.ts`
- **Outcome**: Routes <200 lines, -100 any usages

```typescript
// Before: 673 lines in route.ts
export async function POST(req: Request) {
  // 600 lines of business logic and DB operations
}

// After: 42 lines in route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const validated = vocabularySchema.parse(body);

  const result = await vocabularyService.addItem(
    validated.userId,
    validated.word,
    validated.context
  );

  return NextResponse.json(result);
}
```

#### A6: Optimize Auth Polling (Parallel with A4)

- **Agent**: backend-dev
- **Priority**: High
- **Depends**: A5
- **Files**: `src/lib/auth/AuthManager.ts`, `src/store/useAuthStore.ts`
- **Outcome**: Auth polling 1s → 5min

```typescript
// Replace polling with event-driven updates
class AuthManager {
  private authStore = useAuthStore.getState();

  constructor(private supabase: SupabaseClient) {
    // Event-driven instead of polling
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.authStore.setSession(session);
    });
  }

  // Periodic refresh only for token validation
  startRefreshTimer(interval = 300000) {
    // 5 minutes
    setInterval(() => this.validateSession(), interval);
  }
}
```

**Validation Phase 4**:

- ✓ All routes < 200 lines
- ✓ Routes only handle HTTP concerns
- ✓ Auth state updates via events
- ✓ Polling interval >= 5 minutes

---

### Phase 5: Type Safety Phase 1 (12 hours, Parallel)

#### A7: Replace Global Mocks with Realistic Tests

- **Agent**: tester
- **Priority**: High
- **Depends**: A2, A3
- **Files**: `tests/**/*.test.ts`, `tests/setup.ts`
- **Outcome**: Realistic tests, catch real bugs

```typescript
// Before: Global mocks hide bugs
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// After: Test containers with real DB
import { createTestClient } from './test-utils/supabase-test';

describe('VocabularyRepository', () => {
  let repository: VocabularyRepository;
  let testDb: SupabaseClient;

  beforeEach(async () => {
    testDb = await createTestClient();
    repository = new VocabularyRepository(testDb);
  });

  afterEach(async () => {
    await testDb.from('vocabulary').delete().neq('id', '');
  });

  it('creates vocabulary item with real DB', async () => {
    const item = await repository.create({
      word: 'serendipity',
      definition: 'happy accident',
    });

    expect(item.id).toBeDefined();
    expect(item.word).toBe('serendipity');
  });
});
```

#### A8: Eliminate 'any' Types - Phase 1 (Parallel with A7)

- **Agent**: code-analyzer
- **Priority**: Medium
- **Depends**: A1
- **Files**: `src/lib/utils/**/*.ts`
- **Outcome**: -400 any usages in utils

```typescript
// Before: any kills type safety
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// After: Generic types preserve safety
function processData<T extends { value: unknown }>(data: T[]): unknown[] {
  return data.map(item => item.value);
}

// Even better: Specific types
interface DataItem {
  value: string | number;
  metadata?: Record<string, unknown>;
}

function processData(data: DataItem[]): Array<string | number> {
  return data.map(item => item.value);
}
```

**Validation Phase 5**:

- ✓ Utils 100% typed
- ✓ No global vi.mock statements
- ✓ Tests use test containers

---

### Phase 6: Type Safety Phase 2 (8 hours, Parallel)

#### A9: Eliminate 'any' Types - Phase 2

- **Agent**: code-analyzer
- **Priority**: Medium
- **Depends**: A3, A8
- **Files**: `src/lib/services/**/*.ts`, `src/lib/api/**/*.ts`
- **Outcome**: -300 any usages in services

```typescript
// Before: API responses untyped
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

// After: Zod validation + types
const ApiResponseSchema = z.object({
  data: z.array(VocabularyItemSchema),
  pagination: z.object({
    page: z.number(),
    total: z.number(),
  }),
});

type ApiResponse = z.infer<typeof ApiResponseSchema>;

async function fetchData(url: string): Promise<ApiResponse> {
  const response = await fetch(url);
  const json = await response.json();
  return ApiResponseSchema.parse(json); // Runtime + compile validation
}
```

#### A11: Implement AgentDB Integration (Parallel with A9)

- **Agent**: ml-developer
- **Priority**: Low
- **Depends**: A2
- **Files**: Create `src/lib/vector/agentdb-client.ts`
- **Outcome**: Utilize agentdb dependency

```typescript
import { AgentDB } from 'agentdb';

class VectorLearningService {
  private agentDb: AgentDB;

  async storePattern(userId: string, action: string, outcome: boolean): Promise<void> {
    await this.agentDb.experience_record({
      session_id: userId,
      tool_name: 'vocabulary_learning',
      action,
      outcome: outcome ? 'success' : 'failure',
      reward: outcome ? 1 : 0,
      success: outcome,
    });
  }

  async predictNextAction(userId: string, context: string): Promise<string> {
    const prediction = await this.agentDb.learning_predict({
      session_id: userId,
      state: context,
    });

    return prediction.action;
  }
}
```

**Validation Phase 6**:

- ✓ Services 100% typed
- ✓ API responses typed
- ✓ AgentDB storing patterns

---

### Phase 7: Final Cleanup (8 hours, Parallel)

#### A10: Eliminate 'any' Types - Phase 3

- **Agent**: code-analyzer
- **Priority**: Medium
- **Depends**: A9
- **Files**: All remaining `src/**/*.ts`
- **Outcome**: <10 any usages total

```typescript
// Only acceptable 'any' usage with documentation
/**
 * JUSTIFIED_ANY: Third-party library returns dynamic type
 * that cannot be properly typed without extensive runtime checks.
 * Safe because we validate with Zod schema immediately after.
 */
function parseThirdPartyData(raw: any): ValidatedData {
  return ThirdPartyDataSchema.parse(raw);
}
```

#### A12: Integration Testing Suite (Parallel with A10)

- **Agent**: tester
- **Priority**: Medium
- **Depends**: A2, A3, A7
- **Files**: `tests/integration/**/*.test.ts`
- **Outcome**: E2E test coverage

```typescript
describe('Vocabulary Learning Flow', () => {
  it('completes full learning cycle', async () => {
    // 1. User searches for image
    const images = await imageService.search('ocean');

    // 2. Generates description
    const description = await descriptionService.generate(images[0].url, 'academic');

    // 3. Extracts vocabulary
    const vocab = await vocabularyService.extractFromDescription(description.content);

    // 4. Schedules spaced repetition
    const schedule = await learningService.scheduleReview(vocab[0].id, 'easy');

    expect(schedule.nextReview).toBeInstanceOf(Date);
  });
});
```

#### A13: Performance Optimization (Parallel with A10, A12)

- **Agent**: perf-analyzer
- **Priority**: Medium
- **Depends**: A5, A4
- **Files**: `next.config.js`, `src/components/**/*.tsx`
- **Outcome**: Bundle <500KB, LCP <2.5s

```typescript
// Dynamic imports for code splitting
const VocabularyBuilder = dynamic(
  () => import('@/components/VocabularyBuilder'),
  { loading: () => <Skeleton /> }
);

// Image optimization
import Image from 'next/image';

<Image
  src={imageUrl}
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>

// React Query for data caching
const { data, isLoading } = useQuery({
  queryKey: ['vocabulary', userId],
  queryFn: () => vocabularyService.getAll(userId),
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

**Validation Phase 7**:

- ✓ < 10 any usages total
- ✓ All services covered by integration tests
- ✓ Bundle < 500KB
- ✓ Lighthouse score > 90

---

### Phase 8: Polish (4 hours)

#### A14: Code Review and Documentation

- **Agent**: reviewer
- **Priority**: Low
- **Depends**: A4, A7, A10
- **Files**: `README.md`, `docs/**/*.md`
- **Outcome**: Production-ready documentation

**Documentation Updates**:

1. Architecture diagrams
2. API documentation
3. Developer onboarding guide
4. Deployment procedures
5. Testing strategy

**Validation Phase 8**:

- ✓ All code reviewed
- ✓ Docs up to date
- ✓ No TODOs remaining
- ✓ **Overall score: 9.0/10**

---

## Execution Strategy

### Critical Path

```
A1 → A2 → A3 → A4 → A7 → A8 → A9 → A10 → A12 → A14
```

**Total**: 93 cost units, 76 hours, 3.8 weeks

### Parallel Optimization

**Week 1** (Phase 1-2):

- Day 1-2: A1 (Foundation)
- Day 3-5: A2 (Repository Layer)

**Week 2** (Phase 3-4):

- A3 + A5 in parallel (Service Layer + Zustand)
- A4 + A6 in parallel (API Routes + Auth)

**Week 3** (Phase 5-6):

- A7 + A8 in parallel (Tests + Type Cleanup 1)
- A9 + A11 in parallel (Type Cleanup 2 + AgentDB)

**Week 4** (Phase 7-8):

- A10 + A12 + A13 in parallel (Final Types + Tests + Perf)
- A14 (Documentation)

---

## Milestone Checkpoints

### M1: Type System Unified (End of Week 1)

- ✓ A1 complete
- ✓ Build passes
- ✓ No duplicate types
- Score: 7.0/10

### M2: Clean Architecture (End of Week 2)

- ✓ A1-A4 complete
- ✓ Repository pattern implemented
- ✓ Service layer active
- ✓ Routes <200 lines
- Score: 7.8/10

### M3: Modern State Management (Mid Week 3)

- ✓ A1-A6 complete
- ✓ Zustand integrated
- ✓ Auth optimized
- Score: 8.2/10

### M4: Production-Grade Type Safety (End of Week 3)

- ✓ A1-A10 complete
- ✓ <10 any usages
- ✓ Tests realistic
- ✓ TSC strict passing
- Score: 8.8/10

### M5: Production Ready (End of Week 4)

- ✓ All actions complete
- ✓ All tests passing
- ✓ Performance benchmarks met
- ✓ Documentation complete
- **Score: 9.0/10**

---

## Risk Mitigation

### High Risk: A2 (Repository Extraction)

**Risk**: Breaking existing functionality

**Mitigation**:

1. Create repositories alongside existing code
2. Migrate one route at a time
3. Run full test suite after each migration
4. Keep old code until all tests pass

### High Risk: A7 (Realistic Tests)

**Risk**: Revealing hidden bugs

**Mitigation**:

1. Fix one test file at a time
2. Use Docker for test databases
3. Maintain >95% coverage throughout
4. Document all bugs found

### Medium Risk: A4 (API Refactoring)

**Risk**: Breaking client apps

**Mitigation**:

1. Keep API contracts stable
2. Only change internal implementation
3. Version API if needed
4. Monitor error rates post-deploy

---

## Success Metrics

### Quantitative

| Metric        | Current   | Target    | Improvement |
| ------------- | --------- | --------- | ----------- |
| `any` usages  | 1,088     | 10        | 99.1% ↓     |
| Largest route | 673 lines | 200 lines | 70.3% ↓     |
| Overall score | 6.7       | 9.0       | 34.3% ↑     |
| Test quality  | 6.5       | 9.5       | 46.2% ↑     |

### Qualitative

- ✓ Code maintainable by new developers
- ✓ Adding features requires minimal changes
- ✓ Tests give confidence in refactoring
- ✓ Type system catches bugs at compile time
- ✓ State management is predictable
- ✓ Architecture is scalable

---

## AgentDB Integration for Plan Execution

Store this GOAP plan in AgentDB for tracking and learning:

```typescript
import { mcp__agentdb__agentdb_pattern_store } from '@agentdb/mcp';

// Store the plan
await mcp__agentdb__agentdb_pattern_store({
  taskType: 'goap_refactoring',
  approach: JSON.stringify(goapPlan),
  successRate: 0, // Will update as we execute
  metadata: {
    project: 'describe-it',
    targetScore: 9.0,
    currentScore: 6.7,
  },
});

// Track each action completion
async function completeAction(actionId: string, success: boolean) {
  await mcp__agentdb__experience_record({
    session_id: 'describe-it-refactor',
    tool_name: `goap_action_${actionId}`,
    action: actionId,
    outcome: success ? 'success' : 'failure',
    reward: success ? 1 : 0,
    success,
  });
}
```

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up AgentDB** tracking
3. **Start Phase 1** (A1 - Type Consolidation)
4. **Daily standups** to track progress
5. **Adjust plan** based on learnings

**Ready to execute?** Begin with action A1!
