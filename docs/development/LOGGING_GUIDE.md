# Logging Guide

Complete guide to structured logging in the Describe It application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Migration from console.log](#migration-from-consolelog)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Advanced Patterns](#advanced-patterns)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Usage

```typescript
import { log } from '@/lib/logging';

// Instead of console.log
log.info('User logged in', { userId: '123', email: 'user@example.com' });

// Instead of console.error
log.error('Failed to save user', error, { userId: '123' });

// Instead of console.warn
log.warn('Slow database query', { duration: 1500, query: 'SELECT * FROM users' });

// Instead of console.debug
log.debug('Component state updated', { prevState, newState });
```

### Component Logging

```typescript
import { createComponentLogger } from '@/lib/logging';

export function UserProfile() {
  const logger = createComponentLogger('UserProfile');

  useEffect(() => {
    logger.componentLifecycle('UserProfile', 'mount');
    return () => logger.componentLifecycle('UserProfile', 'unmount');
  }, []);

  const handleSubmit = async (data) => {
    logger.info('Form submitted', { data });
    // ...
  };
}
```

### API Route Logging

```typescript
import { createApiLogger } from '@/lib/logging';

export async function POST(request: Request) {
  const logger = createApiLogger('auth/signin');

  logger.apiRequest('POST', '/api/auth/signin');

  try {
    // ... your logic
    logger.apiResponse('POST', '/api/auth/signin', 200, duration);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Signin failed', error);
    return NextResponse.json({ error: 'Signin failed' }, { status: 500 });
  }
}
```

## Migration from console.log

### Simple Replacement

| Before | After |
|--------|-------|
| `console.log('message')` | `log.info('message')` |
| `console.log('message', data)` | `log.info('message', { data })` |
| `console.error('error', error)` | `log.error('error', error)` |
| `console.warn('warning')` | `log.warn('warning')` |
| `console.debug('debug')` | `log.debug('debug')` |

### Advanced Replacement

**Before:**
```typescript
console.log('User created:', userId, email, role);
console.log('Processing...', { step: 1, total: 5 });
console.error('API call failed:', error.message);
```

**After:**
```typescript
import { log } from '@/lib/logging';

log.info('User created', { userId, email, role });
log.info('Processing', { step: 1, total: 5 });
log.error('API call failed', error, { endpoint: '/api/users' });
```

### Performance Logging

**Before:**
```typescript
console.time('fetchUsers');
const users = await db.users.findMany();
console.timeEnd('fetchUsers');
```

**After:**
```typescript
import { logPerformance } from '@/lib/logging';

const users = await logPerformance(
  'fetchUsers',
  () => db.users.findMany(),
  500 // warn if slower than 500ms
);
```

### Function Wrapping

**Before:**
```typescript
async function fetchUser(id: string) {
  console.log('Fetching user:', id);
  try {
    const user = await db.user.findUnique({ where: { id } });
    console.log('User fetched successfully');
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

**After:**
```typescript
import { withLogging } from '@/lib/logging';

const fetchUser = withLogging(
  async (id: string) => {
    return await db.user.findUnique({ where: { id } });
  },
  'fetchUser',
  { component: 'UserService' }
);
```

## Core Concepts

### Log Levels

The logging system uses Winston's standard log levels:

- **error** (0): Error events that might still allow the application to continue
- **warn** (1): Warning messages for potentially harmful situations
- **info** (2): Informational messages that highlight application progress
- **http** (3): HTTP request/response logging
- **verbose** (4): More detailed informational events
- **debug** (5): Fine-grained informational events (development only)
- **silly** (6): Most detailed level (rarely used)

### Log Context

All logs support a `LogContext` object for structured metadata:

```typescript
interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  [key: string]: any; // Additional custom fields
}
```

**Example:**
```typescript
log.info('User action', {
  userId: '123',
  sessionId: 'abc',
  component: 'Dashboard',
  operation: 'export-data',
  format: 'csv'
});
```

### Scoped Loggers

Create loggers scoped to specific parts of your application:

```typescript
import { createScopedLogger } from '@/lib/logging';

// Service logger
const authLogger = createScopedLogger('AuthService');
authLogger.info('User authenticated', { userId });

// Component logger
const dashLogger = createScopedLogger('Dashboard');
dashLogger.debug('Rendering with props', { props });

