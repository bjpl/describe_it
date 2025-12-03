# Logger Consolidation Plan

## Architecture Analysis

### Current Logger Implementations

#### 1. **src/lib/logger.ts** (Main - 692 lines)
**Features:**
- Winston-based with Edge Runtime support
- Comprehensive logging levels (error, warn, info, http, verbose, debug, silly)
- Request context tracking
- Performance metrics
- Client-side localStorage error tracking
- External monitoring integration (Sentry, webhooks)
- Specialized loggers: API, auth, database, security, performance
- Specialized methods: apiRequest, apiResponse, security, auth, database, performance
- NextRequest integration
- Environment-aware (dev/prod formatting)

#### 2. **src/lib/logging/logger.ts** (Logging Module - 325 lines)
**Features:**
- Winston-based with fallback SimpleLogger
- Basic logging levels (error, warn, info, debug, http)
- Request metadata support
- API request/response logging
- Security event logging
- Performance metric logging
- Specialized loggers: apiLogger, authLogger, dbLogger, securityLogger, performanceLogger

#### 3. **src/lib/logging/logger-helpers.ts** (Helpers - 432 lines)
**Features:**
- Scoped logger creation (component, API route, React component)
- Function wrapping with automatic logging (withLogging)
- Performance measurement (logPerformance)
- Error boundaries (withErrorBoundary)
- User action tracking
- Request logging with start/end
- Database operation logging
- Batch operation logging
- Development-only logging (devOnly)
- Test-safe logging

#### 4. **src/lib/monitoring/logger.ts** (Monitoring - 331 lines)
**Features:**
- StructuredLogger singleton pattern
- Performance metrics (memory, CPU)
- Error categorization
- Security event logging
- Business event logging
- Request tracing
- In-memory log storage (last 1000 entries)
- External tracking integration
- Analytics support

---

## Unified Logger Architecture

### Design Principles
1. **Single Source of Truth**: One logger implementation
2. **Feature Complete**: Combine all unique features
3. **Backwards Compatible**: Maintain existing exports
4. **Performance**: Efficient with minimal overhead
5. **Type Safe**: Strong TypeScript typing

### Consolidated Feature Matrix

| Feature | Main | Logging | Helpers | Monitoring | Unified |
|---------|------|---------|---------|------------|---------|
| Winston Integration | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edge Runtime Support | ✓ | ✗ | ✗ | ✗ | ✓ |
| Request Context | ✓ | ✓ | ✗ | ✓ | ✓ |
| Performance Metrics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Error Categorization | ✓ | ✗ | ✗ | ✓ | ✓ |
| Client Storage | ✓ | ✗ | ✗ | ✗ | ✓ |
| External Monitoring | ✓ | ✗ | ✗ | ✓ | ✓ |
| Specialized Loggers | ✓ | ✓ | ✗ | ✗ | ✓ |
| Function Wrapping | ✗ | ✗ | ✓ | ✗ | ✓ |
| Error Boundaries | ✗ | ✗ | ✓ | ✗ | ✓ |
| Batch Logging | ✗ | ✗ | ✓ | ✗ | ✓ |
| In-Memory Storage | ✗ | ✗ | ✗ | ✓ | ✓ |
| Memory/CPU Metrics | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Implementation Strategy

### Phase 1: Core Consolidation
**Location**: `src/lib/logger.ts` (already the most comprehensive)

**Actions**:
1. Add missing features from other loggers:
   - Function wrapping utilities (from logger-helpers)
   - Error boundaries (from logger-helpers)
   - Batch logging (from logger-helpers)
   - In-memory storage for analytics (from monitoring logger)
   - Memory/CPU metrics (from monitoring logger)

2. Create unified exports:
   - All existing exports from main logger
   - Helper functions from logger-helpers
   - Monitoring utilities

### Phase 2: Deprecation Layer
**Create re-export files** that import from unified logger:

1. **src/lib/logging/logger.ts** → Import and re-export from `@/lib/logger`
2. **src/lib/logging/logger-helpers.ts** → Import and re-export from `@/lib/logger`
3. **src/lib/monitoring/logger.ts** → Import and re-export from `@/lib/logger`

