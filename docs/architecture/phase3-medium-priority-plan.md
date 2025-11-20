# Phase 3 Medium Priority - Architecture Plan

**Generated**: 2025-11-20
**Status**: Architecture Analysis Complete
**Priority**: MEDIUM

---

## Executive Summary

This document provides architectural specifications for Phase 3 medium-priority items based on comprehensive codebase analysis. The plan addresses three important areas for long-term maintainability and scalability:

1. **API Versioning Design Pattern** - Future-proof API architecture
2. **File Refactoring Strategy** - 180+ files over 500 lines
3. **Test Coverage Improvement Plan** - Comprehensive quality assurance

---

## 1. API Versioning Design Pattern

### Current State Analysis

**API Structure**: Next.js App Router API Routes
```
/src/app/api/
├── admin/
│   └── analytics/route.ts
├── analytics/
│   ├── dashboard/route.ts
│   └── web-vitals/route.ts
├── descriptions/
│   └── generate/
│       ├── route.ts (652 lines)
│       └── rate-limited-route.ts (668 lines)
├── export/
│   └── generate/route.ts (609 lines)
├── images/
│   └── search/route.ts (538 lines)
├── progress/
│   └── track/route.ts (724 lines)
├── settings/
│   └── save/route.ts (763 lines)
├── vocabulary/
│   └── save/route.ts (748 lines)
└── health/route.ts
```

**Current Issues**:
- No versioning strategy
- Breaking changes would affect all clients
- No migration path for API changes
- Difficult to deprecate endpoints
- No A/B testing capability for API changes

### Architectural Solution

#### Versioning Strategy: URL Path Versioning

**Rationale**:
- Clear and explicit in URLs
- Easy to route and test
- Supports multiple versions simultaneously
- Client can explicitly choose version
- Compatible with Next.js App Router

#### URL Structure

```
/api/v{version}/{resource}/{action}

Examples:
/api/v1/descriptions/generate
/api/v1/images/search
/api/v1/vocabulary/save
/api/v2/descriptions/generate  # New version with improved features
/api/v2/images/search          # Breaking change from v1
```

#### Directory Structure

```
/src/app/api/
├── v1/                          # Version 1 (current)
│   ├── descriptions/
│   │   └── generate/
│   │       └── route.ts
│   ├── images/
│   │   └── search/
│   │       └── route.ts
│   ├── vocabulary/
│   │   └── save/
│   │       └── route.ts
│   ├── progress/
│   │   └── track/
│   │       └── route.ts
│   ├── export/
│   │   └── generate/
│   │       └── route.ts
│   └── settings/
│       └── save/
│           └── route.ts
├── v2/                          # Version 2 (new features)
│   ├── descriptions/
│   │   └── generate/
│   │       └── route.ts         # Enhanced with streaming
│   └── images/
│       └── search/
│           └── route.ts         # New filter options
├── shared/                      # Shared utilities
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   ├── validation.ts
│   │   └── cors.ts
│   ├── services/                # Business logic (version-agnostic)
│   │   ├── description.service.ts
│   │   ├── image.service.ts
│   │   ├── vocabulary.service.ts
│   │   └── progress.service.ts
│   ├── validators/              # Request/response schemas
│   │   ├── v1/
│   │   └── v2/
│   └── types/
│       ├── v1/
│       └── v2/
├── health/route.ts              # Unversioned
└── version/route.ts             # API version info endpoint
```

#### Implementation Architecture

```typescript
// /src/app/api/shared/types/api-version.ts
export type APIVersion = 'v1' | 'v2';

export interface APIVersionInfo {
  version: APIVersion;
  status: 'active' | 'deprecated' | 'sunset';
  deprecationDate?: string;
  sunsetDate?: string;
  docsUrl: string;
  changelog: string;
}

export interface VersionedResponse<T> {
  apiVersion: APIVersion;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
```

