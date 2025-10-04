# Comprehensive Error Handling System Guide

This guide explains how to use the comprehensive error handling system implemented in this application. The system provides centralized error management, automatic categorization, performance monitoring, and comprehensive logging.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Client-Side Error Handling](#client-side-error-handling)
4. [Server-Side Error Handling](#server-side-error-handling)
5. [Performance Monitoring](#performance-monitoring)
6. [Error Dashboard](#error-dashboard)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

## Overview

The error handling system consists of several integrated components:

- **Centralized Error Handler**: Core error management with categorization and recovery strategies
- **Enhanced Logger**: Structured logging with error context and performance metrics
- **React Error Boundaries**: UI error handling with automatic recovery attempts
- **Server Middleware**: API error handling with proper HTTP status codes
- **Performance Monitor**: Real-time performance tracking and bottleneck detection
- **Error Dashboard**: Visual monitoring and analytics interface
- **React Hooks**: Easy-to-use error reporting utilities

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client-Side                               │
├─────────────────────────────────────────────────────────────┤
│ React Error Boundaries → useErrorReporting Hook             │
│            ↓                        ↓                       │
│ Error Handler ←→ Performance Monitor ←→ Logger              │
│            ↓                                                │
│ Local Storage ←→ Error Dashboard                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ API Calls
┌─────────────────────────────────────────────────────────────┐
│                    Server-Side                               │
├─────────────────────────────────────────────────────────────┤
│ Error Middleware → Logger → Error Handler                    │
│            ↓                                                │
│ Structured Responses ←→ Performance Metrics                 │
└─────────────────────────────────────────────────────────────┘
```

## Client-Side Error Handling

### Error Categories

The system automatically categorizes errors:

- **UI_COMPONENT**: React component errors
- **NETWORK**: Network connectivity issues
- **API**: API request/response errors
- **AUTHENTICATION**: Auth-related errors
- **VALIDATION**: Data validation errors
- **PERFORMANCE**: Performance bottlenecks
- **SECURITY**: Security-related issues
- **BUSINESS_LOGIC**: Application logic errors
- **SYSTEM**: System-level errors

### Error Severities

- **LOW**: Minor issues that don't affect core functionality
- **MEDIUM**: Issues that may impact user experience
- **HIGH**: Significant problems requiring attention
- **CRITICAL**: System-breaking errors requiring immediate action

### Using Error Boundaries

#### Basic Usage

```tsx
import { EnhancedErrorBoundary } from '@/components/ErrorBoundary/EnhancedErrorBoundary';

function MyComponent() {
  return (
    <EnhancedErrorBoundary
      componentName="MyComponent"
      enableRetry={true}
      maxRetries={3}
    >
      <YourComponentContent />
    </EnhancedErrorBoundary>
  );
}
```

#### Specialized Error Boundaries

```tsx
import { 
  PageErrorBoundary, 
  FeatureErrorBoundary, 
  ComponentErrorBoundary 
} from '@/components/ErrorBoundary/EnhancedErrorBoundary';

// Page-level error boundary (no retry, redirects on error)
<PageErrorBoundary pageName="Dashboard">
  <DashboardPage />
</PageErrorBoundary>

// Feature-level error boundary (2 retries max)
<FeatureErrorBoundary featureName="UserProfile" enableRetry={true}>
  <UserProfileForm />
</FeatureErrorBoundary>

// Component-level error boundary (1 retry max)
<ComponentErrorBoundary componentName="DataTable">
  <DataTable data={data} />
</ComponentErrorBoundary>
```

### Using the Error Reporting Hook

```tsx
import { useErrorReporting } from '@/hooks/useErrorReporting';

function MyComponent() {
  const {
    reportError,
    reportValidationError,
    reportNetworkError,
    trackOperation,
    errors,
    notifications,
    clearErrors
  } = useErrorReporting();

  const handleApiCall = async () => {
    try {
      const result = await trackOperation('fetchUserData', async () => {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
      });
      // Handle success
    } catch (error) {
      await reportNetworkError(error, 'fetchUserData');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    // Validation
    if (!formData.email) {
      await reportValidationError('Email is required', 'email', formData.email);
      return;
    }

    // Submit logic...
  };

  return (
    <div>
      {/* Your component JSX */}
      {notifications.map(notification => (
        <div key={notification.id} className="error-notification">
          {notification.userMessage}
        </div>
      ))}
    </div>
  );
}
```

### Performance Monitoring Hook

```tsx
import { usePerformanceMonitor } from '@/hooks/useErrorReporting';

function MyComponent() {
  const { trackOperation, trackAsyncOperation } = usePerformanceMonitor('MyComponent');

  const handleExpensiveOperation = async () => {
    return await trackOperation('expensiveCalculation', async () => {
      // Your expensive operation
      return performComplexCalculation();
    });
  };

  const handleAsyncTask = () => {
    const tracker = trackAsyncOperation('backgroundTask');
    
    performBackgroundTask()
      .then(() => tracker.finish(true))
      .catch(() => tracker.finish(false));
  };

  return <div>{/* Component content */}</div>;
}
```

## Server-Side Error Handling

### Using Error Middleware

```typescript
// /app/api/example/route.ts
import { withErrorHandling, ValidationError, AuthenticationError } from '@/lib/middleware/errorMiddleware';

async function handler(request: NextRequest) {
  // Validate request
  const body = await request.json();
  if (!body.email) {
    throw new ValidationError('Email is required', 'email');
  }

  // Check authentication
  const token = request.headers.get('authorization');
  if (!token) {
    throw new AuthenticationError('Authentication token required');
  }

  // Your API logic here...
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandling(handler);
```

### Custom Error Types

```typescript
import { 
  ValidationError,
  AuthenticationError,
  DatabaseError,
  ExternalServiceError
} from '@/lib/middleware/errorMiddleware';

// Usage examples
throw new ValidationError('Invalid email format', 'email', 'not-an-email');
throw new AuthenticationError('Token expired');
throw new DatabaseError('Failed to save user', 'INSERT');
throw new ExternalServiceError('Payment service unavailable', 'PaymentAPI', 503);
```

### Manual Error Logging

```typescript
import { logger } from '@/lib/logger';

// Different log levels
logger.debug('Debug information', { userId, context });
logger.info('User logged in', { userId, timestamp });
logger.warn('Unusual activity detected', { userId, activity });
logger.error('Critical error occurred', error, { userId, operation });

// Specialized logging methods
logger.networkError('API call failed', error, { url, method });
logger.databaseError('Query failed', error, { query, table });
logger.authError('Invalid credentials', { userId, attempt });
logger.validationError('Invalid input', { field, value });
logger.securityError('Suspicious activity', { ip, userAgent });
```

## Performance Monitoring

### Automatic Monitoring

The performance monitor automatically tracks:

- **Web Vitals**: LCP, FID, CLS
- **Resource Loading**: API calls, assets
- **Component Renders**: React component performance
- **User Interactions**: Click, input response times
- **Memory Usage**: JavaScript heap usage

### Manual Performance Tracking

```typescript
import { performanceMonitor, trackApiCall, trackComponentRender } from '@/lib/monitoring/performanceMonitor';

// Track API calls
const apiTracker = trackApiCall('/api/users', 'GET');
try {
  const response = await fetch('/api/users');
  apiTracker.finish(response.status);
} catch (error) {
  apiTracker.finish(500, error);
}

// Track component renders
const renderTracker = trackComponentRender('UserList');
// ... render logic ...
renderTracker.finish();

// Custom metrics
performanceMonitor.addMetric({
  type: MetricType.CUSTOM,
  name: 'custom-operation',
  value: 150,
  unit: 'ms',
  metadata: { operation: 'dataProcessing' }
});
```

## Error Dashboard

### Opening the Dashboard

```tsx
import ErrorDashboard from '@/components/Monitoring/ErrorDashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div>
      {/* Your app content */}
      <button onClick={() => setShowDashboard(true)}>
        Open Error Dashboard
      </button>
      
      <ErrorDashboard 
        isOpen={showDashboard} 
        onClose={() => setShowDashboard(false)} 
      />
    </div>
  );
}
```

### Dashboard Features

- **Error Statistics**: Total errors, error rate, categorization
- **Performance Metrics**: Load times, slow operations, memory usage
- **Real-time Updates**: Configurable refresh intervals
- **Data Export**: JSON export of error and performance data
- **Recommendations**: Automated performance improvement suggestions

## Usage Examples

### Example 1: Form with Validation and Error Handling

```tsx
import { useErrorReporting } from '@/hooks/useErrorReporting';
import { ComponentErrorBoundary } from '@/components/ErrorBoundary/EnhancedErrorBoundary';

function UserForm() {
  const { reportValidationError, reportError, trackOperation } = useErrorReporting();
  const [formData, setFormData] = useState({ email: '', name: '' });

  const validateForm = async (data: typeof formData) => {
    const errors: string[] = [];
    
    if (!data.email) {
      await reportValidationError('Email is required', 'email');
      errors.push('email');
    }
    
    if (!data.name) {
      await reportValidationError('Name is required', 'name');
      errors.push('name');
    }
    
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const isValid = await validateForm(formData);
      if (!isValid) return;

      await trackOperation('submitUserForm', async () => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
        
        return response.json();
      });
      
      // Success handling
    } catch (error) {
      await reportError(error as Error, {
        operation: 'submitUserForm',
        formData: { ...formData, password: '[REDACTED]' }
      });
    }
  };

  return (
    <ComponentErrorBoundary componentName="UserForm">
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
        />
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Name"
        />
        <button type="submit">Submit</button>
      </form>
    </ComponentErrorBoundary>
  );
}
```

### Example 2: API Route with Comprehensive Error Handling

```typescript
// /app/api/users/route.ts
import { withErrorHandling, ValidationError, DatabaseError } from '@/lib/middleware/errorMiddleware';
import { logger } from '@/lib/logger';

async function createUser(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request
    const body = await request.json();
    const { email, name, age } = body;

    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email is required', 'email', email);
    }

    if (!name || name.length < 2) {
      throw new ValidationError('Name must be at least 2 characters', 'name', name);
    }

    if (age && (age < 0 || age > 150)) {
      throw new ValidationError('Age must be between 0 and 150', 'age', age);
    }

    // Simulate database operation
    logger.info('Creating new user', { email, name });
    
    try {
      // Your database logic here
      const user = await database.users.create({ email, name, age });
      
      logger.info('User created successfully', {
        userId: user.id,
        email,
        processingTime: Date.now() - startTime
      });
      
      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
        meta: {
          processingTime: Date.now() - startTime
        }
      });
      
    } catch (dbError) {
      throw new DatabaseError('Failed to create user', 'INSERT');
    }
    
  } catch (error) {
    logger.error('Failed to create user', error as Error, {
      processingTime: Date.now() - startTime,
      requestBody: body
    });
    throw error;
  }
}

