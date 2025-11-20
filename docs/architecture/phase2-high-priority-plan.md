# Phase 2 High Priority - Architecture Plan

**Generated**: 2025-11-20
**Status**: Architecture Analysis Complete
**Priority**: HIGH

---

## Executive Summary

This document provides architectural specifications for Phase 2 high-priority items based on comprehensive codebase analysis. The plan addresses three critical areas requiring immediate attention:

1. **Framer Motion Type Errors** - 44 files affected
2. **URL-based Routing Implementation** - State management enhancement
3. **Dashboard Integration Architecture** - Component consolidation

---

## 1. Framer Motion Type Errors Fix Strategy

### Current State Analysis

**Files Affected**: 44 files importing framer-motion
- 42 component files in `/src/components`
- 1 test file
- 1 main page file (`src/app/page.tsx`)

**Known Issues**:
- `Variants` type errors in Onboarding components (documented in PRODUCTION_BLOCKERS.md)
- Type assertion workarounds using `as any` in MotionComponents.tsx
- Inconsistent typing patterns across components

**Root Cause**:
Framer Motion v12.23.22 has stricter type requirements for animation variants and transitions. The current implementation uses:
1. Generic type assertions (`as any`)
2. String literals for transition types instead of const assertions
3. Missing explicit type definitions for variant objects

### Architectural Solution

#### Strategy 1: Type-Safe Motion Wrapper Library (RECOMMENDED)

**Location**: `/src/lib/motion/`

```typescript
// /src/lib/motion/types.ts
import { Variants, Transition } from 'framer-motion';

export type AnimationType = 'spring' | 'tween' | 'inertia' | 'just' | 'keyframes';

export interface SafeVariantConfig {
  hidden?: VariantState;
  visible?: VariantState;
  exit?: VariantState;
  [key: string]: VariantState | undefined;
}

export interface VariantState {
  opacity?: number;
  scale?: number;
  x?: number | string;
  y?: number | string;
  rotate?: number;
  transition?: SafeTransition;
}

export interface SafeTransition {
  type?: AnimationType;
  duration?: number;
  delay?: number;
  stiffness?: number;
  damping?: number;
  ease?: string | number[];
  staggerChildren?: number;
  delayChildren?: number;
}

// Type-safe variant builder
export const createVariants = (config: SafeVariantConfig): Variants => {
  return Object.entries(config).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object') {
      acc[key] = {
        ...value,
        transition: value.transition ? {
          ...value.transition,
          type: value.transition.type as const,
        } : undefined,
      };
    }
    return acc;
  }, {} as Variants);
};
```

```typescript
// /src/lib/motion/presets.ts
import { createVariants } from './types';

export const fadeInVariants = createVariants({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { type: 'tween', duration: 0.3 }
  },
  exit: { opacity: 0 }
});

export const slideUpVariants = createVariants({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  },
  exit: { opacity: 0, y: -20 }
});

export const scaleVariants = createVariants({
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 20 }
  },
  exit: { opacity: 0, scale: 0.8 }
});

// Stagger children preset
export const staggerContainerVariants = createVariants({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
});
```

```typescript
// /src/lib/motion/components.ts
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Properly typed motion components without 'as any'
export const MotionDiv = motion.div;
export const MotionButton = motion.button;
export const MotionSection = motion.section;
// ... other components

// Enhanced wrapper with built-in error boundaries
export function createSafeMotionComponent<T extends keyof React.JSX.IntrinsicElements>(
  element: T
) {
  return React.forwardRef<
    React.ElementRef<T>,
    HTMLMotionProps<T> & { fallback?: React.ReactNode }
  >(({ fallback, ...props }, ref) => {
    const MotionComponent = motion[element] as any;

    try {
      return <MotionComponent ref={ref} {...props} />;
    } catch (error) {
      console.error(`Motion error in ${element}:`, error);
      return fallback || props.children || null;
    }
  });
}
```

#### Strategy 2: Gradual Type Migration

**Phase 1: Create Type-Safe Infrastructure (Week 1)**
- Create `/src/lib/motion/` directory
- Implement type-safe wrapper functions
- Create preset animation library
- Write comprehensive tests

**Phase 2: Update MotionComponents.tsx (Week 1)**
- Replace `as any` assertions with proper types
- Add TypeScript generics for component props
- Maintain backward compatibility

