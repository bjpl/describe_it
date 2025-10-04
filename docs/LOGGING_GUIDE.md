# Structured Logging Guide

## Overview

This project uses a unified Winston-based logging infrastructure that replaces all console statements with structured, production-ready logging.

## Features

- **Winston-based logging** on server-side with file rotation
- **Environment-specific configuration** (dev/prod/test)
- **Structured JSON logs** in production
- **Pretty console output** in development
- **Request tracking** with unique request IDs
- **Error categorization** and severity levels
- **External monitoring integration** (Sentry, DataDog, custom webhooks)
- **Client-side error storage** in localStorage
- **Automatic log rotation** with configurable retention

## Installation

The logger is already configured. Winston is installed as a dependency:

```bash
npm install winston@3.17.0  # Already installed
```

## Basic Usage

### Importing the Logger

```typescript
// Basic logger
import { logger } from '@/lib/logger';

// Specialized loggers
import { apiLogger, authLogger, dbLogger, securityLogger, performanceLogger } from '@/lib/logger';

// Convenience functions
import { logError, logWarn, logInfo, logDebug } from '@/lib/logger';

// Factory functions
import { createLogger, createRequestLogger } from '@/lib/logger';
```

### Standard Logging Methods

```typescript
// Error logging
logger.error('Failed to process request', error, {
  userId: '123',
  operation: 'checkout'
});

// Warning logging
logger.warn('Rate limit approaching', {
  userId: '123',
  currentRate: 95
});

// Info logging
logger.info('User logged in successfully', {
  userId: '123',
  email: 'user@example.com'
});

// Debug logging (only in development)
logger.debug('Processing payment', {
  amount: 100,
  currency: 'USD'
});
```

### Specialized Logging Methods

#### API Logging

```typescript
// Log API request
logger.apiRequest('POST', '/api/auth/signin', {
  userId: '123'
});

// Log API response
logger.apiResponse('POST', '/api/auth/signin', 200, 145, {
  userId: '123'
});

// Or use apiLogger directly
apiLogger.http('Received payment request', {
  amount: 100,
  currency: 'USD'
});
```

#### Security Logging

```typescript
// Log security events
logger.security('Failed login attempt', 'high', {
  email: 'user@example.com',
  ip: '192.168.1.1'
});

// Or use securityLogger
securityLogger.error('Unauthorized access attempt', undefined, {
  path: '/admin',
  ip: '192.168.1.1'
});
```

#### Authentication Logging

```typescript
// Log auth events
logger.auth('User login', true, {
  userId: '123',
  method: 'password'
});

// Or use authLogger
authLogger.info('Password reset requested', {
  email: 'user@example.com'
});
```

#### Database Logging

```typescript
// Log database operations
logger.database('User query', 234, {
  query: 'SELECT * FROM users',
  rowCount: 50
});

// Or use dbLogger
dbLogger.debug('Connection pool status', {
  active: 5,
  idle: 10,
  waiting: 0
});
```

#### Performance Logging

```typescript
// Log performance metrics
logger.performance('Image processing', 1250, {
  imageSize: '2MB',
  format: 'webp'
});

// Or use performanceLogger
performanceLogger.warn('Slow query detected', {
  query: 'complex_join',
  duration: 3500
});
```

## API Route Logging

### Using Request Logger

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Create logger with request context
  const logger = createRequestLogger('api-payment', request);

  logger.info('Processing payment');

  try {
    // Your API logic here
    const result = await processPayment();

    logger.info('Payment processed successfully', {
      transactionId: result.id
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Payment processing failed', error as Error, {
      category: 'business_logic',
      severity: 'high'
    });

    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    );
  }
}
```

### Request Context

The request logger automatically captures:
- Request ID (unique per request)
- HTTP method
- URL path
- Query parameters
- User agent
- Client IP address
- Timestamp

## Error Categories and Severity

### Categories

- `authentication` - Auth-related errors
- `validation` - Input validation errors
- `external_api` - Third-party API errors
- `database` - Database operation errors
- `system` - System/infrastructure errors
- `business_logic` - Application logic errors
- `network` - Network connectivity errors
- `security` - Security-related events

### Severity Levels

- `low` - Minor issues, no impact
- `medium` - Moderate impact, workaround available
- `high` - Significant impact, needs attention
- `critical` - System-wide impact, immediate action required

## Environment Configuration

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
```

Output: Pretty, colorized console logs with full details