// Feature logger
const exportLogger = createScopedLogger('DataExport');
exportLogger.performance('export-complete', duration);
```

## API Reference

### Console Replacements

#### `log.info(message, ...args)`
General informational logging.

```typescript
log.info('User logged in', { userId: '123' });
log.info('Processing step', { step: 1, total: 5 });
```

#### `log.error(message, error?, ...args)`
Error logging with optional Error object.

```typescript
log.error('Failed to save', error);
log.error('Validation failed', { field: 'email', value: 'invalid' });
```

#### `log.warn(message, ...args)`
Warning messages.

```typescript
log.warn('Slow query detected', { duration: 1500, query });
log.warn('Deprecated API usage', { endpoint: '/old-api' });
```

#### `log.debug(message, ...args)`
Debug messages (development only).

```typescript
log.debug('State updated', { prevState, newState });
log.debug('API response', { data: response.data });
```

### Logger Helpers

#### `createScopedLogger(component: string)`
Create a logger scoped to a component/module.

```typescript
const logger = createScopedLogger('UserService');
logger.info('Service initialized');
```

#### `createApiLogger(routeName: string)`
Create a logger for API routes.

```typescript
const logger = createApiLogger('auth/signin');
logger.apiRequest('POST', '/api/auth/signin');
logger.apiResponse('POST', '/api/auth/signin', 200, 150);
```

#### `createComponentLogger(componentName: string)`
Create a logger for React components.

```typescript
const logger = createComponentLogger('UserProfile');
logger.componentLifecycle('UserProfile', 'mount');
```

#### `withLogging(fn, fnName, context?)`
Wrap a function with automatic logging.

```typescript
const fetchUser = withLogging(
  async (id: string) => db.user.findUnique({ where: { id } }),
  'fetchUser',
  { component: 'UserService' }
);
```

#### `logPerformance(label, fn, threshold?, context?)`
Measure and log function performance.

```typescript
const result = await logPerformance(
  'complexCalculation',
  () => expensiveOperation(),
  1000, // warn if > 1000ms
  { userId }
);
```

#### `trackUserAction(action, userId, metadata?)`
Track user actions for analytics.

```typescript
trackUserAction('clicked_export', user.id, {
  format: 'csv',
  rowCount: 1000
});
```

#### `createRequestLogger(method, url)`
Create a request/response logger.

```typescript
const reqLogger = createRequestLogger('POST', '/api/users');
reqLogger.start({ body: userData });
// ... make request
reqLogger.end(201, { userId: newUser.id });
```

#### `batchLog(batchName, operations, context?)`
Log multiple related operations.

```typescript
await batchLog('user-registration', [
  { name: 'validate-email', fn: () => validateEmail(email) },
  { name: 'create-user', fn: () => createUser(data) },
  { name: 'send-welcome', fn: () => sendWelcome(user) }
]);
```

#### `createDatabaseLogger(operation, table)`
Create a logger for database operations.

```typescript
const dbLogger = createDatabaseLogger('select', 'users');
dbLogger.start({ query });
// ... execute query
dbLogger.end(5); // 5 rows returned
```

### Pre-configured Loggers

Import ready-to-use loggers:

```typescript
import {
  logger,          // General app logger
  apiLogger,       // API routes
  authLogger,      // Authentication
  dbLogger,        // Database operations
  securityLogger,  // Security events
  performanceLogger // Performance metrics
} from '@/lib/logging';

apiLogger.apiRequest('GET', '/api/users');
authLogger.auth('login-attempt', true, { userId });
dbLogger.database('select users', 25);
securityLogger.security('suspicious-activity', 'high', { ip });
performanceLogger.performance('render-dashboard', 150);
```

## Best Practices

### 1. Use Structured Logging

**Good:**
```typescript
log.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: Date.now()
});
```

**Bad:**
```typescript
log.info(`User ${user.id} (${user.email}) logged in at ${Date.now()}`);
```

### 2. Choose Appropriate Log Levels

**Good:**
```typescript
log.error('Database connection failed', error);      // Critical errors
log.warn('Slow query detected', { duration: 2000 }); // Warnings
log.info('User registered', { userId });             // Important events
log.debug('State updated', { state });               // Debug info
```

**Bad:**
```typescript
log.error('User clicked button');  // Not an error
log.debug('Payment failed');       // Should be error
```

### 3. Include Relevant Context

**Good:**
```typescript
log.error('Payment processing failed', error, {
  userId: user.id,
  amount: payment.amount,
  paymentMethod: payment.method,
  attemptNumber: retries
});
```

**Bad:**
```typescript
log.error('Payment failed', error);
```

### 4. Use Scoped Loggers

**Good:**
```typescript
// In UserService.ts
const logger = createScopedLogger('UserService');

export class UserService {
  createUser(data: UserData) {
    logger.info('Creating user', { email: data.email });
    // ...
  }
}
```

**Bad:**
```typescript
// Using global logger everywhere
import { logger } from '@/lib/logging';

