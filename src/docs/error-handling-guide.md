# Error Handling System - Usage Guide

## Overview

The describe_it project now uses a unified error handling system that provides consistent error handling with toast notifications and structured logging throughout the application.

## Core Components

### 1. Error Classes and Codes (`src/lib/errors/index.ts`)

**AppError Class**: Extended Error with structured information
- `code`: ErrorCode enum value
- `severity`: ErrorSeverity (LOW, MEDIUM, HIGH, CRITICAL)
- `context`: Additional contextual information
- `isRecoverable`: Boolean indicating if user can retry
- `getUserMessage()`: Returns user-friendly error message

**ErrorCode Enum**: Categorizes errors
```typescript
import { ErrorCode } from '@/lib/errors';

ErrorCode.NETWORK_ERROR
ErrorCode.API_ERROR
ErrorCode.VALIDATION_ERROR
ErrorCode.AUTH_ERROR
ErrorCode.STORAGE_ERROR
ErrorCode.OPERATION_FAILED
ErrorCode.SYSTEM_ERROR
// ... and more
```

### 2. Error Handler Hook (`src/hooks/useErrorHandler.ts`)

The `useErrorHandler` hook provides methods for handling errors with automatic toast notifications and logging.

## Usage Examples

### Basic Error Handling

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, showSuccess, showError } = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await saveData();
      showSuccess('Data saved successfully!');
    } catch (error) {
      handleError(error, {
        toastTitle: 'Save Failed',
        context: { operation: 'saveData' }
      });
    }
  };
}
```

### Custom Error Messages

```typescript
const { handleError } = useErrorHandler();

try {
  await deleteItem(id);
} catch (error) {
  handleError(error, {
    toastTitle: 'Delete Failed',
    toastMessage: 'Could not delete the item. Please try again.',
    context: { itemId: id }
  });
}
```

### Validation Errors

```typescript
const { showError } = useErrorHandler();

const validateForm = (data) => {
  if (!data.name) {
    showError('Name is required', 'Validation Error');
    return false;
  }
  return true;
};
```

### Async Operation with Error Handling

```typescript
import { useAsyncErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { wrapAsync } = useAsyncErrorHandler();

  // Automatically catches and handles errors
  const handleExport = wrapAsync(
    async () => {
      await exportData();
    },
    {
      toastTitle: 'Export Failed',
      context: { operation: 'export' }
    }
  );

  return <button onClick={handleExport}>Export</button>;
}
```

### Creating Custom AppErrors

```typescript
import { AppError, ErrorCode, ErrorSeverity } from '@/lib/errors';

throw new AppError(
  ErrorCode.VALIDATION_ERROR,
  'Invalid email format',
  {
    severity: ErrorSeverity.MEDIUM,
    context: { field: 'email', value: userInput },
    isRecoverable: true
  }
);
```

### Converting Unknown Errors

```typescript
import { normalizeError, getErrorMessage } from '@/lib/errors';

try {
  // Some operation
} catch (error) {
  const appError = normalizeError(error, { operation: 'myOperation' });
  console.log(appError.code); // ErrorCode
  console.log(appError.getUserMessage()); // User-friendly message
}
```

## Hook API Reference

### useErrorHandler()

Returns:
```typescript
{
  handleError: (error: unknown, options?: ErrorHandlerOptions) => AppError;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
  clearErrors: () => void;
}
```

**ErrorHandlerOptions**:
```typescript
{
  showToast?: boolean;           // Show toast notification (default: true)
  toastTitle?: string;           // Custom toast title
  toastMessage?: string;         // Custom message (overrides error message)
  toastDuration?: number;        // Auto-dismiss time in ms (0 = no dismiss)
  logError?: boolean;            // Log to console/logger (default: true)
  context?: Record<string, any>; // Additional context for logging
  onError?: (error: AppError) => void; // Callback after handling
  rethrow?: boolean;             // Rethrow after handling (default: false)
}
```

### useAsyncErrorHandler()

Returns:
```typescript
{
  wrapAsync: <T>(fn: T, options?: ErrorHandlerOptions) => T;
  handleError: (error: unknown, options?: ErrorHandlerOptions) => AppError;
}
```

## Error Severity Levels

Severity determines toast type and auto-dismiss behavior:

- **CRITICAL**: Red error toast, never auto-dismisses
- **HIGH**: Red error toast, never auto-dismisses
- **MEDIUM**: Yellow warning toast, dismisses after 5s
- **LOW**: Blue info toast, dismisses after 3s

## Toast Integration

The error handler integrates with the existing Toast system (`src/components/ui/Toast.tsx`):

- Errors are automatically converted to appropriate toast types
- Critical/High severity errors don't auto-dismiss
- All error toasts include a close button
- Toast messages are user-friendly (technical details logged separately)

## Migration from alert() and console.error()

**Before**:
```typescript
try {
  await operation();
  alert('Success!');
} catch (error) {
  console.error('Operation failed:', error);
  alert('Error: Operation failed');
}
```

**After**:
```typescript
const { handleError, showSuccess } = useErrorHandler();

try {
  await operation();
  showSuccess('Success!');
} catch (error) {
  handleError(error, {
    toastTitle: 'Operation Failed',
    context: { operation: 'myOperation' }
  });
}
```

## Best Practices

1. **Always provide context**: Include operation name, IDs, and relevant data
2. **Use appropriate error codes**: Choose the most specific ErrorCode
3. **Let the system handle severity**: Don't override unless necessary
4. **Don't use alert()**: Use showError/showWarning/showInfo instead
5. **Log errors properly**: The system logs automatically, but add context
6. **User-friendly messages**: Override default messages when needed
7. **Handle validation early**: Use showError for immediate feedback

## Component Integration Example

```typescript
'use client';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorCode } from '@/lib/errors';

export default function ExampleComponent() {
  const { handleError, showSuccess, showWarning } = useErrorHandler();

  const handleSave = async (data: any) => {
    // Validation
    if (!data.name) {
      showWarning('Please enter a name', 'Validation Required');
      return;
    }

    try {
      await saveToAPI(data);
      showSuccess('Saved successfully!');
    } catch (error) {
      handleError(error, {
        toastTitle: 'Save Failed',
        context: {
          operation: 'handleSave',
          dataType: 'example',
          userId: currentUser?.id
        }
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      await deleteFromAPI(id);
      showSuccess('Deleted successfully!');
    } catch (error) {
      handleError(error, {
        toastTitle: 'Delete Failed',
        toastMessage: 'Could not delete this item. It may be in use.',
        context: { operation: 'handleDelete', id }
      });
    }
  };

  return (
    <div>
      <button onClick={() => handleSave(data)}>Save</button>
      <button onClick={() => handleDelete(id)}>Delete</button>
    </div>
  );
}
```

## Testing

The error handling system integrates with the existing logger and toast systems, making it easy to test:

```typescript
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/Toast';

test('shows error toast on failure', async () => {
  render(
    <ToastProvider>
      <MyComponent />
    </ToastProvider>
  );

  // Trigger error...
  // Check for toast notification
  expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
});
```

## Further Expansion

This foundation can be expanded with:
- Sentry integration for production error tracking
- Error boundary integration
- Retry mechanisms for recoverable errors
- Error analytics and reporting
- Custom error codes per feature area
- Internationalized error messages
