# Layered Architecture Guide

## Overview

The describe-it application now uses a clean layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (React Components, Pages, UI)          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Service Layer                   │
│  (Business Logic, Use Cases)            │
│  - UserService                          │
│  - SessionService                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Repository Layer                │
│  (Data Access, Database Operations)     │
│  - UserRepository                       │
│  - SessionRepository                    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Infrastructure Layer            │
│  (External Dependencies, DB, APIs)      │
│  - Supabase Client                      │
│  - External Services                    │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── core/                       # Core domain layer
│   ├── types/                 # Domain type definitions
│   │   └── index.ts
│   ├── errors/                # Custom error classes
│   │   └── index.ts
│   ├── repositories/          # Data access layer
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   ├── session.repository.ts
│   │   └── index.ts
│   ├── services/              # Business logic layer
│   │   ├── user.service.ts
│   │   ├── session.service.ts
│   │   └── index.ts
│   └── index.ts
├── infrastructure/            # External dependencies
│   ├── database.ts           # Repository instances
│   ├── services.ts           # Service instances
│   └── index.ts
└── lib/
    └── stores/               # State management
        └── useAuthStore.ts   # Event-driven auth store
```

## Core Components

### 1. Base Repository (`src/core/repositories/base.repository.ts`)

Generic repository pattern providing CRUD operations for all entities:

```typescript
export abstract class BaseRepository<T extends BaseEntity> {
  async findById(id: string): Promise<T | null>
  async findAll(options?: RepositoryOptions): Promise<T[]>
  async create(data: Omit<T, keyof BaseEntity>): Promise<T>
  async update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T>
  async delete(id: string): Promise<void>
  async count(filter?: Record<string, any>): Promise<number>
  async exists(id: string): Promise<boolean>
}
```

### 2. Error Classes (`src/core/errors/index.ts`)

Standardized error handling:

- `AppError` - Base error class
- `ValidationError` - Invalid input data (400)
- `NotFoundError` - Resource not found (404)
- `DatabaseError` - Database operation failed (500)
- `AuthenticationError` - Not authenticated (401)
- `AuthorizationError` - Insufficient permissions (403)
- `ConflictError` - Resource conflict (409)
- `RateLimitError` - Too many requests (429)
- `ExternalServiceError` - Third-party service error (503)

### 3. Service Layer

Business logic with standardized result pattern:

```typescript
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
```

### 4. Auth Store (`src/lib/stores/useAuthStore.ts`)

Event-driven authentication using Supabase's `onAuthStateChange`:

```typescript
const useAuthStore = create<AuthState>({
  user: User | null,
  session: Session | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null,

  // Actions
  signIn: (email, password) => Promise<void>,
  signUp: (email, password) => Promise<void>,
  signOut: () => Promise<void>,
  refreshSession: () => Promise<void>,
  initialize: () => void
})
```

## Usage Examples

### Using the UserService

```typescript
import { userService } from '@/infrastructure/services';

// Get a user
const result = await userService.getUser(userId);
if (result.success) {
  console.log('User:', result.data);
} else {
  console.error('Error:', result.error);
}

// Update user
const updateResult = await userService.updateUser(userId, {
  full_name: 'John Doe',
  learning_level: 'intermediate'
});

// Award points
await userService.awardPoints(userId, 100);

// Update streak
await userService.updateStreak(userId);
```

### Using the SessionService

```typescript
import { sessionService } from '@/infrastructure/services';

// Create a session
const sessionResult = await sessionService.createSession(userId, {
  session_type: 'practice',
  started_at: new Date().toISOString()
});

// Complete a session
await sessionService.completeSession(sessionId, {
  score: 95,
  accuracy: 0.95,
  time_spent: 300
});

// Get user sessions
const sessionsResult = await sessionService.getUserSessions(userId, 10);
```

### Using the Auth Store

```typescript
import { useAuthStore } from '@/lib/stores/useAuthStore';

function MyComponent() {
  const { user, isAuthenticated, signIn, signOut, initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth listener
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      // User state will update automatically via event listener
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={signOut}>Sign Out</button>
      ) : (
        <button onClick={handleSignIn}>Sign In</button>
      )}
    </div>
  );
}
```

### Direct Repository Usage (when needed)

```typescript
import { userRepository, sessionRepository } from '@/infrastructure/database';

// Direct database access (use sparingly)
const user = await userRepository.findByEmail('user@example.com');
const sessions = await sessionRepository.findActiveByUser(userId);
```

## Best Practices

### 1. Use Services, Not Repositories Directly

**Good:**
```typescript
import { userService } from '@/infrastructure/services';
const result = await userService.getUser(userId);
```

**Avoid:**
```typescript
import { userRepository } from '@/infrastructure/database';
const user = await userRepository.findById(userId);
```

### 2. Handle Service Results Properly

```typescript
const result = await userService.getUser(userId);

if (!result.success) {
  // Handle error
  toast.error(result.error);
  return;
}

// Use data safely
const user = result.data;
```

### 3. Use Custom Error Classes

```typescript
import { ValidationError, NotFoundError } from '@/core/errors';

if (!email.includes('@')) {
  throw new ValidationError('Invalid email format');
}

const user = await repository.findById(id);
if (!user) {
  throw new NotFoundError('User', id);
}
```

### 4. Initialize Auth Store Once

```typescript
// In _app.tsx or root layout
useEffect(() => {
  const cleanup = useAuthStore.getState().initialize();
  return cleanup;
}, []);
```

## Migration Guide

### From Legacy DatabaseService to New Architecture

**Before:**
```typescript
import DatabaseService from '@/lib/supabase';

const user = await DatabaseService.getUser(userId);
const sessions = await DatabaseService.getUserSessions(userId);
```

**After:**
```typescript
import { userService, sessionService } from '@/infrastructure/services';

const userResult = await userService.getUser(userId);
const sessionsResult = await sessionService.getUserSessions(userId);
```

### From Polling Auth to Event-Driven

**Before:**
```typescript
// Polling every 5 seconds
setInterval(async () => {
  const { data } = await supabase.auth.getSession();
  setUser(data.session?.user);
}, 5000);
```

**After:**
```typescript
import { useAuthStore } from '@/lib/stores/useAuthStore';

const { user, initialize } = useAuthStore();

useEffect(() => {
  const cleanup = initialize(); // Event-driven
  return cleanup;
}, []);
```

## Benefits

1. **Separation of Concerns** - Each layer has a single responsibility
2. **Testability** - Easy to mock repositories and services
3. **Maintainability** - Changes isolated to specific layers
4. **Type Safety** - Full TypeScript support throughout
5. **Reusability** - Base repository provides common operations
6. **Error Handling** - Standardized error classes and results
7. **Dependency Injection** - Services receive repositories via constructor
8. **Event-Driven Auth** - No polling, instant updates via Supabase events

## Next Steps

To extend the architecture:

1. **Add New Repository**: Extend `BaseRepository<T>`
2. **Add New Service**: Inject repositories via constructor
3. **Add New Error Type**: Extend `AppError`
4. **Add New Store**: Follow Zustand patterns with persistence
5. **Update Infrastructure**: Wire up new repositories and services

## Related Documentation

- [Database Schema](../database/SCHEMA.md)
- [API Reference](../api/API_PARAMETERS_REFERENCE.md)
- [Testing Guide](../testing/TESTING_GUIDE.md)