export const POST = withErrorHandling(createUser);
```

### Example 3: Component with Performance Monitoring

```tsx
import { usePerformanceMonitor } from '@/hooks/useErrorReporting';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary/EnhancedErrorBoundary';

function DataVisualization({ data }: { data: any[] }) {
  const { trackOperation } = usePerformanceMonitor('DataVisualization');
  const [processedData, setProcessedData] = useState(null);

  useEffect(() => {
    trackOperation('processChartData', async () => {
      // Simulate expensive data processing
      const processed = await processDataForChart(data);
      setProcessedData(processed);
    });
  }, [data, trackOperation]);

  const handleUserInteraction = async (interactionType: string) => {
    await trackOperation(`user-${interactionType}`, async () => {
      // Handle user interaction
      await handleChartInteraction(interactionType);
    });
  };

  return (
    <FeatureErrorBoundary featureName="DataVisualization">
      <div>
        {processedData ? (
          <Chart 
            data={processedData}
            onInteraction={handleUserInteraction}
          />
        ) : (
          <div>Processing data...</div>
        )}
      </div>
    </FeatureErrorBoundary>
  );
}
```

## Best Practices

### 1. Error Boundaries Placement

- Place page-level error boundaries around route components
- Use feature-level error boundaries for complex features
- Add component-level error boundaries for critical components
- Don't over-wrap with error boundaries - find the right granularity

### 2. Error Reporting

- Always provide context when reporting errors
- Use appropriate error categories and severities
- Don't log sensitive information (passwords, tokens)
- Report errors as close to the source as possible

### 3. Performance Monitoring

- Track critical user paths and API calls
- Set appropriate performance thresholds
- Monitor memory usage in long-running components
- Use performance data to identify optimization opportunities

### 4. Server-Side Error Handling

- Use specific error types (ValidationError, AuthenticationError, etc.)
- Always provide user-friendly error messages in production
- Log detailed error information for debugging
- Set appropriate HTTP status codes

### 5. Error Dashboard Usage

- Regularly review error patterns and trends
- Set up alerts for critical error rates
- Use performance recommendations to optimize your application
- Export error data for further analysis

## Configuration

### Error Handler Configuration

```typescript
import { ErrorHandler } from '@/lib/errorHandler';

