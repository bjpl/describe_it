# Architecture Documentation

This document provides a comprehensive overview of the Describe It application architecture, including system design, component organization, data flow, and integration patterns.

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Architecture Patterns](#architecture-patterns)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [API Architecture](#api-architecture)
- [Database Design](#database-design)
- [External Integrations](#external-integrations)
- [Security Architecture](#security-architecture)
- [Performance Architecture](#performance-architecture)
- [Deployment Architecture](#deployment-architecture)

## 🏗️ System Overview

Describe It is a modern, scalable Spanish learning platform built with a microservices-oriented architecture using Next.js, Supabase, and various AI services.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │ Mobile PWA  │  │    Admin Panel      │ │
│  │  (Next.js)  │  │ (Next.js)   │  │    (Next.js)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Next.js API Routes                         │ │
│  │  • Authentication    • Rate Limiting    • CORS         │ │
│  │  • Input Validation  • Error Handling  • Monitoring   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
          ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
          │   AI Core   │ │ Data Core   │ │Media Core   │
          │             │ │             │ │             │
          │ • OpenAI    │ │ • Supabase  │ │ • Unsplash  │
          │ • GPT-4     │ │ • PostgreSQL│ │ • Vercel    │
          │ • Fallback  │ │ • Real-time │ │   Blob      │
          │   System    │ │ • Auth      │ │ • CDN       │
          └─────────────┘ └─────────────┘ └─────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Infrastructure      │
                    │                       │
                    │ • Vercel (Hosting)    │
                    │ • Vercel KV (Cache)   │
                    │ • Sentry (Monitoring) │
                    │ • GitHub (CI/CD)      │
                    └───────────────────────┘
```

## 🎯 Architecture Patterns

### 1. Layered Architecture

The application follows a clean layered architecture:

```
┌─────────────────────────────────────────┐
│              Presentation Layer          │
│  • React Components                     │
│  • Hooks                                │  
│  • State Management (Zustand)          │
│  • UI Components (Radix UI)            │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│                API Layer                │
│  • Next.js API Routes                  │
│  • Request Validation (Zod)            │
│  • Response Formatting                 │
│  • Error Handling                      │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│              Business Logic             │
│  • Service Layer                       │
│  • Domain Logic                        │
│  • AI Integration                      │
│  • Data Processing                     │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│               Data Layer                │
│  • Database Access (Supabase)          │
│  • Caching (Vercel KV)                 │
│  • External APIs                       │
│  • File Storage                        │
└─────────────────────────────────────────┘
```

### 2. Microservices Pattern

Services are organized by domain:

```typescript
// Service organization
src/lib/
├── api/                    # External API integrations
│   ├── openai/            # AI content generation
│   ├── supabase/          # Database and auth
│   ├── unsplash/          # Image search
│   └── cache/             # Caching layer
├── services/              # Business logic services
│   ├── descriptionService.ts
│   ├── sessionService.ts
│   ├── vocabularyService.ts
│   └── exportService.ts
├── database/              # Data access layer
│   ├── models/
│   ├── queries/
│   └── migrations/
└── utils/                 # Shared utilities
```

### 3. Event-Driven Architecture

Real-time updates using pub/sub patterns:

```typescript
// Event system
interface ApplicationEvent {
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
}

// Event types
type EventType = 
  | 'description:generated'
  | 'question:answered'
  | 'vocabulary:extracted'
  | 'session:started'
  | 'session:completed'
  | 'user:progress_updated';

// Event handlers
class EventBus {
  private subscribers: Map<string, Function[]> = new Map();
  
  subscribe(event: EventType, handler: Function) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(handler);
  }
  
  publish(event: EventType, payload: any) {
    const handlers = this.subscribers.get(event) || [];
    handlers.forEach(handler => handler(payload));
  }
}
```

## 🧩 Component Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   ├── Navigation
│   │   ├── UserMenu
│   │   └── ThemeToggle
│   ├── Sidebar
│   │   ├── SessionsList
│   │   └── RecentSearches
│   └── Footer
├── Pages
│   ├── HomePage
│   │   ├── ImageSearch
│   │   │   ├── SearchInput
│   │   │   ├── FilterPanel
│   │   │   └── ImageGrid
│   │   │       └── ImageCard
│   │   ├── ImageViewer
│   │   │   ├── ImageDisplay
│   │   │   └── ImageMetadata
│   │   └── ContentGeneration
│   │       ├── DescriptionTabs
│   │       │   └── DescriptionPanel
│   │       ├── QuestionAnswerPanel
│   │       │   ├── QuestionCard
│   │       │   └── ProgressIndicator
│   │       └── PhraseExtractor
│   │           └── VocabularyList
│   └── SessionPage
│       ├── SessionHeader
│       ├── SessionProgress
│       └── SessionContent
└── Modals
    ├── ExportModal
    ├── SettingsModal
    └── ConfirmationModal
```

### Component Design Patterns

#### 1. Container/Presenter Pattern

```typescript
// Container Component (Logic)
function ImageSearchContainer() {
  const { searchImages, isLoading, results, error } = useImageSearch();
  const [filters, setFilters] = useState<SearchFilters>({});
  
  const handleSearch = useCallback((query: string) => {
    searchImages({ query, ...filters });
  }, [searchImages, filters]);
  
  return (
    <ImageSearchPresenter
      onSearch={handleSearch}
      isLoading={isLoading}
      results={results}
      error={error}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}

// Presenter Component (UI)
interface ImageSearchPresenterProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  results: ImageResult[];
  error: string | null;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

function ImageSearchPresenter({ 
  onSearch, 
  isLoading, 
  results, 
  error, 
  filters, 
  onFiltersChange 
}: ImageSearchPresenterProps) {
  return (
    <div className="image-search">
      <SearchInput onSearch={onSearch} />
      <FilterPanel filters={filters} onChange={onFiltersChange} />
      {error && <ErrorMessage error={error} />}
      {isLoading ? <LoadingSpinner /> : <ImageGrid images={results} />}
    </div>
  );
}
```

#### 2. Compound Components

```typescript
// Compound component pattern for flexible composition
function DescriptionTabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <DescriptionTabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="description-tabs">
        {children}
      </div>
    </DescriptionTabsContext.Provider>
  );
}

DescriptionTabs.List = function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list" role="tablist">{children}</div>;
};

DescriptionTabs.Tab = function Tab({ index, children }: { index: number; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useDescriptionTabs();
  
  return (
    <button
      role="tab"
      aria-selected={activeTab === index}
      onClick={() => setActiveTab(index)}
      className={cn('tab', activeTab === index && 'active')}
    >
      {children}
    </button>
  );
};

DescriptionTabs.Panel = function TabPanel({ index, children }: { index: number; children: React.ReactNode }) {
  const { activeTab } = useDescriptionTabs();
  
  if (activeTab !== index) return null;
  
  return <div role="tabpanel" className="tab-panel">{children}</div>;
};

// Usage
<DescriptionTabs>
  <DescriptionTabs.List>
    <DescriptionTabs.Tab index={0}>Narrativo</DescriptionTabs.Tab>
    <DescriptionTabs.Tab index={1}>Poético</DescriptionTabs.Tab>
    <DescriptionTabs.Tab index={2}>Académico</DescriptionTabs.Tab>
  </DescriptionTabs.List>
  
  <DescriptionTabs.Panel index={0}>
    <NarrativeDescription />
  </DescriptionTabs.Panel>
  <DescriptionTabs.Panel index={1}>
    <PoeticDescription />
  </DescriptionTabs.Panel>
  <DescriptionTabs.Panel index={2}>
    <AcademicDescription />
  </DescriptionTabs.Panel>
</DescriptionTabs>
```

#### 3. Render Props Pattern

```typescript
// Flexible data fetching with render props
interface DataFetcherProps<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  children: (data: {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

function DataFetcher<T>({ queryKey, queryFn, children }: DataFetcherProps<T>) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
  });
  
  return <>{children({ data, isLoading, error, refetch })}</>;
}

// Usage
<DataFetcher
  queryKey={['descriptions', sessionId]}
  queryFn={() => fetchDescriptions(sessionId)}
>
  {({ data, isLoading, error }) => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error.message} />;
    if (!data) return <EmptyState />;
    
    return <DescriptionList descriptions={data} />;
  }}
</DataFetcher>
```

## 🌊 Data Flow

### Request/Response Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │  Next.js    │    │   Service   │    │  External   │
│ Component   │    │ API Route   │    │    Layer    │    │     API     │
│             │    │             │    │             │    │             │
│ 1. Action   │───▶│ 2. Validate │───▶│ 3. Process  │───▶│ 4. Execute  │
│             │    │    Request  │    │   Business  │    │   External  │
│             │    │             │    │    Logic    │    │    Call     │
│             │    │             │    │             │    │             │
│ 8. Update   │◀───│ 7. Format   │◀───│ 6. Process  │◀───│ 5. Return   │
│    UI       │    │  Response   │    │  Response   │    │   Result    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### State Update Flow

```typescript
// 1. User Action
const handleGenerateDescription = async (imageUrl: string, style: string) => {
  // 2. Optimistic UI Update
  setIsGenerating(true);
  
  try {
    // 3. API Call
    const response = await generateDescription({ imageUrl, style });
    
    // 4. Success - Update Local State
    addDescription(response.data);
    
    // 5. Invalidate Cache
    queryClient.invalidateQueries(['descriptions']);
    
    // 6. Real-time Sync (if applicable)
    broadcastUpdate('description:generated', response.data);
    
  } catch (error) {
    // 4. Error - Revert Optimistic Update
    setError(error.message);
  } finally {
    // 5. Reset Loading State
    setIsGenerating(false);
  }
};
```

### Real-time Data Synchronization

```typescript
// Supabase real-time integration
export function useRealtimeDescriptions(sessionId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!sessionId) return;
    
    const channel = supabase
      .channel(`descriptions_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'descriptions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        // Update local cache with new data
        queryClient.setQueryData(
          ['descriptions', sessionId],
          (old: Description[]) => [...(old || []), payload.new as Description]
        );
        
        // Notify UI components
        toast.success('Nueva descripción generada');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'descriptions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        // Update existing item in cache
        queryClient.setQueryData(
          ['descriptions', sessionId],
          (old: Description[]) => 
            old?.map(desc => 
              desc.id === payload.new.id ? payload.new as Description : desc
            ) || []
        );
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);
}
```

## 🔌 API Architecture

### RESTful API Design

```
GET    /api/health                      # Health check
GET    /api/status                      # Service status

# Descriptions
POST   /api/descriptions/generate       # Generate descriptions
GET    /api/descriptions               # List descriptions
GET    /api/descriptions/:id           # Get specific description
PUT    /api/descriptions/:id           # Update description
DELETE /api/descriptions/:id           # Delete description

# Q&A
POST   /api/qa/generate                # Generate Q&A pairs
GET    /api/qa                         # List Q&A pairs
POST   /api/qa/:id/answer              # Submit answer

# Vocabulary
POST   /api/phrases/extract            # Extract vocabulary
GET    /api/phrases                    # List vocabulary
POST   /api/phrases/:id/practice       # Practice vocabulary

# Sessions
GET    /api/sessions                   # List sessions
POST   /api/sessions                   # Create session
GET    /api/sessions/:id               # Get session
PUT    /api/sessions/:id               # Update session
DELETE /api/sessions/:id               # Delete session

# Users
GET    /api/users/profile              # Get profile
PUT    /api/users/profile              # Update profile
GET    /api/users/progress             # Get progress

# Export
POST   /api/export/generate            # Generate export
GET    /api/export/:id                 # Download export

# Images
GET    /api/images/search              # Search images

# Utility
POST   /api/translate                  # Translate text
GET    /api/cache/status               # Cache status
```

### API Route Structure

```typescript
// Standard API route structure
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // 1. Authentication (if required)
    const user = await validateAuth(request);
    
    // 2. Rate limiting
    await checkRateLimit(request);
    
    // 3. Input validation
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    // 4. Business logic
    const result = await serviceLayer.processRequest(validatedData, user);
    
    // 5. Response formatting
    const responseTime = performance.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      }
    }, {
      status: 200,
      headers: {
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'Cache-Control': 'public, max-age=300',
      }
    });
    
  } catch (error) {
    // 6. Error handling
    return handleApiError(error, request);
  }
}
```

### Middleware Stack

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rateLimit';
import { validateAuth } from './lib/auth';
import { corsHeaders } from './lib/cors';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 1. CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // 2. Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 3. API route middleware
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Rate limiting
    try {
      await rateLimit(request);
    } catch (error) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // Authentication for protected routes
    if (isProtectedRoute(request.nextUrl.pathname)) {
      const user = await validateAuth(request);
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Add user to request headers
      response.headers.set('x-user-id', user.id);
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## 🗄️ Database Design

### Entity Relationship Model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Users    │     │  Sessions   │     │ Descriptions│
│             │     │             │     │             │
│ • id (PK)   │────▶│ • id (PK)   │────▶│ • id (PK)   │
│ • email     │     │ • user_id   │     │ • session_id│
│ • profile   │     │ • title     │     │ • image_id  │
│ • prefs     │     │ • progress  │     │ • content   │
└─────────────┘     │ • status    │     │ • language  │
                    └─────────────┘     │ • style     │
                           │            └─────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Questions  │     │   Phrases   │
                    │             │     │             │
                    │ • id (PK)   │     │ • id (PK)   │
                    │ • session_id│     │ • session_id│
                    │ • desc_id   │     │ • desc_id   │
                    │ • question  │     │ • text      │
                    │ • answer    │     │ • translation│
                    │ • difficulty│     │ • category  │
                    └─────────────┘     └─────────────┘
```