```typescript
// /src/app/api/version/route.ts
import { NextResponse } from 'next/server';

const API_VERSIONS: Record<APIVersion, APIVersionInfo> = {
  v1: {
    version: 'v1',
    status: 'active',
    docsUrl: '/docs/api/v1',
    changelog: '/docs/api/v1/changelog',
  },
  v2: {
    version: 'v2',
    status: 'active',
    docsUrl: '/docs/api/v2',
    changelog: '/docs/api/v2/changelog',
  },
};

export async function GET() {
  return NextResponse.json({
    currentVersion: 'v2',
    supportedVersions: Object.values(API_VERSIONS),
    defaultVersion: 'v1',
  });
}
```

```typescript
// /src/app/api/shared/middleware/version-middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function withVersioning(version: APIVersion) {
  return function versionMiddleware(
    handler: (req: NextRequest) => Promise<Response>
  ) {
    return async function (req: NextRequest) {
      // Add version to request headers for logging
      const headers = new Headers(req.headers);
      headers.set('X-API-Version', version);

      // Check if version is deprecated
      const versionInfo = API_VERSIONS[version];
      if (versionInfo.status === 'deprecated') {
        headers.set('X-API-Deprecated', 'true');
        if (versionInfo.deprecationDate) {
          headers.set('X-API-Deprecation-Date', versionInfo.deprecationDate);
        }
        if (versionInfo.sunsetDate) {
          headers.set('X-API-Sunset-Date', versionInfo.sunsetDate);
        }
      }

      // Call actual handler
      const response = await handler(req);

      // Add version info to response
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-API-Version', version);

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    };
  };
}
```

```typescript
// /src/app/api/v1/descriptions/generate/route.ts
import { withVersioning } from '@/app/api/shared/middleware/version-middleware';
import { descriptionService } from '@/app/api/shared/services/description.service';
import { validateV1Request } from '@/app/api/shared/validators/v1/description';

async function handler(req: NextRequest) {
  // V1 implementation
  const body = await req.json();
  const validated = validateV1Request(body);
  const result = await descriptionService.generate(validated);

  return NextResponse.json({
    apiVersion: 'v1',
    data: result,
  });
}

export const POST = withVersioning('v1')(handler);
```

```typescript
// /src/app/api/v2/descriptions/generate/route.ts
import { withVersioning } from '@/app/api/shared/middleware/version-middleware';
import { descriptionService } from '@/app/api/shared/services/description.service';
import { validateV2Request } from '@/app/api/shared/validators/v2/description';

async function handler(req: NextRequest) {
  // V2 implementation with streaming
  const body = await req.json();
  const validated = validateV2Request(body);

  // New feature: streaming responses
  if (validated.stream) {
    return descriptionService.generateStream(validated);
  }

  const result = await descriptionService.generateV2(validated);

  return NextResponse.json({
    apiVersion: 'v2',
    data: result,
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
  });
}

export const POST = withVersioning('v2')(handler);
```

#### Client-Side Version Management

```typescript
// /src/lib/api/client-versioned.ts
import { APIVersion } from '@/app/api/shared/types/api-version';

export class VersionedAPIClient {
  private baseUrl: string;
  private version: APIVersion;

  constructor(version: APIVersion = 'v1') {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    this.version = version;
  }

  private getEndpoint(path: string): string {
    return `${this.baseUrl}/api/${this.version}/${path}`;
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await fetch(this.getEndpoint(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-API-Version': this.version,
      },
      body: JSON.stringify(data),
    });

    const apiVersion = response.headers.get('X-API-Version');
    const isDeprecated = response.headers.get('X-API-Deprecated') === 'true';

    if (isDeprecated) {
      console.warn(
        `API version ${apiVersion} is deprecated. ` +
        `Sunset date: ${response.headers.get('X-API-Sunset-Date')}`
      );
    }

    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }

    const result = await response.json();
    return result.data;
  }

  // Convenience methods
  async generateDescription(params: GenerateDescriptionParams) {
    return this.post<Description>('descriptions/generate', params);
  }

  async searchImages(params: SearchImagesParams) {
    return this.post<ImageSearchResult>('images/search', params);
  }
}

// Usage in components
const apiV1 = new VersionedAPIClient('v1');
const apiV2 = new VersionedAPIClient('v2');

// Gradual migration
const description = await apiV2.generateDescription({
  text: 'mountain',
  style: 'narrativo',
  stream: true // v2 only feature
});
```