export class UserService {
  createUser(data: UserData) {
    logger.info('Creating user', { email: data.email });
    // Hard to filter logs by service
  }
}
```

### 5. Don't Log Sensitive Data

**Good:**
```typescript
log.info('User authenticated', {
  userId: user.id,
  email: user.email.replace(/(.{3}).*(@.*)/, '$1***$2') // masked
});
```

**Bad:**
```typescript
log.info('User authenticated', {
  userId: user.id,
  email: user.email,
  password: user.password, // NEVER log passwords!
  apiKey: user.apiKey      // NEVER log API keys!
});
```

### 6. Use Performance Logging for Slow Operations

**Good:**
```typescript
const users = await logPerformance(
  'fetchAllUsers',
  () => db.users.findMany(),
  500 // warn if > 500ms
);
```

**Bad:**
```typescript
const users = await db.users.findMany();
// No performance tracking
```

### 7. Wrap Critical Functions

**Good:**
```typescript
const processPayment = withLogging(
  async (paymentData) => {
    // Complex payment logic
  },
  'processPayment',
  { critical: true }
);
```

**Bad:**
```typescript
async function processPayment(paymentData) {
  // No automatic error logging
  // No performance tracking
}
```

## Advanced Patterns

### Custom Error Categories

```typescript
import { createScopedLogger } from '@/lib/logging';

const logger = createScopedLogger('PaymentService');

try {
  await processPayment(paymentData);
} catch (error) {
  logger.error('Payment failed', error, {
    category: 'external_api',
    severity: 'high',
    code: 'PAYMENT_GATEWAY_ERROR',
    recoverable: true
  });
}
```

### Request Tracing

```typescript
import { createRequestLogger } from '@/lib/logging';

export async function POST(request: Request) {
  const logger = createApiLogger('users/create');
  const requestId = logger.generateRequestId();

  logger.setRequest({ requestId });
  logger.apiRequest('POST', '/api/users', { requestId });

  // All subsequent logs include requestId
  logger.info('Validating input', { requestId });
  logger.info('Creating user', { requestId });

  logger.clearRequest();
}
```

### Performance Monitoring

```typescript
import { time, timeEnd } from '@/lib/logging';

async function complexOperation() {
  time('overall-operation');

  time('step-1');
  await step1();
  timeEnd('step-1');

  time('step-2');
  await step2();
  timeEnd('step-2');

  timeEnd('overall-operation');
}
```

### Batch Operations

```typescript
import { batchLog } from '@/lib/logging';

await batchLog('data-migration', [
  { name: 'backup-data', fn: () => backupDatabase() },
  { name: 'migrate-users', fn: () => migrateUsers() },
  { name: 'migrate-posts', fn: () => migratePosts() },
  { name: 'verify-data', fn: () => verifyIntegrity() }
], { userId: admin.id });
```

### Component Lifecycle Tracking

```typescript
import { createComponentLogger } from '@/lib/logging';

export function Dashboard() {
  const logger = createComponentLogger('Dashboard');
  const [data, setData] = useState(null);

  useEffect(() => {
    logger.componentLifecycle('Dashboard', 'mount');

    return () => {
      logger.componentLifecycle('Dashboard', 'unmount');
    };
  }, []);

  useEffect(() => {
    logger.componentLifecycle('Dashboard', 'render', {
      dataLoaded: !!data
    });
  });

  return <div>...</div>;
}
```

## Troubleshooting

### Logs Not Appearing

**Issue:** Logs not showing in console

**Solutions:**
1. Check log level: `export LOG_LEVEL=debug`
2. Verify NODE_ENV: logs may be suppressed in test environment
3. Check Winston configuration in `/src/lib/logger.ts`

### Performance Issues

**Issue:** Logging causing performance problems

**Solutions:**
1. Reduce log level in production: `export LOG_LEVEL=info`
2. Use async logging for non-critical logs
3. Avoid logging large objects
4. Use `devOnly()` for development-specific logs

### Missing Context

**Issue:** Logs missing request context

**Solutions:**
1. Use `logger.setRequest()` at route entry
2. Pass context explicitly to scoped loggers
3. Use `createRequestLogger()` for API routes

### Type Errors

**Issue:** TypeScript errors with log context

**Solutions:**
1. Import `LogContext` type
2. Define custom context interface extending `LogContext`
3. Use type assertions when necessary

```typescript
import { LogContext } from '@/lib/logging';

interface CustomContext extends LogContext {
  customField: string;
}

const context: CustomContext = {
  userId: '123',
  customField: 'value'
};

logger.info('Custom context', context);
```

## Environment Configuration

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
```

- All log levels active
- Console output with colors
- Verbose debugging information

### Production

```env
NODE_ENV=production
LOG_LEVEL=info
LOGGING_WEBHOOK_URL=https://your-logging-service.com/webhook
```

- Info level and above
- JSON structured logs
- File-based logging
- External monitoring integration

### Testing

```env
NODE_ENV=test
LOG_LEVEL=error
```

- Error level only
- No console output (prevents test noise)
- Critical errors only

## Summary

- Use `log.info/warn/error/debug` for simple logging
- Use scoped loggers for better organization
- Include structured context for searchability
- Wrap critical functions with `withLogging`
- Monitor performance with `logPerformance`
- Never log sensitive data
- Use appropriate log levels
- Enable external monitoring in production

For more examples, see the codebase or the inline documentation in `/src/lib/logging/`.
