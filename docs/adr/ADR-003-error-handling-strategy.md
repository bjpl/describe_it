# ADR-003: Error Handling Strategy

## Date
2025-01-28

## Status
Accepted

## Context

The application had inconsistent error handling across components:

1. **Inconsistent Error Presentation**:
   - Some components used `alert()`
   - Others used `console.error()`
   - Some showed inline error messages
   - No consistent user experience

2. **Poor Error Information**:
   - Generic error messages that didn't help users
   - No error codes for debugging
   - Lost error context during propagation
   - Difficult to trace error origins

3. **Inconsistent Error Recovery**:
   - Some errors caused component crashes
   - Others were silently swallowed
   - No graceful degradation strategy
   - Users left confused about what happened

4. **Debugging Challenges**:
   - Hard to track error sources in production
   - No structured error logging
   - Missing error metadata
   - Difficult to reproduce issues

## Decision

We implemented a comprehensive error handling strategy with three main components:

### 1. AppError Class
```typescript
class AppError extends Error {
  code: ErrorCode;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
```

A custom error class that includes:
- Structured error codes for categorization
- Metadata for additional context
- Timestamps for debugging
- Original error preservation

### 2. ErrorCode Enum
```typescript
enum ErrorCode {
  STORAGE_LOAD_FAILED = 'STORAGE_LOAD_FAILED',
  STORAGE_SAVE_FAILED = 'STORAGE_SAVE_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  // ... more codes
}
```

Standardized error codes for:
- Storage operations
- Validation failures
- Extraction errors
- API failures
- General application errors

### 3. useErrorHandler Hook
```typescript
const useErrorHandler = () => {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = (error: Error | AppError) => {
    // Log to console
    // Display user-friendly message
    // Store in state for UI
    // Optional: Send to error tracking service
  };

  return { error, handleError, clearError };
};
```

A React hook for:
- Consistent error display
- Error state management
- User-friendly error messages
- Optional error tracking integration

## Consequences

### Positive
- **Consistent User Experience**: All errors displayed uniformly across the application
- **Better Debugging**: Error codes and metadata make issues easier to track
- **Graceful Degradation**: Components handle errors without crashing
- **Improved Maintainability**: Centralized error handling logic
- **Production Readiness**: Structured errors can be sent to monitoring services
- **Developer Experience**: Clear error context during development
- **Type Safety**: TypeScript ensures correct error handling patterns

### Negative
- **Initial Setup Overhead**: Required refactoring existing error handling
- **Learning Curve**: Developers need to learn new error handling patterns
- **Code Verbosity**: More code needed compared to simple try-catch
- **Maintenance**: Need to keep ErrorCode enum updated

### Mitigation Strategies
- Comprehensive documentation with examples
- Error handling guidelines in development documentation
- Code review checklist includes error handling verification
- Helper functions for common error scenarios
- Regular review of error codes to prevent proliferation
- Integration with error tracking services (e.g., Sentry) for production monitoring

### Usage Example
```typescript
import { useErrorHandler, ErrorCode, AppError } from '@/lib/errors';

function MyComponent() {
  const { error, handleError, clearError } = useErrorHandler();

  const saveData = async () => {
    try {
      await storage.save(data);
    } catch (err) {
      handleError(new AppError(
        'Failed to save vocabulary',
        ErrorCode.STORAGE_SAVE_FAILED,
        { vocabularyCount: data.length }
      ));
    }
  };

  return (
    <>
      {error && <ErrorDisplay error={error} onDismiss={clearError} />}
      {/* Component content */}
    </>
  );
}
```