#### Migration Strategy

**Phase 1: Setup Infrastructure (Week 1)**
- Create `/src/app/api/shared/` structure
- Move common middleware to shared
- Create version middleware
- Set up version info endpoint

**Phase 2: Create v1 Namespace (Week 1-2)**
- Move existing routes to `/api/v1/`
- Update internal imports
- Test all endpoints work in new structure
- No breaking changes to clients yet

**Phase 3: Update Client Calls (Week 2)**
- Update all client-side API calls to use `/api/v1/`
- Add version headers
- Test full application
- Deploy with v1 as default

**Phase 4: Introduce v2 (Week 3+)**
- Create `/api/v2/` for new features
- Implement new endpoints with improvements
- A/B test v2 endpoints
- Document breaking changes

**Phase 5: Deprecation & Sunset (Future)**
- Mark v1 as deprecated
- Set sunset date (6-12 months notice)
- Monitor usage metrics
- Remove deprecated versions after sunset

#### API Versioning Best Practices

1. **Semantic Versioning**: Major version only (v1, v2, v3)
2. **Backward Compatibility**: Minor changes within same version
3. **Deprecation Policy**:
   - Announce deprecation 6 months before sunset
   - Provide migration guide
   - Send warnings in response headers
4. **Documentation**: Maintain separate docs per version
5. **Testing**: Integration tests per version
6. **Monitoring**: Track usage by version

#### Quality Attributes

- **Flexibility**: Support multiple versions simultaneously
- **Clear Communication**: Deprecation warnings in headers
- **Migration Path**: Clear upgrade path for clients
- **Monitoring**: Track version usage analytics
- **Documentation**: Version-specific API docs

---

## 2. File Refactoring Strategy for Large Files

### Current State Analysis

**Scale of Problem**: 180+ files over 500 lines

**Top Offenders** (>1000 lines):
```
src/types/comprehensive.ts                   1,881 lines
tests/components/Forms/SignupForm.test.tsx   1,474 lines
src/lib/services/database.ts                 1,417 lines
tests/components/Vocabulary/VocabularyFilter.test.tsx  1,395 lines
src/lib/api/openai.ts                        1,301 lines
src/lib/logging/sessionReportGenerator.ts    1,273 lines
src/components/HelpContent.tsx               1,250 lines
tests/components/Vocabulary/ImportExport.test.tsx  1,243 lines
src/components/GammaVocabularyManager.tsx    1,215 lines
src/types/api/index.ts                       1,177 lines
src/lib/api/supabase.ts                      1,154 lines
src/lib/schemas/api-validation.ts            1,109 lines
tests/components/Auth/AuthModal.test.tsx     1,102 lines
src/lib/auth/AuthManager.ts                    964 lines
tests/components/Vocabulary/VocabularyList.test.tsx  963 lines
src/types/database.generated.ts                957 lines
tests/utils/fixtures.ts                        958 lines
```

**Categories**:
- **Type Definitions**: 3 files (4,015 lines total)
- **Service Layer**: 8 files (7,000+ lines total)
- **UI Components**: 5 files (5,000+ lines total)
- **Test Files**: 20+ files (15,000+ lines total)

### Architectural Solution

#### Refactoring Pattern: Domain-Driven File Organization

**Principle**: Files should be organized by domain/feature, with each file having a single responsibility and <500 lines.

#### Strategy 1: Type Definitions Refactoring

**Before**:
```
/src/types/
├── comprehensive.ts (1,881 lines) ❌
├── api/index.ts (1,177 lines) ❌
└── database.generated.ts (957 lines) ✓ (auto-generated)
```