### Database Access Patterns

```typescript
// Repository pattern for data access
abstract class BaseRepository<T> {
  constructor(protected tableName: string) {}
  
  async findById(id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  }
  
  async findMany(filters: Record<string, any> = {}): Promise<T[]> {
    let query = supabase.from(this.tableName).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
  
  async create(data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([data])
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return result;
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return result;
  }
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(error.message);
  }
}

// Specific repositories
class DescriptionRepository extends BaseRepository<Description> {
  constructor() {
    super('descriptions');
  }
  
  async findBySession(sessionId: string): Promise<Description[]> {
    return this.findMany({ session_id: sessionId });
  }
  
  async findByLanguageAndStyle(language: string, style: string): Promise<Description[]> {
    return this.findMany({ language, style });
  }
}
```

## 🔐 Security Architecture

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │  Next.js    │    │  Supabase   │    │  OAuth      │
│             │    │             │    │    Auth     │    │ Provider    │
│ 1. Login    │───▶│ 2. Redirect │───▶│ 3. Validate │───▶│ 4. Verify   │
│   Request   │    │   to Auth   │    │   Request   │    │   Identity  │
│             │    │             │    │             │    │             │
│ 8. Access   │◀───│ 7. Set      │◀───│ 6. Issue    │◀───│ 5. Return   │
│   Granted   │    │   Session   │    │    JWT      │    │   Token     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Authorization Model