**Phase 3: Migrate High-Impact Components (Week 2)**
Priority order:
1. `/src/app/page.tsx` (main entry point)
2. `/src/components/Onboarding/*` (known type errors)
3. `/src/components/ui/*` (shared components)
4. `/src/components/Performance/*`
5. Other components as time permits

**Phase 4: Update Tests (Week 2)**
- Update test utilities to use new types
- Add animation testing helpers

#### Implementation Checklist

```markdown
- [ ] Create `/src/lib/motion/types.ts`
- [ ] Create `/src/lib/motion/presets.ts`
- [ ] Create `/src/lib/motion/components.ts`
- [ ] Write unit tests for motion utilities
- [ ] Update `/src/components/ui/MotionComponents.tsx`
- [ ] Migrate Onboarding components (8 files)
- [ ] Migrate Performance components (5 files)
- [ ] Migrate ImageSearch components (4 files)
- [ ] Migrate UI components (7 files)
- [ ] Update documentation
- [ ] Run type checking: `npm run typecheck`
- [ ] Verify no runtime errors
```

### Quality Attributes

- **Type Safety**: 100% typed, no `as any` assertions
- **Performance**: No runtime overhead (compile-time only)
- **Maintainability**: Centralized animation presets
- **Developer Experience**: IntelliSense support for all animation properties
- **Backward Compatibility**: Existing components continue to work during migration

### Risk Mitigation

1. **Breaking Changes**: Use feature flags for gradual rollout
2. **Runtime Errors**: Add error boundaries around motion components
3. **Build Failures**: Implement incremental migration with fallbacks
4. **Performance**: Monitor animation performance with existing PerformanceMonitor

---

## 2. URL-based Routing Implementation Design

### Current State Analysis

**Routing System**: Next.js App Router (file-based)
- **Pages**: `/src/app/page.tsx`, `/dashboard`, `/auth`, `/admin`, `/api`
- **State Management**: Client-side only (Zustand stores)
- **URL Parameters**: Not utilized for app state
- **Deep Linking**: Not supported

**Limitations**:
- Cannot share specific app states via URL
- Browser back/forward doesn't work for app state
- No bookmarkable states
- SEO limitations for dynamic content

### Architectural Solution

#### Design Pattern: URL State Synchronization

**Core Principle**: Treat URL as single source of truth for shareable state

```
┌─────────────────┐
│   URL State     │ ← Single Source of Truth
│  (Query Params) │
└────────┬────────┘
         │
    ┌────▼─────┬──────────┬──────────┐
    │          │          │          │
┌───▼────┐ ┌──▼───┐ ┌────▼────┐ ┌───▼────┐
│ Search │ │ View │ │ Filters │ │ Modal  │
│ State  │ │ State│ │  State  │ │ State  │
└────────┘ └──────┘ └─────────┘ └────────┘
```

#### URL Structure Design

```
Base URL Pattern:
/{page}?{state-params}

Examples:
/                                           # Home (default view)
/?view=search&q=mountain&page=1             # Search state
/?view=description&image=abc123&style=narrativo
/?view=qa&topic=vocabulary&difficulty=intermediate
/?view=phrases&category=verbs&sort=frequency
/dashboard?tab=progress&range=7days         # Dashboard state
/dashboard?tab=vocabulary&filter=favorites
```

#### State Categories

**1. Shareable State (URL-persisted)**
- Current view/tab
- Search queries
- Selected image ID
- Description style
- Filter selections
- Pagination
- Sort order
- Modal states

**2. Local State (Not URL-persisted)**
- Form input (while typing)
- Hover states
- Temporary UI states
- Loading states
- Client-only preferences

#### Implementation Architecture

```typescript
// /src/lib/routing/types.ts
export type AppView = 'search' | 'description' | 'qa' | 'phrases' | 'vocabulary';
export type DescriptionStyle = 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface URLState {
  // View state
  view: AppView;

  // Search state
  q?: string;
  page?: number;

  // Content state
  imageId?: string;
  style?: DescriptionStyle;

  // QA state
  topic?: string;
  difficulty?: DifficultyLevel;

  // Filter state
  category?: string;
  sort?: string;
  filter?: string;
}

export interface RouteConfig {
  path: string;
  defaultState: Partial<URLState>;
  validParams: (keyof URLState)[];
}
```