**After**:
```
/src/types/
├── index.ts                    # Public API exports
├── utility.ts                  # Generic utility types
├── json.ts                     # JSON-safe types
├── database/
│   ├── index.ts
│   ├── user.ts                # User-related types
│   ├── vocabulary.ts          # Vocabulary types
│   ├── progress.ts            # Progress types
│   ├── session.ts             # Session types
│   └── generated.ts           # Auto-generated
├── api/
│   ├── index.ts
│   ├── common.ts              # Common API types
│   ├── descriptions.ts        # Description API types
│   ├── images.ts              # Image search types
│   ├── vocabulary.ts          # Vocabulary API types
│   ├── progress.ts            # Progress API types
│   └── responses.ts           # Response wrappers
├── domain/
│   ├── vocabulary.ts          # Vocabulary domain types
│   ├── learning.ts            # Learning domain types
│   ├── user.ts                # User domain types
│   └── analytics.ts           # Analytics types
└── ui/
    ├── props.ts               # Component props
    ├── state.ts               # UI state types
    └── events.ts              # Event handler types
```

**Implementation**:
```typescript
// /src/types/index.ts
export * from './utility';
export * from './json';
export * from './database';
export * from './api';
export * from './domain';
export * from './ui';
```

```typescript
// /src/types/database/user.ts
export interface User {
  id: string;
  email: string;
  username?: string;
  // ... user fields only
}

export interface UserPreferences {
  theme: ThemePreference;
  language: LanguagePreference;
  // ... preferences only
}

export interface UserProgress {
  // ... progress tracking only
}
```

#### Strategy 2: Service Layer Refactoring

**Before**:
```
/src/lib/services/
├── database.ts (1,417 lines) ❌
├── openaiService.ts (618 lines) ❌
└── vocabularyService.ts (591 lines) ❌
```

**After**:
```
/src/lib/services/
├── database/
│   ├── index.ts                    # Public API
│   ├── client.ts                   # Supabase client setup
│   ├── connection.ts               # Connection pooling
│   ├── base.service.ts             # Base CRUD operations
│   ├── user.service.ts             # User operations
│   ├── vocabulary.service.ts       # Vocabulary operations
│   ├── progress.service.ts         # Progress operations
│   ├── session.service.ts          # Session operations
│   ├── analytics.service.ts        # Analytics operations
│   └── types.ts                    # Service-specific types
├── openai/
│   ├── index.ts
│   ├── client.ts                   # OpenAI client setup
│   ├── description.service.ts      # Description generation
│   ├── qa.service.ts               # Q&A generation
│   ├── translation.service.ts      # Translation
│   ├── streaming.ts                # Streaming responses
│   └── types.ts
└── vocabulary/
    ├── index.ts
    ├── storage.service.ts          # Storage operations
    ├── extraction.service.ts       # Phrase extraction
    ├── categorization.service.ts   # Categorization
    ├── export.service.ts           # Export operations
    └── types.ts
```

**Example Refactor**:
```typescript
// Before: /src/lib/services/database.ts (1,417 lines)
export class DatabaseService {
  // User operations (200 lines)
  async getUserById() { }
  async createUser() { }
  async updateUser() { }

  // Vocabulary operations (300 lines)
  async getVocabulary() { }
  async saveVocabulary() { }

  // Progress operations (250 lines)
  async getProgress() { }
  async updateProgress() { }

  // Session operations (200 lines)
  // Analytics operations (200 lines)
  // Export operations (150 lines)
  // ... 117 more lines
}

// After: /src/lib/services/database/user.service.ts (200 lines)
export class UserService extends BaseService {
  async getUserById(id: string): Promise<User> { }
  async createUser(data: CreateUserData): Promise<User> { }
  async updateUser(id: string, data: UpdateUserData): Promise<User> { }
  async deleteUser(id: string): Promise<void> { }
  // ... only user-related methods
}

// After: /src/lib/services/database/vocabulary.service.ts (300 lines)
export class VocabularyService extends BaseService {
  async getVocabulary(userId: string): Promise<VocabularyItem[]> { }
  async saveVocabulary(userId: string, item: VocabularyItem): Promise<void> { }
  // ... only vocabulary-related methods
}

// After: /src/lib/services/database/index.ts
export const databaseService = {
  users: new UserService(),
  vocabulary: new VocabularyService(),
  progress: new ProgressService(),
  sessions: new SessionService(),
  analytics: new AnalyticsService(),
};

// Usage remains similar:
// Before: databaseService.getUserById(id)
// After:  databaseService.users.getById(id)
```

