# ESLint Console Rule - Logger Enforcement

## Overview

This document explains the ESLint configuration that prevents the use of `console.*` statements in production code and enforces the use of the application's structured logger.

## Why Console is Blocked

### Problems with Console Statements

1. **No Structured Logging**: Console statements produce unstructured text that's difficult to parse, search, and analyze
2. **No Log Levels**: All console output is treated equally - no distinction between debug, info, warn, error
3. **No Context**: Console logs lack correlation IDs, request IDs, user context, and other metadata
4. **Performance Issues**: Console operations can block the event loop and impact performance
5. **No Central Management**: Cannot control log levels, formats, or destinations centrally
6. **Security Risks**: May accidentally log sensitive data without sanitization
7. **Production Problems**: No integration with monitoring tools, log aggregation, or alerting systems

### Benefits of Structured Logger

1. **Structured Data**: JSON-formatted logs that can be easily parsed and analyzed
2. **Log Levels**: Proper severity levels (debug, info, warn, error, critical)
3. **Rich Context**: Automatic inclusion of request IDs, user IDs, timestamps, and custom metadata
4. **Performance**: Asynchronous logging that doesn't block application flow
5. **Centralized Config**: Control log levels and output formats from one place
6. **Security**: Built-in PII sanitization and sensitive data masking
7. **Monitoring Integration**: Works with Sentry, CloudWatch, and other monitoring tools

## ESLint Configuration

### No-Console Rule

The `no-console` rule is enabled project-wide with no exceptions:

```json
{
  "rules": {
    "no-console": ["error", { "allow": [] }]
  }
}
```

### Rule Exceptions

Console statements ARE allowed in:

- **Build Scripts**: `scripts/**/*.js`, `scripts/**/*.cjs`, `scripts/**/*.mjs`
- **Test Files**: `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`
- **Test Directories**: `tests/**/*.ts`, `tests/**/*.tsx`

### Custom Logger Rule

The `custom-rules/require-logger` rule enforces logger usage in source code:

```json
{
  "overrides": [
    {
      "files": ["src/**/*.ts", "src/**/*.tsx"],
      "rules": {
        "custom-rules/require-logger": "error"
      }
    }
  ]
}
```

## How to Use Logger Instead

### Import the Logger

```typescript
// Centralized logger (recommended for most cases)
import { logger } from '@/lib/logger';

// Monitoring logger (for performance and metrics)
import { logger } from '@/lib/monitoring/logger';
```

### Migration Examples

#### Basic Logging

```typescript
// ❌ DON'T: Using console
console.log('User logged in');
console.info('Processing request');

// ✅ DO: Using logger
logger.info('User logged in');
logger.info('Processing request');
```

#### Logging with Data

```typescript
// ❌ DON'T: Console with multiple arguments
console.log('User action', userId, action, timestamp);

// ✅ DO: Logger with structured context
logger.info('User action performed', {
  userId,
  action,
  timestamp
});
```

#### Error Logging

```typescript
// ❌ DON'T: Console.error
console.error('Failed to fetch data', error);

// ✅ DO: Logger with error object
logger.error('Failed to fetch data', { error });

// ✅ BETTER: Include context for debugging
logger.error('API request failed', {
  error,
  endpoint: '/api/users',
  method: 'GET',
  userId: user.id
});
```

#### Warning Messages

```typescript
// ❌ DON'T: Console.warn
console.warn('Rate limit approaching');

// ✅ DO: Logger with context
logger.warn('Rate limit approaching', {
  current: 95,
  limit: 100,
  userId: user.id
});
```

#### Debug Information

```typescript
// ❌ DON'T: Console.debug or console.log
console.debug('Cache hit', cacheKey);

// ✅ DO: Logger debug (controlled by LOG_LEVEL)
logger.debug('Cache hit', { cacheKey, ttl: 300 });
```

### Advanced Logger Features

#### Performance Tracking

```typescript
import { logger } from '@/lib/monitoring/logger';

// Track operation performance
logger.performance('database_query', {
  duration: 125,
  query: 'SELECT * FROM users',
  rowCount: 1500
});
```

#### User Actions

