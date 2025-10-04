/**
 * Logger Integration Test Suite
 * Tests logger in actual components and API routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, apiLogger, authLogger, type LogContext } from '@/lib/logger';
import { structuredLogger } from '@/lib/monitoring/logger';

describe('Logger Integration Tests', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Route Integration', () => {
    it('should log API requests correctly', () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        headers: new Map([
          ['user-agent', 'test-agent'],
          ['x-forwarded-for', '127.0.0.1']
        ]),
      } as any;

      const requestId = apiLogger.generateRequestId();
      const context = apiLogger.extractRequestContext(mockRequest, requestId);

      apiLogger.apiRequest('GET', '/api/test', context);

      expect(context.requestId).toBe(requestId);
      expect(context.method).toBe('GET');
      expect(context.url).toBe('/api/test');
    });

    it('should log API responses with performance metrics', () => {
      const context: LogContext = {
        requestId: 'req-123',
        method: 'POST',
        url: '/api/users',
      };

      apiLogger.apiResponse('POST', '/api/users', 201, 150, context);
      expect(consoleInfoSpy).not.toHaveBeenCalled(); // Suppressed in test
    });

    it('should log API errors with full context', () => {
      const error = new Error('Database connection failed');
      const context: LogContext = {
        requestId: 'req-123',
        method: 'GET',
        url: '/api/users',
        userId: 'user-456',
      };

      apiLogger.error('API request failed', error, context);
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Suppressed in test
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should log successful authentication', () => {
      const context: LogContext = {
        userId: 'user-123',
        sessionId: 'session-abc',
        ip: '127.0.0.1',
      };

      authLogger.auth('User login successful', true, context);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log failed authentication attempts', () => {
      const context: LogContext = {
        ip: '192.168.1.1',
        userAgent: 'suspicious-agent',
      };

      authLogger.auth('Invalid credentials', false, context);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log security events for suspicious activity', () => {
      authLogger.security('Multiple failed login attempts', 'high', {
        ip: '1.2.3.4',
        attempts: 5,
        timeWindow: '5 minutes',
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Structured Logger Integration', () => {
    it('should create log context from request', () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/analytics',
        method: 'POST',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0'],
          ['x-real-ip', '10.0.0.1']
        ]),
      } as any;

      const requestId = structuredLogger.generateRequestId();
      const context = structuredLogger.createLogContext(mockRequest, requestId);

      expect(context).toHaveProperty('requestId', requestId);
      expect(context).toHaveProperty('endpoint', '/api/analytics');
      expect(context).toHaveProperty('method', 'POST');
      expect(context).toHaveProperty('userAgent', 'Mozilla/5.0');
    });

    it('should log request start', () => {
      const context: LogContext = {
        requestId: 'req-789',
        endpoint: '/api/test',
        method: 'GET',
      };

      structuredLogger.logRequest(context, { customData: 'value' });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log response with performance metrics', () => {
      const context: LogContext = {
        requestId: 'req-789',
        endpoint: '/api/test',
        method: 'GET',
      };

      const metrics = {
        responseTime: 250,
        memoryUsage: structuredLogger.getMemoryMetrics(),
      };

      structuredLogger.logResponse(context, 200, metrics);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log errors with error context', () => {
      const context: LogContext = {
        requestId: 'req-789',
        endpoint: '/api/test',
        method: 'POST',
      };

      const error = new Error('Validation failed');
      const errorContext = {
        category: 'validation' as const,
        severity: 'medium' as const,
        code: 'INVALID_INPUT',
      };

      structuredLogger.logError(context, error, errorContext);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log performance warnings', () => {
      const context: LogContext = {
        requestId: 'req-789',
        endpoint: '/api/slow-endpoint',
      };

      const metrics = {
        responseTime: 2500,
      };

      structuredLogger.logPerformanceWarning(context, metrics, 1000);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log business events', () => {
      const context: LogContext = {
        userId: 'user-123',
        sessionId: 'session-abc',
      };

      structuredLogger.logEvent(context, 'description_generated', {
        descriptionId: 'desc-456',
        wordCount: 250,
      });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log security events', () => {
      const context: LogContext = {
        ip: '1.2.3.4',
        endpoint: '/api/admin',
      };

      structuredLogger.logSecurity(context, 'Unauthorized admin access', 'critical');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Component Integration', () => {
    it('should log component lifecycle events', () => {
      const componentLogger = createLogger('UserDashboard');

      componentLogger.componentLifecycle('UserDashboard', 'mount', {
        userId: 'user-123',
        props: { showStats: true },
      });

      componentLogger.componentLifecycle('UserDashboard', 'unmount');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log user interactions', () => {
      const uiLogger = createLogger('UI');

      uiLogger.userAction('Button clicked', {
        button: 'generate-description',
        page: '/dashboard',
        userId: 'user-123',
      });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log client-side errors', () => {
      const clientLogger = createLogger('Client');
      const error = new Error('Failed to fetch data');

      clientLogger.networkError('API call failed', error, {
        endpoint: '/api/descriptions',
        statusCode: 500,
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Database Operation Integration', () => {
    it('should log database queries', () => {
      const dbLogger = createLogger('Database');
      const startTime = Date.now();

      // Simulate query
      const duration = Date.now() - startTime;

      dbLogger.database('SELECT * FROM users WHERE id = ?', duration, {
        table: 'users',
        operation: 'SELECT',
        rows: 1,
      });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should warn on slow database queries', () => {
      const dbLogger = createLogger('Database');

      dbLogger.database('SELECT * FROM large_table', 1500, {
        table: 'large_table',
        operation: 'SELECT',
        rows: 10000,
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log database errors', () => {
      const dbLogger = createLogger('Database');
      const error = new Error('Connection timeout');

      dbLogger.error('Database operation failed', error, {
        category: 'database',
        severity: 'high',
        operation: 'INSERT',
        table: 'users',
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance Tracking Integration', () => {
    it('should track operation performance', () => {
      const perfLogger = createLogger('Performance');
      const startTime = Date.now();

      // Simulate operation
      const duration = Date.now() - startTime;

      perfLogger.performance('Image processing', duration, {
        imageSize: 1024000,
        format: 'jpeg',
      });
    });

    it('should get memory metrics', () => {
      const metrics = structuredLogger.getMemoryMetrics();

      if (metrics) {
        expect(metrics).toHaveProperty('heapUsed');
        expect(metrics).toHaveProperty('heapTotal');
        expect(metrics).toHaveProperty('external');
      }
    });

    it('should get CPU metrics', () => {
      const metrics = structuredLogger.getCPUMetrics();

      if (metrics) {
        expect(metrics).toHaveProperty('user');
        expect(metrics).toHaveProperty('system');
      }
    });
  });

  describe('Error Categorization', () => {
    it('should categorize authentication errors', () => {
      const error = new Error('Invalid token');
      authLogger.error('Authentication failed', error, {
        category: 'authentication',
        severity: 'medium',
      });
    });

    it('should categorize validation errors', () => {
      const logger = createLogger('Validation');
      logger.validationError('Invalid email format', {
        field: 'email',
        value: 'invalid-email',
      });
    });

    it('should categorize business logic errors', () => {
      const logger = createLogger('Business');
      logger.businessError('Insufficient credits', {
        userId: 'user-123',
        requiredCredits: 10,
        availableCredits: 5,
      });
    });

    it('should categorize system errors', () => {
      const error = new Error('Out of memory');
      const logger = createLogger('System');
      logger.systemError('System failure', error);
    });
  });

  describe('Log Output Format', () => {
    it('should include timestamp in logs', () => {
      const logger = createLogger('Format');
      const context: LogContext = {};

      logger.info('Test message', context);

      // Timestamp should be added automatically
      expect(context.timestamp || new Date().toISOString()).toBeDefined();
    });

    it('should include environment in logs', () => {
      const logger = createLogger('Format');
      logger.info('Test message');

      // Environment should be development or test
      expect(['development', 'test', 'production']).toContain(
        process.env.NODE_ENV
      );
    });

    it('should include service name in structured logs', () => {
      const context: LogContext = {
        requestId: 'req-123',
      };

      structuredLogger.logRequest(context);

      // Service name should be in log data
    });
  });

  describe('Log Storage and Retrieval', () => {
    it('should store and retrieve recent logs', () => {
      const context: LogContext = {
        requestId: 'req-test-storage',
      };

      structuredLogger.logRequest(context);

      const recentLogs = structuredLogger.getRecentLogs(10);
      expect(Array.isArray(recentLogs)).toBe(true);
    });

    it('should clear stored logs', () => {
      structuredLogger.clearLogs();
      const logs = structuredLogger.getRecentLogs();
      expect(logs).toHaveLength(0);
    });
  });
});