#### Strategy 3: Component Refactoring

**Before**:
```
/src/components/
├── GammaVocabularyManager.tsx (1,215 lines) ❌
├── HelpContent.tsx (1,250 lines) ❌
└── EnhancedQASystem.tsx (751 lines) ❌
```

**After**:
```
/src/components/
├── VocabularyManager/
│   ├── index.tsx                      # Main component (100 lines)
│   ├── VocabularyManagerProvider.tsx  # Context provider
│   ├── VocabularyHeader.tsx           # Header section
│   ├── VocabularyFilters.tsx          # Filter section
│   ├── VocabularyList.tsx             # List view
│   ├── VocabularyGrid.tsx             # Grid view
│   ├── VocabularyStats.tsx            # Statistics
│   ├── VocabularyExport.tsx           # Export dialog
│   ├── hooks/
│   │   ├── useVocabularyManager.ts
│   │   ├── useVocabularyFilters.ts
│   │   └── useVocabularyExport.ts
│   ├── types.ts
│   └── utils.ts
├── Help/
│   ├── index.tsx                      # Help system root
│   ├── HelpSidebar.tsx                # Navigation
│   ├── HelpSearch.tsx                 # Search
│   ├── sections/
│   │   ├── GettingStarted.tsx
│   │   ├── Features.tsx
│   │   ├── Troubleshooting.tsx
│   │   ├── FAQ.tsx
│   │   └── APIReference.tsx
│   └── types.ts
└── QASystem/
    ├── index.tsx                      # Main component
    ├── QuestionGenerator.tsx          # Question generation
    ├── AnswerDisplay.tsx              # Answer display
    ├── QAHistory.tsx                  # History
    ├── QASettings.tsx                 # Settings
    ├── hooks/
    │   ├── useQAGeneration.ts
    │   └── useQAHistory.ts
    └── types.ts
```

**Example Component Refactor**:
```typescript
// Before: GammaVocabularyManager.tsx (1,215 lines)
export function GammaVocabularyManager() {
  // 100 lines of state
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({});
  // ... 20 more state variables

  // 200 lines of handlers
  const handleAdd = () => { };
  const handleDelete = () => { };
  const handleFilter = () => { };
  // ... 15 more handlers

  // 300 lines of rendering
  return (
    <div>
      {/* Header */}
      {/* Filters */}
      {/* List */}
      {/* Stats */}
      {/* Modals */}
    </div>
  );
}

// After: /src/components/VocabularyManager/index.tsx (100 lines)
export function VocabularyManager(props: VocabularyManagerProps) {
  return (
    <VocabularyManagerProvider>
      <div className="vocabulary-manager">
        <VocabularyHeader />
        <VocabularyFilters />
        <VocabularyList />
        <VocabularyStats />
      </div>
    </VocabularyManagerProvider>
  );
}

// After: /src/components/VocabularyManager/VocabularyHeader.tsx (80 lines)
export function VocabularyHeader() {
  const { stats, exportData } = useVocabularyManager();

  return (
    <header className="vocabulary-header">
      {/* Header implementation */}
    </header>
  );
}

// After: /src/components/VocabularyManager/hooks/useVocabularyManager.ts (150 lines)
export function useVocabularyManager() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  // ... state and logic

  return {
    items,
    addItem,
    deleteItem,
    updateItem,
    // ... methods
  };
}
```

#### Strategy 4: Test File Refactoring

**Before**:
```
/tests/components/Forms/SignupForm.test.tsx (1,474 lines)
```

