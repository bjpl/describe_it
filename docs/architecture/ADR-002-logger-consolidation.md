# ADR-002: Logger Consolidation Architecture

**Status:** Proposed
**Date:** 2025-12-02
**Deciders:** System Architect, Implementation Team
**Technical Story:** Remediation Phase 1 - Consolidate duplicate logger implementations

---

## Context and Problem Statement

The codebase currently has **4 separate logger implementations** causing confusion, inconsistent logging patterns, and maintenance overhead:

1. **`/src/lib/monitoring/logger.ts`** (327 lines) - StructuredLogger with request tracing
2. **`/src/lib/api/client-logger.ts`** (107 lines) - ClientLogger with log levels
3. **`/src/lib/logging/sessionLogger.ts`** (740 lines) - SessionLogger for user interactions
4. **`/src/lib/logger.ts`** - Base logger (not examined, but referenced)

**Current Issues:**
- Developers don't know which logger to use
- Inconsistent log formats across the application
- Multiple logger instances consuming memory
- Difficult to trace logs across layers

**Decision Drivers:**
- Maintain existing functionality without breaking changes
- Support both server-side and client-side logging
- Preserve structured logging and request tracing capabilities
- Minimize refactoring across 554 TypeScript files

---

## Decision Outcome

**Chosen option:** "Unified Logger with Specialized Adapters"

### Architecture Design

```
┌────────────────────────────────────────────────────────────┐
│                    Core Logger Module                      │
│              /src/lib/logging/core-logger.ts               │
│                                                            │
│  - Singleton instance with plugin architecture            │
│  - Log level management (DEBUG, INFO, WARN, ERROR, FATAL) │
│  - Transport abstraction (console, file, external)        │
│  - Structured logging with context                        │
└─────────────────────┬──────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
┌─────────▼─────────┐  ┌──────────▼──────────┐
│  Request Adapter  │  │   Session Adapter   │
│  (API Routes)     │  │  (User Tracking)    │
│                   │  │                     │
│  - Request ID     │  │  - Session ID       │
│  - Performance    │  │  - Interactions     │
│  - Error context  │  │  - Learning metrics │
└─────────┬─────────┘  └──────────┬──────────┘
          │                       │
          └───────────┬───────────┘
                      │
           ┌──────────▼──────────┐
           │   Client Adapter    │
           │ (Browser-safe)      │
           │                     │
           │ - No server imports │
           │ - Browser console   │
           │ - API reporting     │
           └─────────────────────┘
```

---

## Implementation Specification

### Phase 1: Core Logger Implementation

**File:** `/src/lib/logging/core-logger.ts`

```typescript
/**
 * Core Logger - Unified logging system
 * Replaces multiple logger implementations
 */

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface LogTransport {
  write(entry: LogEntry): Promise<void> | void;
}

export class CoreLogger {
  private static instance: CoreLogger;
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    // Initialize default transports
    this.addTransport(new ConsoleTransport());

    if (process.env.NODE_ENV === 'production') {
      // Add external transports (Sentry, DataDog, etc.)
      this.addTransport(new ExternalTransport());
    }
  }

  static getInstance(): CoreLogger {
    if (!CoreLogger.instance) {
      CoreLogger.instance = new CoreLogger();
    }
    return CoreLogger.instance;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  async log(entry: LogEntry): Promise<void> {
    if (this.shouldLog(entry.level)) {
      await Promise.all(
        this.transports.map(t => t.write(entry))
      );
    }
  }

  // Convenience methods
  debug(message: string, context?: Partial<LogContext>): void {
    this.log({ level: 'debug', message, context: this.buildContext(context) });
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log({ level: 'info', message, context: this.buildContext(context) });
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log({ level: 'warn', message, context: this.buildContext(context) });
  }

  error(message: string, error: Error | string, context?: Partial<LogContext>): void {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : { name: 'Error', message: String(error) };

    this.log({
      level: 'error',
      message,
      context: this.buildContext(context),
      error: errorObj,
    });
  }

  private buildContext(partial?: Partial<LogContext>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      ...partial,
    };
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
}

// Export singleton instance
export const logger = CoreLogger.getInstance();
```

### Phase 2: Request Adapter (API Routes)

**File:** `/src/lib/logging/adapters/request-adapter.ts`

```typescript
import { CoreLogger, LogContext } from '../core-logger';
import { NextRequest } from 'next/server';

export interface RequestLogContext extends LogContext {
  requestId: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  ip?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export class RequestLogger {
  private logger: CoreLogger;

  constructor(logger: CoreLogger) {
    this.logger = logger;
  }

  createContext(request: NextRequest, requestId: string): RequestLogContext {
    const url = new URL(request.url);
    return {
      requestId,
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      timestamp: new Date().toISOString(),
    };
  }

  logRequest(context: RequestLogContext, additionalData?: Record<string, unknown>): void {
    this.logger.info('API request started', { ...context, ...additionalData });
  }

  logResponse(
    context: RequestLogContext,
    statusCode: number,
    metrics: PerformanceMetrics,
    additionalData?: Record<string, unknown>
  ): void {
    const level = this.getResponseLogLevel(statusCode);

    if (level === 'error') {
      this.logger.error('API request failed', `Status ${statusCode}`, {
        ...context,
        statusCode,
        ...metrics,
        ...additionalData,
      });
    } else {
      this.logger.info('API request completed', {
        ...context,
        statusCode,
        ...metrics,
        ...additionalData,
      });
    }
  }

  logPerformanceWarning(
    context: RequestLogContext,
    metrics: PerformanceMetrics,
    threshold: number
  ): void {
    this.logger.warn('Performance threshold exceeded', {
      ...context,
      ...metrics,
      threshold,
    });
  }

  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || undefined;
  }

  private getResponseLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }
}

// Export singleton instance
export const requestLogger = new RequestLogger(CoreLogger.getInstance());
```