### Production

```env
NODE_ENV=production
LOG_LEVEL=info
```

Output: JSON structured logs to files:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- `logs/http.log` - HTTP request/response logs

### Test

```env
NODE_ENV=test
LOG_LEVEL=error
```

Output: Silent (minimal logging during tests)

## Log File Configuration

### File Rotation

Logs automatically rotate when they reach:
- **Max size**: 10MB per file
- **Max files**:
  - Error logs: 10 files (100MB total)
  - Combined logs: 5 files (50MB total)
  - HTTP logs: 3 files (30MB total)

### Log Retention

Client-side errors in localStorage are automatically cleaned after 7 days.

## External Monitoring Integration

### Sentry Integration

```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

Critical errors are automatically sent to Sentry in production.

### Custom Webhook

```env
LOGGING_WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

Errors and warnings are POSTed to the webhook in production.

## Migration from Console

### Before (console statements)

```typescript
console.log('User logged in:', userId);
console.error('Failed to save:', error);
console.warn('Rate limit reached');
```

### After (structured logging)

```typescript
logger.info('User logged in', { userId });
logger.error('Failed to save', error, { operation: 'user-save' });
logger.warn('Rate limit reached', { userId, limit: 100 });
```

### Automated Migration

Use the migration script to replace console statements:

```bash
node scripts/migrate-console-to-logger.js
```

This will:
1. Create backups of all files
2. Replace console statements with appropriate logger calls
3. Add logger imports to files
4. Generate a migration report

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// Debug - Development diagnostics
logger.debug('Cache hit', { key: 'user:123' });

// Info - Normal operations
logger.info('User created', { userId: '123' });

// Warn - Potential issues
logger.warn('Slow response time', { duration: 2000 });

// Error - Failures
logger.error('Failed to send email', error);
```

### 2. Include Context

```typescript
// Good - includes context
logger.error('Payment failed', error, {
  userId: '123',
  amount: 100,
  currency: 'USD',
  paymentMethod: 'card'
});

// Bad - no context
logger.error('Payment failed', error);
```

### 3. Use Specialized Loggers

```typescript
// Good - use specialized logger
authLogger.error('Invalid credentials', undefined, {
  email: 'user@example.com',
  attempts: 3
});

// Acceptable - but less semantic
logger.error('Invalid credentials', undefined, {
  category: 'authentication',
  email: 'user@example.com'
});
```

### 4. Don't Log Sensitive Data

```typescript
// Bad - logs password
logger.info('User login', { email, password });

// Good - doesn't log password
logger.info('User login', { email });
```

### 5. Use Request Logger for APIs

```typescript
// Good - creates logger with request context
const logger = createRequestLogger('api-users', request);
logger.info('Fetching user profile');

// Acceptable - manual context
logger.setRequest({
  requestId: generateRequestId(),
  method: request.method,
  url: request.url
});
```

## Accessing Logs

### Server-side (Production)

```bash
# View error logs
tail -f logs/error.log

# View all logs
tail -f logs/combined.log

# View HTTP logs
tail -f logs/http.log

# Search for specific errors
grep "category.*authentication" logs/error.log
```

### Client-side (Development)

```typescript
// Get stored errors
const errors = logger.getStoredErrors();
console.log('Recent errors:', errors);

// Clear stored errors
logger.clearStoredErrors();
```

## Performance Considerations

1. **Async logging** - Winston handles logs asynchronously
2. **Buffering** - Logs are buffered before writing to disk
3. **Rotation** - Old logs are automatically rotated and compressed
4. **Silent failures** - Logging errors don't crash the application

## Troubleshooting

### Logs not appearing in production

Check:
1. `NODE_ENV=production` is set
2. `logs/` directory exists and is writable
3. Winston is installed: `npm list winston`

### Too many log files

Reduce log levels or adjust rotation settings in `/src/lib/logger.ts`:

```typescript
maxsize: 5242880, // 5MB
maxFiles: 3,
```

### Client-side localStorage full

Old errors are auto-cleaned after 7 days. Force cleanup:

```typescript
logger.clearStoredErrors();
```

## Summary

- Replace **all** `console.*` statements with `logger.*` methods
- Use **specialized loggers** for better semantics
- Include **context** with every log
- Use **request logger** for API routes
- Configure **external monitoring** for production
- Let the system handle **log rotation** and **cleanup**

For questions or issues, refer to `/src/lib/logger.ts` implementation.