**After**:
```
/tests/components/Forms/SignupForm/
├── SignupForm.test.tsx              # Main test suite (100 lines)
├── validation.test.tsx              # Validation tests (200 lines)
├── submission.test.tsx              # Form submission (200 lines)
├── error-handling.test.tsx          # Error scenarios (200 lines)
├── accessibility.test.tsx           # A11y tests (150 lines)
├── integration.test.tsx             # Integration tests (200 lines)
├── fixtures.ts                      # Test data
└── helpers.ts                       # Test utilities
```

#### Refactoring Metrics & Goals

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Files >500 lines | 180 | 50 | 3 months |
| Largest file size | 1,881 lines | 500 lines | 1 month |
| Average file size | 350 lines | 200 lines | 3 months |
| Type file organization | 3 files | 20+ files | 2 weeks |
| Service organization | Monolithic | Domain-driven | 1 month |

#### Implementation Roadmap

**Month 1: Critical Files**
- Week 1: Refactor `comprehensive.ts` (1,881 lines)
- Week 2: Refactor `database.ts` service (1,417 lines)
- Week 3: Refactor `api/index.ts` types (1,177 lines)
- Week 4: Refactor `GammaVocabularyManager` (1,215 lines)

**Month 2: High-Impact Files**
- Refactor remaining files >1000 lines
- Refactor service layer files >600 lines
- Update imports across codebase
- Test all refactored modules

**Month 3: Systematic Cleanup**
- Refactor files 500-1000 lines
- Standardize directory structure
- Document patterns
- Final testing and validation

#### Refactoring Principles

1. **Backwards Compatibility**: Maintain same public API
2. **Single Responsibility**: Each file has one clear purpose
3. **Discoverability**: Logical directory structure
4. **Import Paths**: Use barrel exports (`index.ts`)
5. **Testing**: Maintain test coverage during refactor
6. **Documentation**: Update docs with new structure

#### Automation Tools

```bash
# Script to find large files
npm run analyze:file-sizes

# Script to suggest refactoring opportunities
npm run analyze:complexity

# Script to validate imports after refactor
npm run validate:imports
```

```typescript
// /scripts/analyze-file-sizes.ts
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

async function analyzeFiles(dir: string): Promise<FileAnalysis[]> {
  const files = await readdir(dir, { recursive: true });
  const analysis: FileAnalysis[] = [];

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

    const filePath = join(dir, file);
    const stats = await stat(filePath);
    const lines = await countLines(filePath);

    if (lines > 500) {
      analysis.push({
        path: filePath,
        lines,
        size: stats.size,
        priority: lines > 1000 ? 'high' : 'medium',
      });
    }
  }

  return analysis.sort((a, b) => b.lines - a.lines);
}
```

---

## 3. Test Coverage Improvement Plan

### Current State Analysis

**Test Infrastructure**:
- **Unit Tests**: Vitest (192 test files)
- **Integration Tests**: Vitest
- **E2E Tests**: Playwright (6 test files)
- **Total Test Files**: 192+

**Test Configuration**:
```javascript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'tests/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData',
  ]
}
```

**Coverage Gaps Identified**:
1. No coverage metrics currently tracked
2. Some critical paths untested
3. Edge cases not covered
4. Integration test gaps
5. E2E coverage limited

### Architectural Solution

#### Testing Strategy: Comprehensive Coverage Matrix