const customErrorHandler = new ErrorHandler({
  enableReporting: true,
  enablePerformanceTracking: true,
  maxErrorsPerSession: 100,
  retryAttempts: 3,
  retryDelay: 1000,
  enableNotifications: true,
  enableLocalStorage: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  productionMode: process.env.NODE_ENV === 'production'
});
```

### Performance Monitor Configuration

```typescript
import { PerformanceMonitor } from '@/lib/monitoring/performanceMonitor';

const performanceMonitor = new PerformanceMonitor({
  enabled: true,
  maxMetrics: 1000,
  enableWebVitals: true,
  enableResourceTiming: true,
  enableUserTiming: true,
  enableMemoryMonitoring: true,
  thresholds: {
    API_CALL: { warning: 1000, error: 3000 },
    COMPONENT_RENDER: { warning: 16, error: 50 },
    USER_INTERACTION: { warning: 100, error: 300 },
    NAVIGATION: { warning: 2000, error: 5000 },
  }
});
```

### Logger Configuration

```typescript
import { logger } from '@/lib/logger';

// Configure logger behavior
logger.clearOldLogs(7); // Keep logs for 7 days
const errors = logger.getStoredErrors(); // Get all stored errors
const perfMetrics = logger.getStoredPerformanceMetrics(); // Get performance data
```

## Troubleshooting

### Common Issues

1. **Error boundaries not catching errors**
   - Ensure error boundaries are placed correctly in the component tree
   - Check that errors are thrown during render, not in event handlers
   - Use the `reportError` hook for event handler errors

2. **Performance metrics not appearing**
   - Verify that performance monitoring is enabled
   - Check browser compatibility for Performance Observer API
   - Ensure operations are taking long enough to be measurable

3. **Server errors not being logged**
   - Make sure API routes are wrapped with `withErrorHandling`
   - Check that error middleware is properly imported
   - Verify logger configuration is correct

4. **High memory usage warnings**
   - Check for memory leaks in components
   - Clean up event listeners and intervals
   - Monitor component lifecycle and cleanup

### Debug Mode

Enable debug mode for additional logging:

```typescript
// Set environment variable
process.env.ERROR_DEBUG = 'true';