Add deprecation warnings in each file.

### Phase 3: Import Updates
**Update all imports across codebase** (210 files found):
- Replace imports from deprecated paths
- Use unified logger path: `@/lib/logger`

---

## Unified Logger Interface

```typescript
// Core Logger Class
class Logger {
  // Basic Logging
  error(message: string, error?: Error, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  debug(message: string, context?: LogContext): void
  http(message: string, context?: LogContext): void
  verbose(message: string, context?: LogContext): void

  // Specialized Logging
  apiRequest(method: string, url: string, context?: LogContext): void
  apiResponse(method: string, url: string, status: number, duration?: number, context?: LogContext): void
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void
  auth(event: string, success: boolean, context?: LogContext): void
  database(operation: string, duration?: number, context?: LogContext): void
  performance(operation: string, duration: number, context?: LogContext): void
  userAction(action: string, context?: LogContext): void

  // Request Context
  setRequest(meta: LogContext): this
  clearRequest(): this
  extractRequestContext(request: NextRequest): LogContext
  generateRequestId(): string

  // Client-Side Utilities
  getStoredErrors(): any[]
  clearStoredErrors(): void
}

// Helper Functions
export function createLogger(context: string): Logger
export function createRequestLogger(context: string, request?: NextRequest): Logger
export function createScopedLogger(component: string): Logger
export function createApiLogger(routeName: string): Logger
export function createComponentLogger(componentName: string): Logger

// Utility Wrappers
export function withLogging<T>(fn: T, fnName: string, context?: LogContext): T
export function logPerformance<T>(label: string, fn: () => T, threshold?: number, context?: LogContext): Promise<T>
export function withErrorBoundary<T>(fn: () => T, fallback: T, context?: LogContext): Promise<T>
export function batchLog(batchName: string, operations: Array<{name: string; fn: () => any}>, context?: LogContext): Promise<void>

// Specialized Utilities
export function trackUserAction(action: string, userId: string, metadata?: Record<string, any>): void
export function createRequestLogger(method: string, url: string): RequestLogger
export function createDatabaseLogger(operation: string, table: string): DatabaseLogger

// Development Utilities
export function devOnly(message: string, data?: any): void
export function testSafeLog(message: string, context?: LogContext): void
export function devLog(message: string, ...args: any[]): void
export function devWarn(message: string, context?: LogContext): void
export function devError(message: string, error?: Error, context?: LogContext): void

// Specialized Logger Instances
export const logger: Logger
export const apiLogger: Logger
export const authLogger: Logger
export const dbLogger: Logger
export const securityLogger: Logger
export const performanceLogger: Logger

// Convenience Functions
export function logError(message: string, error?: Error, context?: LogContext): void
export function logWarn(message: string, context?: LogContext): void
export function logInfo(message: string, context?: LogContext): void
export function logDebug(message: string, context?: LogContext): void
export function logApiCall(method: string, url: string, context?: LogContext): void
export function logApiResponse(method: string, url: string, status: number, duration?: number, context?: LogContext): void
export function logPerformance(operation: string, duration: number, context?: LogContext): void
export function logUserAction(action: string, context?: LogContext): void

// Monitoring Extensions
export interface PerformanceMetrics {
  responseTime: number
  memoryUsage?: MemoryUsage
  cpuUsage?: CPUUsage
  requestSize?: number
  responseSize?: number
}

export function getMemoryMetrics(): MemoryUsage | undefined
export function getCPUMetrics(): CPUUsage | undefined
export function getRecentLogs(count?: number): any[]
export function clearLogs(): void

// Default Export
export default logger
```

---

## Backwards Compatibility

### Deprecation Notices
Each deprecated file will include:
```typescript
/**
 * @deprecated This logger module has been consolidated into @/lib/logger
 * Please update your imports to use @/lib/logger instead
 * This file will be removed in version 3.0.0
 */
```

