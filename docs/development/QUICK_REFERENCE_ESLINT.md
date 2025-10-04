# ESLint Console Prevention - Quick Reference

## Check for Console Statements

```bash
# Check all source files
npm run lint:no-console

# Check specific file
npx eslint src/path/to/file.ts

# Check specific directory
npx eslint src/components
```

## Auto-Fix Console Statements

```bash
# Fix all auto-fixable issues
npm run lint:fix

# Fix specific file
npx eslint --fix src/path/to/file.ts

# Fix specific directory
npx eslint --fix src/components
```

## Migration Guide

### Replace Console Calls

```typescript
// ❌ BEFORE
console.log('Message');
console.info('Info');
console.warn('Warning');
console.error('Error');
console.debug('Debug');

// ✅ AFTER
import { logger } from '@/lib/logger';

logger.info('Message');
logger.info('Info');
logger.warn('Warning');
logger.error('Error');
logger.debug('Debug');
```

### Add Context Data

```typescript
// ❌ BEFORE
console.log('User action', userId, action);

// ✅ AFTER
logger.info('User action', { userId, action });
```

### Error Logging

```typescript
// ❌ BEFORE
console.error('Failed', error);

// ✅ AFTER
logger.error('Failed to fetch data', { 
  error,
  context: 'additional info' 
});
```

## Rule Exceptions

### Allowed Locations

- `scripts/**/*.js` - Build scripts
- `**/*.test.ts` - Test files
- `tests/**/*` - Test directories

### Add Exception (Rare)

```typescript
/* eslint-disable no-console -- Justification required */
console.error('CRITICAL: App failed to start');
/* eslint-enable no-console */
```

## Pre-Commit

Automatically checks for console on every commit:

```bash
git add .
git commit -m "Add feature"
# ESLint runs automatically
# Commit blocked if console found
```

## Common Issues

### Issue: "Cannot find logger"

```typescript
// Add import at top of file
import { logger } from '@/lib/logger';
// or
import { logger } from '@/lib/monitoring/logger';
```

### Issue: "Auto-fix didn't work"

Some patterns can't be auto-fixed. Manually convert:

```typescript
// Complex pattern - manual fix needed
console.log('Status:', status, 'User:', user.name);

// Manual fix:
logger.info('Status update', { 
  status, 
  userName: user.name 
});
```

## Testing Configuration

```bash
# Test detection
echo "console.log('test')" > src/test-console.ts
npm run lint:no-console
# Should show error

# Test exception
echo "console.log('test')" > scripts/test.js
npx eslint scripts/test.js
# Should NOT show error

# Clean up
rm src/test-console.ts scripts/test.js
```

## Full Documentation

- [Detailed Guide](/docs/development/ESLINT_CONSOLE_RULE.md)
- [Setup Summary](/docs/development/ESLINT_SETUP_SUMMARY.md)
- [Logger API](/docs/development/LOGGER_API.md)

---

**Quick tip**: Run `npm run lint:fix` first, then manually review any remaining issues.