// Or configure logger directly
logger.debug('Debug message', { context: 'troubleshooting' });
```

### Error Dashboard Not Loading

1. Check that all required components are properly imported
2. Verify that the error reporting hook is initialized
3. Ensure performance monitor is running
4. Check browser console for any setup errors

## Integration with External Services

### Sentry Integration

```typescript
// Add to your error reporter
import * as Sentry from '@sentry/nextjs';

export class SentryErrorReporter implements ErrorReporter {
  async report(error: AppError): Promise<void> {
    Sentry.captureException(error, {
      tags: {
        category: error.category,
        severity: error.severity,
      },
      extra: {
        errorId: error.id,
        context: error.context,
      },
    });
  }

  async reportBatch(errors: AppError[]): Promise<void> {
    errors.forEach(error => this.report(error));
  }
}

// Register the reporter
errorHandler.addReporter(new SentryErrorReporter());
```

### LogRocket Integration

```typescript
import LogRocket from 'logrocket';

export class LogRocketErrorReporter implements ErrorReporter {
  async report(error: AppError): Promise<void> {
    LogRocket.captureException(error);
    LogRocket.track('Error Reported', {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
    });
  }
}
```

This comprehensive error handling system provides robust error management, performance monitoring, and debugging capabilities for your Next.js application. Use the examples and best practices above to integrate it effectively into your codebase.