### Re-export Pattern
```typescript
// src/lib/logging/logger.ts
import {
  Logger,
  createLogger,
  apiLogger,
  authLogger,
  // ... all exports
} from '@/lib/logger';

// Re-export everything for backwards compatibility
export {
  Logger,
  createLogger,
  apiLogger,
  authLogger,
  // ... all exports
};

// Add deprecation warning
if (process.env.NODE_ENV === 'development') {
  console.warn(
    'Warning: Importing from @/lib/logging/logger is deprecated. ' +
    'Please update to @/lib/logger. This path will be removed in v3.0.0'
  );
}
```

---

## Migration Checklist

### Phase 1: Core Implementation
- [ ] Add function wrapping utilities to main logger
- [ ] Add error boundary utilities
- [ ] Add batch logging support
- [ ] Add in-memory log storage
- [ ] Add memory/CPU metrics
- [ ] Add all helper function exports
- [ ] Update TypeScript types
- [ ] Add comprehensive JSDoc comments

### Phase 2: Deprecation Layer
- [ ] Create re-export in `src/lib/logging/logger.ts`
- [ ] Create re-export in `src/lib/logging/logger-helpers.ts`
- [ ] Create re-export in `src/lib/monitoring/logger.ts`
- [ ] Add deprecation warnings

### Phase 3: Codebase Updates
- [ ] Update imports in API routes (60+ files)
- [ ] Update imports in hooks (30+ files)
- [ ] Update imports in lib utilities (50+ files)
- [ ] Update imports in services (40+ files)
- [ ] Update imports in middleware (20+ files)
- [ ] Update imports in tests (10+ files)

### Phase 4: Testing
- [ ] Test all logging levels
- [ ] Test Edge Runtime compatibility
- [ ] Test client-side error storage
- [ ] Test performance metrics
- [ ] Test external monitoring integration
- [ ] Test function wrapping
- [ ] Test error boundaries
- [ ] Test batch logging
- [ ] Run full test suite

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Update migration guide
- [ ] Update README
- [ ] Add CHANGELOG entry

---

## Files Requiring Import Updates (210 total)

### High Priority API Routes (60 files)
- Vector API endpoints (10 files)
- Auth endpoints (5 files)
- Vocabulary endpoints (10 files)
- Analytics endpoints (8 files)
- Progress tracking (7 files)
- Settings endpoints (5 files)
- Search endpoints (5 files)
- Other API routes (10 files)

### Hooks (30 files)
- useDescriptions, useQASystem, useProgressTracking
- useErrorHandler, useErrorReporting
- usePerformanceMonitor, usePerformanceOptimizations
- useVocabulary, useImageSearch
- Other custom hooks

### Library Utilities (50 files)
- Vector services (6 files)
- API clients (10 files)
- Storage managers (8 files)
- Security modules (8 files)
- Services (10 files)
- Utilities (8 files)

### Services (40 files)
- Vocabulary services (5 files)
- Translation services (3 files)
- Export services (5 files)
- Database services (3 files)
- Other services (24 files)

### Middleware & Security (20 files)
- Auth middleware (5 files)
- Rate limiting (4 files)
- Error middleware (3 files)
- Security modules (5 files)
- Monitoring (3 files)

### Tests (10 files)
- Logging tests (5 files)
- Integration tests (3 files)
- Unit tests (2 files)

---

## Timeline Estimate

- **Phase 1**: 4-6 hours (core implementation)
- **Phase 2**: 2 hours (deprecation layer)
- **Phase 3**: 8-10 hours (codebase updates)
- **Phase 4**: 4 hours (testing)
- **Phase 5**: 2 hours (documentation)

**Total**: 20-24 hours

---

## Risk Mitigation

1. **Breaking Changes**: Deprecation layer maintains full backwards compatibility
2. **Runtime Errors**: Comprehensive testing before rollout
3. **Performance Impact**: Minimal - consolidation removes redundancy
4. **Edge Cases**: Maintain all existing behavior patterns

---

## Success Criteria

1. ✅ Single logger file with all features
2. ✅ Zero breaking changes for existing code
3. ✅ All tests passing
4. ✅ Improved performance (less code duplication)
5. ✅ Better maintainability
6. ✅ Clear migration path documented
