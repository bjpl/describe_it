# Error Handling Infrastructure - Usage Examples

This document demonstrates the comprehensive error handling patterns implemented in the describe-it project.

## Table of Contents

1. [Result Type Pattern](#result-type-pattern)
2. [API Route Error Handling](#api-route-error-handling)
3. [React Error Boundaries](#react-error-boundaries)
4. [Error Logging](#error-logging)
5. [Common Patterns](#common-patterns)

---

## Result Type Pattern

The `Result<T, E>` type provides type-safe error handling without throwing exceptions.

### Basic Usage

```typescript
import { ok, err, Result } from '@/core/errors';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

// Using the result
const result = divide(10, 2);
if (result.success) {
  console.log('Result:', result.data); // 5
} else {
  console.error('Error:', result.error);
}
```

### Working with Results

```typescript
import { map, andThen, unwrapOr } from '@/core/errors';

// Map transforms successful values
const doubled = map(divide(10, 2), (x) => x * 2);

// andThen chains operations
function safeSqrt(n: number): Result<number, string> {
  if (n < 0) return err('Cannot take square root of negative number');
  return ok(Math.sqrt(n));
}

const result = andThen(divide(16, 2), safeSqrt); // sqrt(16/2) = sqrt(8)

// Unwrap with default value
const value = unwrapOr(divide(10, 0), 0); // Returns 0 since division fails
```

### Async Operations

```typescript
import { fromPromise, tryCatchAsync } from '@/core/errors';

// Convert Promise to Result
async function fetchUser(id: string): Promise<Result<User, Error>> {
  return fromPromise(
    fetch(`/api/users/${id}`).then(r => r.json()),
    (error) => new Error(`Failed to fetch user: ${error}`)
  );
}

// Wrap async function
const safeAsync = await tryCatchAsync(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  (error) => new AppError('API call failed', 500, 'API_ERROR', { error })
);
```

---

## API Route Error Handling

### Basic API Route with Error Handling

```typescript
// app/api/users/route.ts
import { withErrorHandling, createSuccessResponse, NotFoundError } from '@/core/errors';

export const GET = withErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    throw new ValidationError('User ID is required');
  }

  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError('User', id);
  }

  return createSuccessResponse(user);
});
```

### Using Result Pattern in API Routes

```typescript
// app/api/posts/route.ts
import { withResultHandling, ok, err, NotFoundError } from '@/core/errors';

export const GET = withResultHandling(async (request: Request, context: any) => {
  const { params } = context;

  // Business logic returns Result
  const post = await postService.getById(params.id);

  if (!post) {
    return err(new NotFoundError('Post', params.id));
  }

  return ok(post);
});
```

### Request Validation

```typescript
import { validateRequestBody, validateQueryParams, z } from '@/core/errors';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

export const POST = withErrorHandling(async (request: Request) => {
  // Validate request body
  const bodyResult = await validateRequestBody(request, userSchema);

  if (!bodyResult.success) {
    throw bodyResult.error; // ValidationError with details
  }

  const user = await createUser(bodyResult.data);
  return createSuccessResponse(user, 201);
});
```

### CORS Support

```typescript
import { withCORS, withErrorHandling } from '@/core/errors';

export const GET = withCORS(
  withErrorHandling(async (request: Request) => {
    const data = await fetchData();
    return createSuccessResponse(data);
  }),
  {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  }
);
```

---

## React Error Boundaries

### Basic Error Boundary

```tsx
// app/layout.tsx
import { ErrorBoundary } from '@/lib/utils/error-boundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ErrorBoundary
          fallback={<ErrorPage />}
          onError={(error, errorInfo) => {
            // Send to error tracking service
            console.error('Layout error:', error, errorInfo);
          }}
        >
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### Custom Error Fallback

```tsx
import { ErrorBoundary } from '@/lib/utils/error-boundary';

function CustomErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-container">
      <h1>Oops! Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  );
}

export function MyComponent() {
  return (
    <ErrorBoundary fallback={(error, errorInfo) => <CustomErrorFallback error={error} reset={() => window.location.reload()} />}>
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

### Error Boundary with Reset Keys

```tsx
import { ErrorBoundary } from '@/lib/utils/error-boundary';

export function UserProfile({ userId }: { userId: string }) {
  return (
    <ErrorBoundary
      resetKeys={[userId]} // Reset error state when userId changes
      fallback={<ErrorPage />}
    >
      <UserData userId={userId} />
    </ErrorBoundary>
  );
}
```

### Using Error Handler Hook

```tsx
import { useErrorHandler } from '@/lib/utils/error-boundary';

function DataLoader() {
  const throwError = useErrorHandler();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setData(data);
      } catch (error) {
        // This will be caught by nearest error boundary
        throwError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    loadData();
  }, [throwError]);

  return <div>{data ? <DataView data={data} /> : 'Loading...'}</div>;
}
```

### Safe Async Hook

```tsx
import { useSafeAsync } from '@/lib/utils/error-boundary';

function FormComponent() {
  const safeAsync = useSafeAsync();

  const handleSubmit = safeAsync(async (data: FormData) => {
    // Errors automatically caught by error boundary
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    return response.json();
  });

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Higher-Order Component

```tsx
import { withErrorBoundary } from '@/lib/utils/error-boundary';

// Wrap component with error boundary
const SafeUserProfile = withErrorBoundary(UserProfile, {
  fallback: <ErrorPage />,
  onError: (error, errorInfo) => {
    logErrorToService(error, errorInfo);
  },
});
```

---

## Error Logging

### Basic Logging

```typescript
import { logger } from '@/core/errors';

// Log errors
try {
  await riskyOperation();
} catch (error) {
  logger.error(error, {
    userId: user.id,
    operation: 'riskyOperation',
  });
  throw error;
}

// Log warnings
logger.warn('Deprecated API usage', {
  endpoint: '/old-api',
  userId: user.id,
});

// Log info
logger.info('User logged in', {
  userId: user.id,
  timestamp: new Date().toISOString(),
});
```

### With Error Context

```typescript
import { logger, ErrorContext } from '@/core/errors';

async function processPayment(orderId: string, amount: number) {
  const context: ErrorContext = {
    userId: currentUser.id,
    path: '/api/payments',
    method: 'POST',
    metadata: { orderId, amount },
  };

  try {
    const result = await paymentService.process(orderId, amount);
    logger.info('Payment processed successfully', context);
    return result;
  } catch (error) {
    logger.error(error, context);
    throw error;
  }
}
```

### Function Decorator

```typescript
import { withErrorLogging } from '@/core/errors';

const processOrder = withErrorLogging(
  async (orderId: string) => {
    // Function logic
    return await orderService.process(orderId);
  },
  { operation: 'processOrder' }
);
```

---

## Common Patterns

### Service Layer with Result Pattern

```typescript
// services/user.service.ts
import { Result, ok, err, DatabaseError, NotFoundError } from '@/core/errors';

export class UserService {
  async getUser(id: string): Promise<Result<User, AppError>> {
    try {
      const user = await db.user.findUnique({ where: { id } });

      if (!user) {
        return err(new NotFoundError('User', id));
      }

      return ok(user);
    } catch (error) {
      logger.error(error, { operation: 'getUser', userId: id });
      return err(new DatabaseError('Failed to retrieve user', { error }));
    }
  }

  async createUser(data: CreateUserDto): Promise<Result<User, AppError>> {
    try {
      const user = await db.user.create({ data });
      return ok(user);
    } catch (error) {
      logger.error(error, { operation: 'createUser' });

      if (error.code === 'P2002') {
        return err(new ConflictError('User already exists', { email: data.email }));
      }

      return err(new DatabaseError('Failed to create user', { error }));
    }
  }
}
```

### Repository Pattern with Error Handling

```typescript
// repositories/base.repository.ts
import { Result, ok, err, DatabaseError, NotFoundError } from '@/core/errors';

export abstract class BaseRepository<T> {
  protected abstract model: any;
  protected abstract modelName: string;

  async findById(id: string): Promise<Result<T, AppError>> {
    try {
      const entity = await this.model.findUnique({ where: { id } });

      if (!entity) {
        return err(new NotFoundError(this.modelName, id));
      }

      return ok(entity);
    } catch (error) {
      logger.error(error, { repository: this.modelName, operation: 'findById' });
      return err(new DatabaseError(`Failed to find ${this.modelName}`, { error }));
    }
  }

  async create(data: Partial<T>): Promise<Result<T, AppError>> {
    try {
      const entity = await this.model.create({ data });
      return ok(entity);
    } catch (error) {
      logger.error(error, { repository: this.modelName, operation: 'create' });
      return err(new DatabaseError(`Failed to create ${this.modelName}`, { error }));
    }
  }
}
```

### Complete API Route Example

```typescript
// app/api/users/[id]/route.ts
import {
  withErrorHandling,
  createSuccessResponse,
  NotFoundError,
  logger,
  extractRequestContext,
} from '@/core/errors';

export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const context = extractRequestContext(request);

  logger.info('Fetching user', { ...context, userId: params.id });

  const userResult = await userService.getUser(params.id);

  if (!userResult.success) {
    throw userResult.error;
  }

  logger.info('User fetched successfully', { ...context, userId: params.id });

  return createSuccessResponse(userResult.data);
});

export const PATCH = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const context = extractRequestContext(request);

  const bodyResult = await validateRequestBody(request, updateUserSchema);
  if (!bodyResult.success) {
    throw bodyResult.error;
  }

  const updateResult = await userService.updateUser(params.id, bodyResult.data);

  if (!updateResult.success) {
    throw updateResult.error;
  }

  return createSuccessResponse(updateResult.data);
});
```

### Client-Side Error Handling

```tsx
// components/UserList.tsx
'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary, useErrorHandler } from '@/lib/utils/error-boundary';

function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const throwError = useErrorHandler();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error.message);
        }

        setUsers(data.data);
      } catch (error) {
        throwError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    fetchUsers();
  }, [throwError]);

  return (
    <div>
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

// Wrap with error boundary
export default function UserListPage() {
  return (
    <ErrorBoundary>
      <UserList />
    </ErrorBoundary>
  );
}
```

---

## Best Practices

1. **Use Result type for business logic**: Service and repository layers should return `Result` types
2. **Use error boundaries for UI errors**: Wrap React components with error boundaries
3. **Log all errors with context**: Always include relevant context when logging errors
4. **Throw AppError subclasses in API routes**: Use specific error types (ValidationError, NotFoundError, etc.)
5. **Validate at boundaries**: Validate inputs at API routes and form submissions
6. **Provide user-friendly messages**: Error messages should be clear and actionable
7. **Hide sensitive details in production**: Use `process.env.NODE_ENV` checks
8. **Track errors externally**: Integrate with error monitoring services (Sentry, DataDog, etc.)

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id '123' not found",
    "statusCode": 404,
    "details": {
      "resource": "User",
      "id": "123"
    }
  }
}
```