```typescript
// /src/lib/routing/url-state-manager.ts
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export class URLStateManager {
  private router: ReturnType<typeof useRouter>;
  private pathname: string;
  private searchParams: URLSearchParams;

  constructor(router: any, pathname: string, searchParams: URLSearchParams) {
    this.router = router;
    this.pathname = pathname;
    this.searchParams = searchParams;
  }

  // Get current state from URL
  getState<T extends keyof URLState>(key: T): URLState[T] | undefined {
    const value = this.searchParams.get(key);
    if (!value) return undefined;

    // Type-safe parsing
    return this.parseValue(key, value) as URLState[T];
  }

  // Set state to URL (shallow merge)
  setState(updates: Partial<URLState>, options?: { replace?: boolean }) {
    const newParams = new URLSearchParams(this.searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, this.serializeValue(value));
      }
    });

    const url = `${this.pathname}?${newParams.toString()}`;

    if (options?.replace) {
      this.router.replace(url, { scroll: false });
    } else {
      this.router.push(url, { scroll: false });
    }
  }

  // Clear specific params
  clearState(keys: (keyof URLState)[]) {
    const updates = keys.reduce((acc, key) => {
      acc[key] = undefined;
      return acc;
    }, {} as Partial<URLState>);

    this.setState(updates, { replace: true });
  }

  // Get full state object
  getAllState(): Partial<URLState> {
    const state: Partial<URLState> = {};

    this.searchParams.forEach((value, key) => {
      state[key as keyof URLState] = this.parseValue(key, value) as any;
    });

    return state;
  }

  private parseValue(key: string, value: string): any {
    // Number types
    if (key === 'page') return parseInt(value, 10);

    // Boolean types
    // ... type parsing logic

    return value;
  }

  private serializeValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

// React hook
export function useURLState<T extends keyof URLState>(
  key: T,
  defaultValue?: URLState[T]
): [URLState[T] | undefined, (value: URLState[T] | undefined) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const manager = useMemo(
    () => new URLStateManager(router, pathname, searchParams),
    [router, pathname, searchParams]
  );

  const value = manager.getState(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: URLState[T] | undefined) => {
      manager.setState({ [key]: newValue } as Partial<URLState>);
    },
    [manager, key]
  );

  return [value, setValue];
}

// Batch updates
export function useURLStateManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => new URLStateManager(router, pathname, searchParams),
    [router, pathname, searchParams]
  );
}
```

#### Integration with Existing State Management

```typescript
// /src/lib/routing/sync-url-state.ts
import { useEffect } from 'react';
import { useURLState } from './url-state-manager';
import { useStore } from '@/lib/store';

// Sync Zustand store with URL
export function useSyncURLState() {
  const [urlView, setUrlView] = useURLState('view');
  const [urlQuery, setUrlQuery] = useURLState('q');
  const [urlImageId, setUrlImageId] = useURLState('imageId');

  const { activeTab, searchQuery, selectedImage } = useStore();

  // URL → Store (on mount/URL change)
  useEffect(() => {
    if (urlView && urlView !== activeTab) {
      useStore.setState({ activeTab: urlView });
    }
  }, [urlView]);

  useEffect(() => {
    if (urlQuery && urlQuery !== searchQuery) {
      useStore.setState({ searchQuery: urlQuery });
    }
  }, [urlQuery]);

  // Store → URL (on store change)
  useEffect(() => {
    if (activeTab !== urlView) {
      setUrlView(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery !== urlQuery) {
      setUrlQuery(searchQuery);
    }
  }, [searchQuery]);
}
```

#### Migration Strategy

**Phase 1: Infrastructure (Week 1)**
- Create URL state management utilities
- Add TypeScript types
- Write comprehensive tests
- Document URL schema

**Phase 2: Integrate Main Views (Week 2)**
- Add URL state to search view
- Add URL state to description view
- Add URL state to QA view
- Add URL state to phrases view

**Phase 3: Dashboard Integration (Week 3)**
- Add URL state to dashboard tabs
- Add URL state to filters
- Add URL state to date ranges

**Phase 4: Testing & Refinement (Week 3-4)**
- E2E tests for deep linking
- Test browser back/forward
- Test URL sharing
- Performance optimization

#### Quality Attributes

