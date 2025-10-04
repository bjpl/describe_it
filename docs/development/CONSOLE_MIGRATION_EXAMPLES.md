# Console Migration Examples

Real-world examples of migrating from console.log to structured logging.

## Table of Contents

1. [Basic Conversions](#basic-conversions)
2. [React Components](#react-components)
3. [API Routes](#api-routes)
4. [Service Classes](#service-classes)
5. [Error Handling](#error-handling)
6. [Performance Tracking](#performance-tracking)

## Basic Conversions

### Simple Logging

**Before:**
```typescript
console.log('User logged in');
console.log('User logged in:', userId);
console.log('User logged in', userId, email, role);
```

**After:**
```typescript
import { log } from '@/lib/logging';

log.info('User logged in');
log.info('User logged in', { userId });
log.info('User logged in', { userId, email, role });
```

### Error Logging

**Before:**
```typescript
console.error('Failed to save user');
console.error('Failed to save user:', error);
console.error('Failed to save user:', error.message);
```

**After:**
```typescript
import { log } from '@/lib/logging';

log.error('Failed to save user');
log.error('Failed to save user', error);
log.error('Failed to save user', error, { userId, context: 'signup' });
```

### Warning Messages

**Before:**
```typescript
console.warn('Slow query detected');
console.warn('Slow query:', duration, 'ms');
```

**After:**
```typescript
import { log } from '@/lib/logging';

log.warn('Slow query detected');
log.warn('Slow query detected', { duration, query, threshold: 1000 });
```

## React Components

### Component Lifecycle

**Before:**
```typescript
export function UserDashboard() {
  useEffect(() => {
    console.log('UserDashboard mounted');
    console.log('Loading user data');

    return () => {
      console.log('UserDashboard unmounting');
    };
  }, []);

  return <div>...</div>;
}
```

**After:**
```typescript
import { createComponentLogger } from '@/lib/logging';

export function UserDashboard() {
  const logger = createComponentLogger('UserDashboard');

  useEffect(() => {
    logger.componentLifecycle('UserDashboard', 'mount');
    logger.info('Loading user data');

    return () => {
      logger.componentLifecycle('UserDashboard', 'unmount');
    };
  }, []);

  return <div>...</div>;
}
```

### Event Handlers

**Before:**
```typescript
const handleSubmit = async (data: FormData) => {
  console.log('Form submitted:', data);

  try {
    const result = await submitForm(data);
    console.log('Form submission successful:', result);
  } catch (error) {
    console.error('Form submission failed:', error);
  }
};
```

**After:**
```typescript
import { createComponentLogger } from '@/lib/logging';

const logger = createComponentLogger('FormComponent');

const handleSubmit = async (data: FormData) => {
  logger.info('Form submitted', { formData: data });

  try {
    const result = await submitForm(data);
    logger.info('Form submission successful', { result });
  } catch (error) {
    logger.error('Form submission failed', error, { formData: data });
  }
};
```

### State Updates

**Before:**
```typescript
const [user, setUser] = useState<User | null>(null);

useEffect(() => {
  console.log('User state changed:', user);
}, [user]);
```

**After:**
```typescript
import { createComponentLogger } from '@/lib/logging';

const logger = createComponentLogger('UserComponent');
const [user, setUser] = useState<User | null>(null);

useEffect(() => {
  logger.debug('User state changed', { user, hasUser: !!user });
}, [user]);
```

## API Routes

### Basic API Route

**Before:**
```typescript
export async function POST(request: Request) {
  console.log('POST /api/users');

  try {
    const body = await request.json();
    console.log('Request body:', body);

    const user = await createUser(body);
    console.log('User created:', user.id);

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { createApiLogger } from '@/lib/logging';

export async function POST(request: Request) {
  const logger = createApiLogger('users/create');

  logger.apiRequest('POST', '/api/users');

  try {
    const body = await request.json();
    logger.debug('Request body received', { body });

    const user = await createUser(body);
    logger.info('User created', { userId: user.id });

    logger.apiResponse('POST', '/api/users', 201);
    return NextResponse.json(user);
  } catch (error) {
    logger.error('Failed to create user', error);
    logger.apiResponse('POST', '/api/users', 500);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### API Route with Request Tracking

**Before:**
```typescript
export async function GET(request: Request) {
  const requestId = Math.random().toString(36);
  console.log(`[${requestId}] GET /api/users`);

  try {
    console.log(`[${requestId}] Fetching users from database`);
    const users = await db.users.findMany();
    console.log(`[${requestId}] Found ${users.length} users`);

    return NextResponse.json(users);
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch users:`, error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { createApiLogger } from '@/lib/logging';

export async function GET(request: Request) {
  const logger = createApiLogger('users/list');
  const requestId = logger.generateRequestId();

  logger.setRequest({ requestId });
  logger.apiRequest('GET', '/api/users');

  try {
    logger.debug('Fetching users from database');
    const users = await db.users.findMany();
    logger.info('Users fetched', { count: users.length });

    logger.apiResponse('GET', '/api/users', 200);
    return NextResponse.json(users);
  } catch (error) {
    logger.error('Failed to fetch users', error);
    logger.apiResponse('GET', '/api/users', 500);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  } finally {
    logger.clearRequest();
  }
}
```

## Service Classes

### Service with Console Logging

**Before:**
```typescript
export class UserService {
  async createUser(data: UserData) {
    console.log('Creating user:', data.email);

    try {
      console.log('Validating user data');
      const validated = await this.validate(data);

      console.log('Saving to database');
      const user = await db.user.create({ data: validated });

      console.log('User created successfully:', user.id);
      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    console.log('Deleting user:', userId);
    // ...
  }
}
```

**After:**
```typescript
import { createScopedLogger } from '@/lib/logging';

export class UserService {
  private logger = createScopedLogger('UserService');

  async createUser(data: UserData) {
    this.logger.info('Creating user', { email: data.email });

    try {
      this.logger.debug('Validating user data');
      const validated = await this.validate(data);

      this.logger.debug('Saving to database');
      const user = await db.user.create({ data: validated });

      this.logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error, { email: data.email });
      throw error;
    }
  }

  async deleteUser(userId: string) {
    this.logger.info('Deleting user', { userId });
    // ...
  }
}
```

### Service with Function Wrapping

**Before:**
```typescript
export class PaymentService {
  async processPayment(amount: number, userId: string) {
    console.log('Processing payment:', amount, 'for user:', userId);
    const start = Date.now();

    try {
      const result = await this.charge(amount);
      console.log('Payment successful. Duration:', Date.now() - start, 'ms');
      return result;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }
}
```

**After:**
```typescript
import { createScopedLogger, withLogging } from '@/lib/logging';

export class PaymentService {
  private logger = createScopedLogger('PaymentService');

  // Automatically logs entry, exit, duration, and errors
  processPayment = withLogging(
    async (amount: number, userId: string) => {
      return await this.charge(amount);
    },
    'processPayment',
    { component: 'PaymentService', critical: true }
  );
}
```

## Error Handling

### Try-Catch Blocks

**Before:**
```typescript
try {
  const result = await fetchData();
  console.log('Data fetched:', result);
} catch (error) {
  console.error('Failed to fetch data:', error);
  console.error('Error details:', error.message);
  if (error.code) {
    console.error('Error code:', error.code);
  }
}
```

**After:**
```typescript
import { log } from '@/lib/logging';

try {
  const result = await fetchData();
  log.info('Data fetched', { resultCount: result.length });
} catch (error) {
  log.error('Failed to fetch data', error, {
    category: 'external_api',
    severity: 'medium',
    code: error.code,
    recoverable: true
  });
}
```

### Error Boundary

**Before:**
```typescript
async function loadConfig() {
  try {
    const config = await fetchConfig();
    return config;
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return defaultConfig;
  }
}
```

**After:**
```typescript
import { withErrorBoundary } from '@/lib/logging';

const loadConfig = async () => {
  return await withErrorBoundary(
    () => fetchConfig(),
    defaultConfig,
    { component: 'ConfigLoader', critical: false }
  );
};
```

## Performance Tracking

### Manual Timing

**Before:**
```typescript
const start = Date.now();
const users = await db.users.findMany();
const duration = Date.now() - start;
console.log(`Query took ${duration}ms`);

if (duration > 1000) {
  console.warn('Slow query detected!');
}
```

**After:**
```typescript
import { logPerformance } from '@/lib/logging';

const users = await logPerformance(
  'fetchUsers',
  () => db.users.findMany(),
  1000 // warn if > 1000ms
);
```

### Multiple Operations

**Before:**
```typescript
console.time('overall');

console.time('fetch-users');
const users = await fetchUsers();
console.timeEnd('fetch-users');

console.time('fetch-posts');
const posts = await fetchPosts();
console.timeEnd('fetch-posts');

console.timeEnd('overall');
```

**After:**
```typescript
import { time, timeEnd } from '@/lib/logging';

time('overall');

time('fetch-users');
const users = await fetchUsers();
timeEnd('fetch-users');

time('fetch-posts');
const posts = await fetchPosts();
timeEnd('fetch-posts');

timeEnd('overall');
```

### Batch Operations

**Before:**
```typescript
console.log('Starting batch operation');
const start = Date.now();

try {
  console.log('Step 1: Validating');
  await validate();

  console.log('Step 2: Processing');
  await process();

  console.log('Step 3: Saving');
  await save();

  console.log('Batch completed in', Date.now() - start, 'ms');
} catch (error) {
  console.error('Batch operation failed:', error);
}
```

**After:**
```typescript
import { batchLog } from '@/lib/logging';

await batchLog('user-import', [
  { name: 'validate', fn: () => validate() },
  { name: 'process', fn: () => process() },
  { name: 'save', fn: () => save() }
], { userId: 'admin-123' });
```

## Database Operations

### Query Logging

**Before:**
```typescript
const start = Date.now();
const users = await db.users.findMany({ where: { active: true } });
const duration = Date.now() - start;

console.log(`Found ${users.length} users in ${duration}ms`);
if (duration > 500) {
  console.warn('Slow database query!');
}
```

**After:**
```typescript
import { createDatabaseLogger } from '@/lib/logging';

const dbLogger = createDatabaseLogger('select', 'users');
dbLogger.start({ where: { active: true } });
const users = await db.users.findMany({ where: { active: true } });
dbLogger.end(users.length);
```

## Summary

### Quick Migration Checklist

- [ ] Replace `console.log` with `log.info`
- [ ] Replace `console.error` with `log.error`
- [ ] Replace `console.warn` with `log.warn`
- [ ] Replace `console.debug` with `log.debug`
- [ ] Use scoped loggers for components/services
- [ ] Add structured context to all logs
- [ ] Wrap critical functions with `withLogging`
- [ ] Use `logPerformance` for slow operations
- [ ] Use `createApiLogger` for API routes
- [ ] Never log sensitive data

### Benefits Gained

- Structured, searchable logs
- Automatic performance tracking
- Request tracing
- Environment-aware logging
- External monitoring integration
- Type-safe contexts
- Better debugging experience