### Phase 3: Session Adapter (User Tracking)

**File:** `/src/lib/logging/adapters/session-adapter.ts`

```typescript
import { CoreLogger, LogContext } from '../core-logger';

export type InteractionType =
  | 'session_started'
  | 'search_query'
  | 'image_selected'
  | 'description_generated'
  | 'qa_generated'
  | 'vocabulary_selected'
  | 'phrase_extracted'
  | 'error_occurred'
  | 'session_ended';

export interface SessionContext extends LogContext {
  sessionId: string;
  userId?: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  browserName?: string;
  language?: string;
}

export interface InteractionData {
  type: InteractionType;
  data: Record<string, unknown>;
}

export class SessionLogger {
  private logger: CoreLogger;
  private sessionId: string;
  private sessionContext: SessionContext;

  constructor(logger: CoreLogger, sessionId?: string) {
    this.logger = logger;
    this.sessionId = sessionId || this.generateSessionId();
    this.sessionContext = this.initializeContext();
  }

  logInteraction(type: InteractionType, data: Record<string, unknown>): void {
    this.logger.info(`Session: ${type}`, {
      ...this.sessionContext,
      interactionType: type,
      interactionData: data,
    });
  }

  logSearch(query: string, resultCount: number, duration: number): void {
    this.logInteraction('search_query', {
      searchQuery: query,
      resultCount,
      duration,
    });
  }

  logImageSelection(imageId: string, imageUrl: string, selectionTime: number): void {
    this.logInteraction('image_selected', {
      imageId,
      imageUrl,
      selectionTime,
    });
  }

  // ... additional convenience methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeContext(): SessionContext {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      deviceType: this.detectDeviceType(),
      browserName: this.detectBrowser(),
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    };
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'other';
  }
}

// Factory function for creating session loggers
export function createSessionLogger(sessionId?: string): SessionLogger {
  return new SessionLogger(CoreLogger.getInstance(), sessionId);
}
```

### Phase 4: Client Adapter (Browser-safe)

**File:** `/src/lib/logging/adapters/client-adapter.ts`

```typescript
import { LogContext } from '../core-logger';

/**
 * Client-safe logger for browser environments
 * No server-side imports to avoid bundling issues
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export class ClientLogger {
  private minLevel: LogLevel = LogLevel.INFO;

  constructor() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      this.minLevel = LogLevel.DEBUG;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message), context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), context);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), context);
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), { error, context });

      // Send to API for server-side logging
      this.sendToServer('error', message, { error, context });
    }
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private async sendToServer(
    level: string,
    message: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, data }),
      });
    } catch (error) {
      // Fail silently to avoid logging loops
    }
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();
```

---

## Migration Strategy

### Backwards Compatibility Layer

**File:** `/src/lib/logging/legacy-adapters.ts`

```typescript
/**
 * Legacy Adapters - Maintain backwards compatibility
 * These re-export the new logger with old interface
 */

import { requestLogger } from './adapters/request-adapter';
import { createSessionLogger } from './adapters/session-adapter';
import { clientLogger } from './adapters/client-adapter';

// Legacy: /src/lib/monitoring/logger.ts
export { requestLogger as structuredLogger };
export { requestLogger as logger };

// Legacy: /src/lib/api/client-logger.ts
export { clientLogger as logger };

// Legacy: /src/lib/logging/sessionLogger.ts
export { createSessionLogger as getSessionLogger, createSessionLogger };
```

### Phased Migration

```
Phase 1 (Week 1):
  - Implement core logger
  - Create adapters
  - Add backwards compatibility layer
  - Update imports in new code only

Phase 2 (Week 2-3):
  - Gradually replace imports file-by-file
  - Use find-and-replace for common patterns:
    - "from '@/lib/monitoring/logger'" → "from '@/lib/logging'"
    - "from '@/lib/api/client-logger'" → "from '@/lib/logging/adapters/client-adapter'"

Phase 3 (Week 4):
  - Remove old logger files
  - Remove backwards compatibility layer
  - Update all tests
```

---

## Consequences

### Positive

- **Single source of truth** for logging configuration
- **Consistent log formats** across all layers
- **Easier debugging** with unified context
- **Reduced memory footprint** (single logger instance)
- **Better observability** with structured logs

### Negative

- **Migration effort** across 554 TypeScript files
- **Risk of regressions** during transition
- **Team training** required on new logger API

### Mitigation

- Use backwards compatibility layer to minimize breaking changes
- Gradual migration allows rollback at any point
- Comprehensive test coverage for logger functionality
- Document migration guide with examples

---

## Related Decisions

- ADR-003: Route Handler Refactoring
- ADR-004: Configuration Consolidation
- ADR-005: Type Safety Strategy

---

## References

- [Structured Logging Best Practices](https://cloud.google.com/logging/docs/structured-logging)
- [Winston Logger Architecture](https://github.com/winstonjs/winston)
- [Pino Logger Performance](https://github.com/pinojs/pino)