- **Shareability**: All major app states can be shared via URL
- **SEO**: Dynamic content accessible to crawlers
- **UX**: Browser back/forward works correctly
- **Performance**: No unnecessary re-renders
- **Type Safety**: Fully typed URL state

### Dashboard Integration Requirements

This URL routing system enables:
1. Direct links to dashboard tabs: `/dashboard?tab=progress`
2. Filtered views: `/dashboard?tab=vocabulary&filter=favorites&sort=recent`
3. Date range persistence: `/dashboard?tab=analytics&range=30days`
4. Deep linking to specific items: `/dashboard?tab=history&session=abc123`

---

## 3. Dashboard Integration Architecture

### Current State Analysis

**Dashboard Status**: Minimal implementation
- **Location**: `/src/app/dashboard/page.tsx`
- **Current Code**: 10-line placeholder
- **Available Components**: 15+ dashboard-related components exist but not integrated

**Existing Dashboard Components**:
```
/src/components/Dashboard/
  ├── DashboardLayout.tsx (test exists)
  ├── LearningProgress.tsx (523 lines, test exists)
  ├── RecentActivity.tsx (553 lines, test exists)
  ├── StatsCards.tsx (test exists)
  ├── ApiKeysManager.tsx (631 lines)
  └── UserStats.tsx (626 lines)

/src/components/Performance/
  └── PerformanceDashboard.tsx (582 lines)

/src/components/ProgressTracking/
  ├── EnhancedProgressDashboard.tsx (579 lines)
  └── ProgressDashboard.tsx

/src/components/analytics/
  └── UsageDashboard.tsx

/src/components/Monitoring/
  └── ErrorDashboard.tsx (647 lines)
```

**Data Sources**:
- Progress tracking (Supabase)
- Vocabulary stats (localStorage + Supabase)
- Session logs (sessionLogger.ts)
- Analytics (web-vitals, custom events)
- Performance metrics (PerformanceMonitor)

### Architectural Solution

#### Dashboard Architecture Pattern: Modular Widget System

```
┌──────────────────────────────────────────────────────┐
│                  Dashboard Shell                      │
│  ┌────────────────────────────────────────────────┐  │
│  │          Navigation (Tab/Breadcrumb)            │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Widget    │  │    Widget    │  │   Widget   │  │
│  │  Container  │  │   Container  │  │  Container │  │
│  │  ┌────────┐ │  │  ┌─────────┐ │  │ ┌────────┐ │  │
│  │  │Progress│ │  │  │Analytics│ │  │ │Settings│ │  │
│  │  │  View  │ │  │  │   View  │ │  │ │  View  │ │  │
│  │  └────────┘ │  │  └─────────┘ │  │ └────────┘ │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │           Data Layer (React Query)            │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

#### Component Architecture

```typescript
// /src/app/dashboard/layout.tsx
import { DashboardShell } from '@/components/Dashboard/DashboardShell';
import { DashboardNav } from '@/components/Dashboard/DashboardNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <DashboardNav />
      {children}
    </DashboardShell>
  );
}
```

```typescript
// /src/app/dashboard/page.tsx
'use client';

import { useURLState } from '@/lib/routing/url-state-manager';
import { ProgressView } from '@/components/Dashboard/views/ProgressView';
import { AnalyticsView } from '@/components/Dashboard/views/AnalyticsView';
import { VocabularyView } from '@/components/Dashboard/views/VocabularyView';
import { SettingsView } from '@/components/Dashboard/views/SettingsView';
import { HistoryView } from '@/components/Dashboard/views/HistoryView';
import { PerformanceView } from '@/components/Dashboard/views/PerformanceView';

type DashboardTab = 'overview' | 'progress' | 'vocabulary' | 'analytics' | 'history' | 'performance' | 'settings';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useURLState('tab', 'overview');

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'progress':
        return <ProgressView />;
      case 'vocabulary':
        return <VocabularyView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'history':
        return <HistoryView />;
      case 'performance':
        return <PerformanceView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="dashboard-container">
      <DashboardTabs
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="dashboard-content">
        {renderView()}
      </div>
    </div>
  );
}
```

#### View Component Structure

```typescript
// /src/components/Dashboard/views/ProgressView.tsx
import { LearningProgress } from '../LearningProgress';
import { RecentActivity } from '../RecentActivity';
import { StatsCards } from '../StatsCards';
import { WidgetGrid } from '../WidgetGrid';