```
┌─────────────────────────────────────────────────────┐
│              Testing Pyramid                        │
│                                                     │
│                  E2E Tests (10%)                    │
│              ┌──────────────────┐                  │
│              │  Critical Flows  │                  │
│              └──────────────────┘                  │
│                                                     │
│         Integration Tests (30%)                    │
│       ┌──────────────────────────────┐            │
│       │  API, Database, Services     │            │
│       └──────────────────────────────┘            │
│                                                     │
│             Unit Tests (60%)                       │
│  ┌────────────────────────────────────────────┐  │
│  │  Components, Hooks, Utils, Services        │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### Coverage Targets

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Overall Lines | Unknown | 80% | High |
| Critical Paths | Unknown | 95% | Critical |
| Components | ~60% est | 85% | High |
| Hooks | ~50% est | 90% | High |
| Services | ~40% est | 85% | High |
| API Routes | ~30% est | 90% | Critical |
| Utils | ~70% est | 95% | Medium |
| Types | N/A | N/A | N/A |

#### Testing Architecture

```typescript
// /tests/config/coverage-config.ts
export const COVERAGE_THRESHOLDS = {
  global: {
    lines: 80,
    statements: 80,
    functions: 80,
    branches: 75,
  },
  critical: {
    // API routes
    'src/app/api/**/*.ts': {
      lines: 90,
      functions: 90,
      branches: 85,
    },
    // Services
    'src/lib/services/**/*.ts': {
      lines: 85,
      functions: 85,
      branches: 80,
    },
    // Auth
    'src/lib/auth/**/*.ts': {
      lines: 95,
      functions: 95,
      branches: 90,
    },
  },
};
```

```typescript
// /tests/utils/test-categories.ts
export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  ACCESSIBILITY = 'a11y',
}

export interface TestMetadata {
  category: TestCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  requiresDatabase?: boolean;
  requiresAuth?: boolean;
}

// Usage in tests
describe('UserService', () => {
  const metadata: TestMetadata = {
    category: TestCategory.INTEGRATION,
    priority: 'critical',
    tags: ['database', 'user', 'auth'],
    requiresDatabase: true,
  };

  // tests...
});
```

#### Coverage Improvement Roadmap

**Phase 1: Baseline Measurement (Week 1)**
```bash
# Generate initial coverage report
npm run test:coverage

# Analyze gaps
npm run analyze:coverage

# Generate coverage report
npm run report:coverage
```

**Phase 2: Critical Path Coverage (Week 2-3)**
- API routes: 90% coverage
- Authentication: 95% coverage
- Database services: 85% coverage
- Payment/billing (if exists): 95% coverage

**Phase 3: Core Functionality (Week 4-5)**
- Component coverage: 85%
- Hook coverage: 90%
- Service coverage: 85%
- Utility coverage: 95%

**Phase 4: Edge Cases & Integration (Week 6-7)**
- Error scenarios
- Boundary conditions
- Integration tests
- Race conditions

**Phase 5: E2E & Performance (Week 8)**
- Critical user flows
- Performance benchmarks
- Accessibility tests
- Security tests

#### Test Organization Strategy

```
/tests/
├── unit/                          # Unit tests (60%)
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   └── lib/
├── integration/                   # Integration tests (30%)
│   ├── api/
│   ├── database/
│   ├── auth/
│   ├── services/
│   └── flows/
├── e2e/                          # E2E tests (10%)
│   ├── critical-flows.spec.ts
│   ├── user-journey.spec.ts
│   └── regression.spec.ts
├── performance/                  # Performance tests
│   ├── api-performance.test.ts
│   ├── component-performance.test.ts
│   └── benchmarks/
├── security/                     # Security tests
│   ├── auth-security.test.ts
│   ├── xss-prevention.test.ts
│   └── sql-injection.test.ts
├── accessibility/                # A11y tests
│   ├── wcag-compliance.test.ts
│   └── keyboard-navigation.test.ts
├── utils/                        # Test utilities
│   ├── fixtures.ts
│   ├── mocks.ts
│   ├── helpers.ts
│   └── test-providers.tsx
└── config/                       # Test configuration
    ├── coverage-config.ts
    ├── test-categories.ts
    └── custom-matchers.ts
```

#### Test Quality Metrics

```typescript
// /tests/config/quality-metrics.ts
export interface TestQualityMetrics {
  coverage: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  };
  testCount: {
    total: number;
    unit: number;
    integration: number;
    e2e: number;
  };
  testQuality: {
    avgAssertionsPerTest: number;
    testDuration: number;
    flakyTests: number;
    skippedTests: number;
  };
  criticalPathCoverage: number;
}