```typescript
// Role-based access control
enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

interface Permission {
  resource: string;
  action: string;
}

class AuthorizationService {
  private rolePermissions: Map<Role, Permission[]> = new Map([
    [Role.USER, [
      { resource: 'session', action: 'create' },
      { resource: 'session', action: 'read:own' },
      { resource: 'session', action: 'update:own' },
      { resource: 'session', action: 'delete:own' },
      { resource: 'description', action: 'create' },
      { resource: 'description', action: 'read:own' },
    ]],
    [Role.MODERATOR, [
      ...this.rolePermissions.get(Role.USER)!,
      { resource: 'description', action: 'read:all' },
      { resource: 'description', action: 'moderate' },
    ]],
    [Role.ADMIN, [
      { resource: '*', action: '*' },
    ]],
  ]);
  
  hasPermission(user: User, resource: string, action: string): boolean {
    const permissions = this.rolePermissions.get(user.role) || [];
    
    return permissions.some(permission => 
      (permission.resource === '*' || permission.resource === resource) &&
      (permission.action === '*' || permission.action === action)
    );
  }
}
```

## ⚡ Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Caching Layers                         │
├─────────────────────────────────────────────────────────────┤
│  1. Browser Cache (Static Assets)                          │
│     • Images: 1 year                                       │
│     • JS/CSS: 1 year with hash                            │
│     • HTML: No cache                                       │
├─────────────────────────────────────────────────────────────┤
│  2. CDN Cache (Vercel Edge)                               │
│     • API responses: 5 minutes                             │
│     • Public assets: 1 year                               │
│     • Dynamic content: No cache                            │
├─────────────────────────────────────────────────────────────┤
│  3. Application Cache (React Query)                        │
│     • API responses: 5-60 minutes                          │
│     • Background refetch                                   │
│     • Optimistic updates                                   │
├─────────────────────────────────────────────────────────────┤
│  4. Redis Cache (Vercel KV)                               │
│     • Session data: 24 hours                              │
│     • AI responses: 1 hour                                │
│     • Rate limiting: 1 minute                             │
├─────────────────────────────────────────────────────────────┤
│  5. Database Cache (Supabase)                             │
│     • Query results: Variable                              │
│     • Connection pooling                                   │
│     • Read replicas                                        │
└─────────────────────────────────────────────────────────────┘
```

### Performance Monitoring

```typescript
// Core Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  constructor() {
    this.initWebVitals();
    this.initCustomMetrics();
  }
  
  private initWebVitals() {
    getCLS(this.sendToAnalytics);
    getFID(this.sendToAnalytics);
    getFCP(this.sendToAnalytics);
    getLCP(this.sendToAnalytics);
    getTTFB(this.sendToAnalytics);
  }
  
  private sendToAnalytics = (metric: any) => {
    // Send to multiple analytics services
    this.sendToVercel(metric);
    this.sendToSentry(metric);
    this.sendToCustomAnalytics(metric);
  };
  
  trackAPICall(endpoint: string, duration: number, success: boolean) {
    const metric = {
      name: 'api_call',
      endpoint,
      duration,
      success,
      timestamp: Date.now(),
    };
    
    this.sendToAnalytics(metric);
  }
  
  trackComponentRender(component: string, duration: number) {
    const metric = {
      name: 'component_render',
      component,
      duration,
      timestamp: Date.now(),
    };
    
    this.sendToAnalytics(metric);
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## 🚀 Deployment Architecture

### Vercel Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Build application
        run: npm run build

  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          github-token: ${{ secrets.GITHUB_TOKEN }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Environment Configuration

```typescript
// Environment-specific configurations
const environments = {
  development: {
    api: {
      openai: {
        timeout: 30000,
        retries: 1,
      },
      supabase: {
        timeout: 10000,
      },
    },
    cache: {
      ttl: 60, // 1 minute
    },
    logging: {
      level: 'debug',
    },
  },
  
  production: {
    api: {
      openai: {
        timeout: 60000,
        retries: 3,
      },
      supabase: {
        timeout: 30000,
      },
    },
    cache: {
      ttl: 3600, // 1 hour
    },
    logging: {
      level: 'error',
    },
  },
} as const;

export const config = environments[process.env.NODE_ENV as keyof typeof environments] || environments.development;
```

This comprehensive architecture documentation provides a complete overview of the Describe It application's system design, from high-level patterns to implementation details. The architecture is designed to be scalable, maintainable, and performant while supporting the complex requirements of an AI-powered language learning platform.