export function ProgressView() {
  const [dateRange] = useURLState('range', '7days');
  const [filter] = useURLState('filter');

  return (
    <WidgetGrid>
      <StatsCards range={dateRange} />
      <LearningProgress range={dateRange} filter={filter} />
      <RecentActivity limit={10} />
    </WidgetGrid>
  );
}
```

```typescript
// /src/components/Dashboard/views/OverviewView.tsx
import { StatsCards } from '../StatsCards';
import { QuickActions } from '../QuickActions';
import { RecentActivity } from '../RecentActivity';
import { ProgressSummary } from '../ProgressSummary';
import { VocabularyHighlights } from '../VocabularyHighlights';

export function OverviewView() {
  return (
    <WidgetGrid layout="masonry">
      <StatsCards variant="compact" range="today" />
      <QuickActions />
      <ProgressSummary range="7days" />
      <VocabularyHighlights limit={5} />
      <RecentActivity limit={5} />
    </WidgetGrid>
  );
}
```

#### Widget System Architecture

```typescript
// /src/components/Dashboard/Widget.tsx
import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface WidgetProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: Error;
  children: ReactNode;
  className?: string;
}

export function Widget({
  title,
  description,
  actions,
  loading,
  error,
  children,
  className,
}: WidgetProps) {
  return (
    <Card className={`dashboard-widget ${className}`}>
      <div className="widget-header">
        <div>
          <h3>{title}</h3>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        {actions && <div className="widget-actions">{actions}</div>}
      </div>

      <div className="widget-content">
        <ErrorBoundary fallback={<WidgetError error={error} />}>
          {loading ? <WidgetSkeleton /> : children}
        </ErrorBoundary>
      </div>
    </Card>
  );
}
```

#### Data Integration Layer

```typescript
// /src/lib/queries/dashboard-queries.ts
import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/lib/services/database';