// Track metrics over time
export async function trackCoverageMetrics() {
  const metrics = await getCoverageMetrics();

  // Store in database or file
  await storageService.saveMetrics({
    timestamp: new Date(),
    ...metrics,
  });

  // Alert if coverage drops
  if (metrics.coverage.lines < COVERAGE_THRESHOLDS.global.lines) {
    console.warn('Coverage dropped below threshold!');
  }
}
```

#### Continuous Integration

```yaml
# .github/workflows/test-coverage.yml
name: Test Coverage

on:
  pull_request:
  push:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Check coverage thresholds
        run: npm run coverage:check

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Comment coverage on PR
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

#### Implementation Checklist

**Week 1: Setup**
- [ ] Configure coverage thresholds
- [ ] Set up coverage tracking
- [ ] Generate baseline report
- [ ] Identify gaps

**Week 2-3: Critical Coverage**
- [ ] API routes: 90%
- [ ] Auth: 95%
- [ ] Database: 85%
- [ ] Critical services: 90%

**Week 4-5: Core Coverage**
- [ ] Components: 85%
- [ ] Hooks: 90%
- [ ] Services: 85%
- [ ] Utils: 95%

**Week 6-7: Integration**
- [ ] API integration tests
- [ ] Database integration tests
- [ ] Service integration tests
- [ ] Flow integration tests

**Week 8: E2E & Polish**
- [ ] Critical user flows
- [ ] Performance tests
- [ ] A11y tests
- [ ] Security tests
- [ ] Documentation

#### Quality Attributes

- **Reliability**: High test coverage ensures code works
- **Maintainability**: Tests document expected behavior
- **Confidence**: Safe refactoring with comprehensive tests
- **Quality**: Catch bugs before production
- **Performance**: Fast test execution (<5min for full suite)

---

## Implementation Priority Matrix

| Task | Impact | Effort | Priority | Timeline |
|------|--------|--------|----------|----------|
| Test Coverage Baseline | High | Low | 1 | Week 1 |
| API Versioning Infrastructure | High | Medium | 2 | Week 1-2 |
| Critical File Refactoring | High | High | 3 | Week 1-4 |
| Critical Path Testing | High | Medium | 4 | Week 2-3 |
| Type File Refactoring | Medium | Low | 5 | Week 2 |
| Service Layer Refactoring | Medium | High | 6 | Week 3-4 |
| Component Refactoring | Medium | High | 7 | Month 2 |
| Comprehensive Testing | Medium | High | 8 | Week 4-8 |

---

## Success Criteria

### API Versioning
- ✅ v1 namespace created with all existing endpoints
- ✅ Version middleware implemented
- ✅ Client updated to use versioned endpoints
- ✅ Documentation for versioning strategy
- ✅ v2 endpoint for at least one resource

### File Refactoring
- ✅ All files <500 lines
- ✅ Type files organized by domain
- ✅ Service layer split by domain
- ✅ Components split into sub-components
- ✅ No broken imports
- ✅ All tests passing

### Test Coverage
- ✅ Overall coverage: 80%
- ✅ Critical paths: 95%
- ✅ API routes: 90%
- ✅ Components: 85%
- ✅ Services: 85%
- ✅ CI/CD integration
- ✅ Coverage tracking dashboard

---

## Risk Mitigation

1. **Breaking Changes During Refactoring**
   - Use barrel exports to maintain import paths
   - Incremental migration with tests
   - Feature flags for gradual rollout

2. **Test Suite Performance**
   - Parallel test execution
   - Smart test selection
   - Cached dependencies

3. **API Version Proliferation**
   - Strict deprecation policy
   - Version sunset timeline
   - Migration guides

---

## Next Steps

1. **Get approval** for architectural approach
2. **Create POCs** for each strategy
3. **Estimate effort** for each phase
4. **Schedule work** across team
5. **Set up tracking** for metrics
6. **Begin implementation** following roadmap

---

**Document Status**: ✅ Complete
**Review Required**: Architecture Team, Tech Lead
**Dependencies**: Phase 2 completion recommended before Phase 3