```typescript
// Track user actions with context
logger.info('User updated profile', {
  userId: user.id,
  changes: ['email', 'name'],
  timestamp: new Date().toISOString()
});
```

#### Request Correlation

```typescript
// Logger automatically includes request ID
logger.info('API request completed', {
  endpoint: req.path,
  method: req.method,
  duration: Date.now() - startTime,
  statusCode: res.statusCode
});
```

## Auto-Fix Capabilities

The custom ESLint rule includes auto-fix for common console patterns:

```bash
# Run ESLint with auto-fix
npm run lint:fix

# Fix only console issues
npm run lint:no-console -- --fix
```

### Auto-Fix Examples

```typescript
// Before auto-fix
console.log('Message');
console.error('Error occurred', error);
console.warn('Warning', userId, action);

// After auto-fix
logger.info('Message');
logger.error('Error occurred', { error });
logger.warn('Warning', { data: [userId, action] });
```

## When Exceptions Are Allowed

### Critical Unrecoverable Errors

In extremely rare cases where the application cannot recover and logger may not be available:

```typescript
// Only for critical system failures
try {
  // Application initialization
} catch (error) {
  // Logger may not be initialized yet
  console.error('CRITICAL: Application failed to start', error);
  process.exit(1);
}
```

### Build and Development Scripts

Scripts in the `scripts/` directory can use console:

```javascript
// scripts/deploy.js - OK to use console
console.log('Starting deployment...');
console.log('Environment:', process.env.NODE_ENV);
```

### Test Files

Test files can use console for debugging:

```typescript
// tests/user.test.ts - OK to use console
test('user creation', () => {
  console.log('Test data:', testUser);
  expect(user).toBeDefined();
});
```

## NPM Scripts

### Check for Console Statements

```bash
# Check all source files for console usage
npm run lint:no-console

# Check specific file
npx eslint src/components/MyComponent.tsx --rule 'no-console: error'
```

### Auto-Fix Console Statements

```bash
# Fix all auto-fixable console issues
npm run lint:fix

# Fix specific directory
npx eslint src/components --fix
```

### Pre-Commit Protection

Console statements will be automatically detected and fixed during pre-commit:

```bash
# Triggered automatically by git commit
git commit -m "Add feature"

# Runs:
# 1. prettier --write
# 2. eslint --fix (includes no-console check)
# 3. tsc --noEmit
```

## Troubleshooting

### ESLint Not Detecting Console

1. Check file is in `src/` directory
2. Verify ESLint is configured: `cat .eslintrc.json`
3. Clear ESLint cache: `rm -rf node_modules/.cache/eslint`
4. Run lint manually: `npm run lint:no-console`

### Auto-Fix Not Working

1. Verify ESLint plugin is loaded
2. Check custom rule is registered
3. Try manual fix: `npx eslint --fix src/path/to/file.ts`

### False Positives

If a file legitimately needs console (very rare):

```typescript
// Add ESLint disable comment (requires justification)
/* eslint-disable no-console -- Critical startup error logging */
console.error('FATAL: Unable to initialize application');
/* eslint-enable no-console */
```

## Migration Checklist

- [ ] Remove all `console.log()` statements from `src/`
- [ ] Replace with appropriate logger method (info, warn, error, debug)
- [ ] Add structured context to log statements
- [ ] Test logger output in development
- [ ] Verify logs appear in monitoring dashboard
- [ ] Run `npm run lint:no-console` to verify compliance
- [ ] Update team documentation

## Additional Resources

- [Logger API Documentation](/docs/development/LOGGER_API.md)
- [Structured Logging Guide](/docs/development/STRUCTURED_LOGGING.md)
- [Monitoring Integration](/docs/development/MONITORING.md)
- [ESLint Configuration](/docs/development/ESLINT_SETUP.md)

## Questions?

If you need help migrating from console to logger, or have questions about logging best practices:

1. Check the logger examples in `/src/lib/logger.ts`
2. Review existing logger usage in the codebase
3. Consult the team's development guidelines
4. Open an issue for complex migration scenarios

---

**Remember**: Structured logging is not just about compliance - it's about building maintainable, debuggable, and production-ready applications.