export function useDashboardStats(userId: string, range: string) {
  return useQuery({
    queryKey: ['dashboard', 'stats', userId, range],
    queryFn: async () => {
      const [progress, vocabulary, sessions] = await Promise.all([
        databaseService.getUserProgress(userId, range),
        databaseService.getVocabularyStats(userId),
        databaseService.getRecentSessions(userId, 10),
      ]);

      return {
        progress,
        vocabulary,
        sessions,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVocabularyStats(userId: string) {
  return useQuery({
    queryKey: ['vocabulary', 'stats', userId],
    queryFn: () => databaseService.getVocabularyStats(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRecentActivity(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['activity', 'recent', userId, limit],
    queryFn: () => databaseService.getRecentActivity(userId, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

#### Dashboard Tabs Configuration

```typescript
// /src/components/Dashboard/dashboard-config.ts
export const DASHBOARD_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    description: 'Quick summary of your learning progress',
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: 'TrendingUp',
    description: 'Detailed learning progress and statistics',
  },
  {
    id: 'vocabulary',
    label: 'Vocabulary',
    icon: 'BookOpen',
    description: 'Your saved vocabulary and word lists',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart3',
    description: 'Usage analytics and insights',
  },
  {
    id: 'history',
    label: 'History',
    icon: 'Clock',
    description: 'Session history and activity log',
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'Gauge',
    description: 'App performance metrics',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    description: 'Account and app settings',
  },
] as const;
```

#### Implementation Roadmap

**Week 1: Foundation**
- [ ] Create `/src/app/dashboard/layout.tsx`
- [ ] Create `DashboardShell` component
- [ ] Create `DashboardNav` component with tabs
- [ ] Set up URL state integration
- [ ] Create widget system components

**Week 2: Overview & Progress Views**
- [ ] Build `OverviewView` with existing components
- [ ] Build `ProgressView` integrating LearningProgress
- [ ] Integrate RecentActivity component
- [ ] Integrate StatsCards component
- [ ] Create data queries for views

**Week 3: Specialized Views**
- [ ] Build `VocabularyView`
- [ ] Build `AnalyticsView` with UsageDashboard
- [ ] Build `HistoryView`
- [ ] Build `PerformanceView` with PerformanceDashboard

**Week 4: Settings & Polish**
- [ ] Build `SettingsView` integrating EnhancedSettingsPanel
- [ ] Add loading states
- [ ] Add error handling
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] E2E tests

#### Quality Attributes

- **Modularity**: Each view is self-contained and reusable
- **Performance**: Lazy loading, code splitting per view
- **Data Freshness**: React Query with appropriate stale times
- **URL State**: Deep linking to any dashboard view/filter
- **Error Resilience**: Error boundaries per widget
- **Responsive**: Mobile-first design
- **Accessibility**: WCAG 2.1 AA compliant

### Integration Points

**With URL Routing**:
- Tab state in URL: `/dashboard?tab=progress`
- Filter state: `/dashboard?tab=vocabulary&filter=favorites`
- Date ranges: `/dashboard?tab=analytics&range=30days`

**With Existing Components**:
- `LearningProgress.tsx` → ProgressView
- `RecentActivity.tsx` → Multiple views
- `StatsCards.tsx` → OverviewView, ProgressView
- `UsageDashboard.tsx` → AnalyticsView
- `PerformanceDashboard.tsx` → PerformanceView
- `EnhancedSettingsPanel.tsx` → SettingsView
- `ApiKeysManager.tsx` → SettingsView
- `UserStats.tsx` → OverviewView

**With Data Layer**:
- Supabase for persistent data
- React Query for data fetching/caching
- Zustand for UI state
- URL for shareable state

---

## Implementation Priority Matrix

| Task | Impact | Effort | Priority | Timeline |
|------|--------|--------|----------|----------|
| Framer Motion Type Fix | High | Medium | 1 | Week 1-2 |
| URL Routing Infrastructure | High | High | 2 | Week 1-2 |
| Dashboard Shell & Navigation | High | Medium | 3 | Week 2 |
| Dashboard Overview View | High | Low | 4 | Week 2 |
| Dashboard Progress View | High | Medium | 5 | Week 2-3 |
| Dashboard Other Views | Medium | Medium | 6 | Week 3-4 |

---

## Success Criteria

### Framer Motion
- ✅ Zero TypeScript errors related to framer-motion
- ✅ No runtime animation errors
- ✅ All 44 files properly typed
- ✅ Maintainable preset library created

### URL Routing
- ✅ All major views support deep linking
- ✅ Browser back/forward works correctly
- ✅ URLs are shareable and bookmarkable
- ✅ SEO-friendly URLs

### Dashboard
- ✅ All 7 dashboard views functional
- ✅ All existing dashboard components integrated
- ✅ Data loads efficiently (<2s initial load)
- ✅ Mobile responsive
- ✅ URL state integration complete

---

## Technical Debt & Risks

### Identified Risks

1. **Framer Motion Breaking Changes**
   - Risk: Future framer-motion updates may break types again
   - Mitigation: Wrapper library isolates changes, version pinning

2. **URL State Conflicts**
   - Risk: URL params conflict with Next.js routing
   - Mitigation: Namespaced query params, tested route patterns

3. **Dashboard Performance**
   - Risk: Too many components may slow initial load
   - Mitigation: Code splitting, lazy loading, React Query caching

4. **State Synchronization Bugs**
   - Risk: URL state and store state get out of sync
   - Mitigation: Single direction data flow, comprehensive tests

### Migration Risks

- Existing components may have hardcoded state assumptions
- Users with bookmarked URLs will need migration path
- Test suite needs updates for new URL patterns

---

## Next Steps

1. **Review & Approval**: Architecture team review this document
2. **Spike Tasks**: Create POC for each major component
3. **Detailed Planning**: Break down into sprint-sized tasks
4. **Implementation**: Follow phased rollout plan
5. **Testing**: Comprehensive test coverage before production
6. **Documentation**: Update developer and user documentation

---

## Appendices

### A. Related Documents
- `/docs/reports/PRODUCTION_BLOCKERS.md`
- `/docs/architecture/STATE_MANAGEMENT.md`
- `/docs/development/DEVELOPMENT_ROADMAP.md`

### B. Component Inventory
- See detailed component analysis in Phase 3 plan
- Dashboard component matrix in `/docs/architecture/component-matrix.md`

### C. Performance Benchmarks
- Target: Dashboard initial load <2s
- Target: View switching <300ms
- Target: Widget render <100ms

---

**Document Status**: ✅ Complete
**Review Required**: Architecture Team, Tech Lead
**Next Review**: After Phase 2 implementation
