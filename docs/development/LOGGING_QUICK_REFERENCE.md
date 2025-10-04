# Logging Quick Reference

Fast reference guide for common logging patterns.

## Import Statements

```typescript
// Most common - drop-in console replacement
import { log } from '@/lib/logging';

// Specialized loggers
import {
  createScopedLogger,
  createApiLogger,
  createComponentLogger,
  logPerformance,
  withLogging
} from '@/lib/logging';

// Pre-configured loggers
import {
  logger,      // General app logger
  apiLogger,   // API routes
  authLogger,  // Authentication
  dbLogger     // Database operations
} from '@/lib/logging';
```

## Common Patterns

### Basic Logging

```typescript
// Info
log.info('User logged in', { userId: '123' });

// Warning
log.warn('Slow query', { duration: 1500 });

// Error
log.error('Failed to save', error, { userId: '123' });

// Debug (dev only)
log.debug('State changed', { prev, next });
```

### Component Logging

```typescript
const logger = createComponentLogger('UserProfile');

// Lifecycle
logger.componentLifecycle('UserProfile', 'mount');

// Events
logger.info('Form submitted', { formData });
```

### API Route Logging

```typescript
const logger = createApiLogger('auth/signin');

logger.apiRequest('POST', '/api/auth/signin');
// ... your logic
logger.apiResponse('POST', '/api/auth/signin', 200, duration);
```

### Performance Tracking

```typescript
// Simple
const result = await logPerformance(
  'fetchUsers',
  () => db.users.findMany()
);

// With threshold
const result = await logPerformance(
  'complexQuery',
  () => db.query(),
  500 // warn if > 500ms
);
```

### Function Wrapping

```typescript
const fetchUser = withLogging(
  async (id: string) => db.user.findUnique({ where: { id } }),
  'fetchUser',
  { component: 'UserService' }
);

// Now automatically logs:
// - Entry/exit
// - Performance
// - Errors
```

### Request Logging

```typescript
const reqLogger = createRequestLogger('POST', '/api/users');
reqLogger.start({ body: userData });
// ... make request
reqLogger.end(201, { userId: newUser.id });
```

### Database Logging

```typescript
const dbLogger = createDatabaseLogger('select', 'users');
dbLogger.start({ query });
const users = await db.users.findMany();
dbLogger.end(users.length);
```

## Migration Cheatsheet

| Old (console) | New (structured) |
|--------------|------------------|
| `console.log('msg')` | `log.info('msg')` |
| `console.log('msg', data)` | `log.info('msg', { data })` |
| `console.error('err', err)` | `log.error('err', err)` |
| `console.warn('warn')` | `log.warn('warn')` |
| `console.debug('debug')` | `log.debug('debug')` |
| `console.time('label')` | `time('label')` |
| `console.timeEnd('label')` | `timeEnd('label')` |
| `console.table(data)` | `table(data)` |

## Context Examples

```typescript
// User context
log.info('Action', {
  userId: user.id,
  sessionId: session.id
});

// Request context
log.info('API call', {
  requestId: req.id,
  method: 'POST',
  url: '/api/users'
});

// Performance context
log.warn('Slow operation', {
  operation: 'fetchUsers',
  duration: 1500,
  threshold: 1000
});

// Error context
log.error('Operation failed', error, {
  category: 'database',
  severity: 'high',
  recoverable: true
});
```

## Pre-configured Loggers

```typescript
// General application
logger.info('App started');

// API routes
apiLogger.apiRequest('GET', '/api/users');
apiLogger.apiResponse('GET', '/api/users', 200, 150);

// Authentication
authLogger.auth('login-attempt', true, { userId });
authLogger.security('suspicious-activity', 'high', { ip });

// Database
dbLogger.database('select users', 25, { table: 'users' });

// Performance
performanceLogger.performance('render-dashboard', 150);
```

## Advanced Patterns

### Batch Operations

```typescript
await batchLog('user-registration', [
  { name: 'validate', fn: () => validate(data) },
  { name: 'create', fn: () => create(user) },
  { name: 'notify', fn: () => notify(user) }
]);
```

### Error Boundary

```typescript
const result = await withErrorBoundary(
  () => riskyOperation(),
  defaultValue,
  { component: 'DataLoader' }
);
```

### User Tracking

```typescript
trackUserAction('clicked_export', user.id, {
  format: 'csv',
  page: 'dashboard'
});
```

### Development Only

```typescript
devOnly('Debug info', { state, props });
// Only logs in NODE_ENV=development
```

## Environment Variables

```env
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Production
NODE_ENV=production
LOG_LEVEL=info
LOGGING_WEBHOOK_URL=https://logs.example.com

# Testing
NODE_ENV=test
LOG_LEVEL=error
```

## Log Levels

From most to least severe:
- **error** - Critical errors
- **warn** - Warnings
- **info** - Important information
- **http** - HTTP requests
- **verbose** - Detailed info
- **debug** - Debug information (dev only)
- **silly** - Very detailed (rarely used)

## Best Practices

1. **Use structured data**: `log.info('msg', { key: value })` not `log.info('msg: ' + value)`
2. **Choose correct level**: Errors are errors, info is info
3. **Include context**: Always add relevant metadata
4. **Don't log secrets**: Never log passwords, API keys, tokens
5. **Use scoped loggers**: `createScopedLogger('MyComponent')`
6. **Mask PII**: Redact sensitive personal information

## Common Mistakes

```typescript
// ❌ BAD
log.error('User clicked button'); // Not an error
log.info('Database crashed'); // Should be error
console.log('Still using console'); // Use log.info

// ✅ GOOD
log.info('User clicked button', { buttonId });
log.error('Database crashed', error, { component: 'DB' });
log.info('User action', { action: 'click' });
```

## TypeScript Support

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

## See Also

- [Complete Logging Guide](/docs/development/LOGGING_GUIDE.md) - Comprehensive documentation
- [Core Logger](/src/lib/logger.ts) - Winston configuration
- [Logger Utilities](/src/lib/logging/) - Helper functions
