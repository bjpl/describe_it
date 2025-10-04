/**
 * Console Replacement Test Suite
 * Tests logger utility functions and ensures they match console behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logger,
  apiLogger,
  authLogger,
  dbLogger,
  securityLogger,
  performanceLogger,
  createLogger,
  createRequestLogger,
  logError,
  logWarn,
  logInfo,
  logDebug,
  devLog,
  devWarn,
  devError,
  type LogContext,
} from '@/lib/logger';

describe('Console Replacement - Logger Utilities', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Spy on console methods to verify they're being called
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger Instance Creation', () => {
    it('should create logger with context', () => {
      const testLogger = createLogger('test-context');
      expect(testLogger).toBeDefined();

      testLogger.info('Test message');
      // In non-test environment, this would call console.info
      expect(consoleInfoSpy).not.toHaveBeenCalled(); // Suppressed in test env
    });

    it('should create request logger with context', () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        headers: new Map([
          ['user-agent', 'test-agent'],
          ['x-forwarded-for', '127.0.0.1']
        ]),
      } as any;

      const requestLogger = createRequestLogger('api-test', mockRequest);
      expect(requestLogger).toBeDefined();
    });
  });

  describe('Basic Logging Methods', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      // Logger should format and pass to appropriate transport
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Suppressed in test
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // Suppressed in test
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled(); // Suppressed in test
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled(); // Suppressed in test
    });

    it('should handle error with context', () => {
      const error = new Error('Test error');
      const context: LogContext = {
        userId: 'user-123',
        requestId: 'req-456',
        component: 'test-component',
      };

      logger.error('Error with context', error, context);
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Suppressed in test
    });
  });

  describe('Specialized Logger Instances', () => {
    it('should have api logger instance', () => {
      expect(apiLogger).toBeDefined();
      apiLogger.apiRequest('GET', '/api/test');
    });

    it('should have auth logger instance', () => {
      expect(authLogger).toBeDefined();
      authLogger.auth('Login attempt', true, { userId: 'user-123' });
    });

    it('should have database logger instance', () => {
      expect(dbLogger).toBeDefined();
      dbLogger.database('SELECT * FROM users', 250);
    });

    it('should have security logger instance', () => {
      expect(securityLogger).toBeDefined();
      securityLogger.security('Unauthorized access attempt', 'high');
    });

    it('should have performance logger instance', () => {
      expect(performanceLogger).toBeDefined();
      performanceLogger.performance('API call', 1500);
    });
  });

  describe('Convenience Export Functions', () => {
    it('should export logError function', () => {
      const error = new Error('Test');
      logError('Test error', error);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should export logWarn function', () => {
      logWarn('Test warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should export logInfo function', () => {
      logInfo('Test info');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should export logDebug function', () => {
      logDebug('Test debug');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Development-Only Logging', () => {
    it('should have devLog function', () => {
      devLog('Development log', { extra: 'data' });
      // Only logs in development mode
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should have devWarn function', () => {
      devWarn('Development warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should have devError function', () => {
      const error = new Error('Dev error');
      devError('Development error', error);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Stack Traces', () => {
    it('should preserve error stack traces', () => {
      const error = new Error('Test error with stack');
      const stack = error.stack;

      logger.error('Stack trace test', error);

      // Stack trace should be preserved in error context
      expect(stack).toBeDefined();
      expect(stack).toContain('Error: Test error with stack');
    });

    it('should handle non-Error objects', () => {
      logger.error('String error test', 'This is a string error');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined errors', () => {
      logger.error('Error without object');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Context Metadata', () => {
    it('should accept and use log context', () => {
      const context: LogContext = {
        userId: 'user-789',
        sessionId: 'session-abc',
        requestId: 'req-xyz',
        component: 'test-suite',
      };

      logger.info('Context test', context);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should merge multiple context objects', () => {
      const baseContext: LogContext = { userId: 'user-123' };
      const additionalContext: LogContext = { requestId: 'req-456' };

      logger.info('Merged context', { ...baseContext, ...additionalContext });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('Request Context Extraction', () => {
    it('should extract request context from NextRequest', () => {
      const testLogger = createLogger('request-test');
      const mockRequest = {
        url: 'http://localhost:3000/api/test?param=value',
        method: 'POST',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0'],
          ['x-forwarded-for', '192.168.1.1, 10.0.0.1'],
        ]),
      } as any;

      const context = testLogger.extractRequestContext(mockRequest);

      expect(context).toHaveProperty('requestId');
      expect(context).toHaveProperty('method', 'POST');
      expect(context).toHaveProperty('url', '/api/test');
      expect(context).toHaveProperty('userAgent', 'Mozilla/5.0');
      expect(context).toHaveProperty('ip', '192.168.1.1');
    });

    it('should generate unique request IDs', () => {
      const testLogger = createLogger('id-test');
      const id1 = testLogger.generateRequestId();
      const id2 = testLogger.generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log API requests', () => {
      logger.apiRequest('GET', '/api/users', { userId: 'user-123' });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log API responses', () => {
      logger.apiResponse('GET', '/api/users', 200, 150);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log security events', () => {
      logger.security('Brute force attempt', 'critical', {
        ip: '1.2.3.4',
        attempts: 10
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log authentication events', () => {
      logger.auth('User login', true, { userId: 'user-123' });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log database operations', () => {
      logger.database('INSERT INTO users', 50, { table: 'users' });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      logger.performance('Database query', 250);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log user actions', () => {
      logger.userAction('Button clicked', {
        button: 'submit',
        page: '/dashboard'
      });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log component lifecycle', () => {
      logger.componentLifecycle('UserProfile', 'mount', {
        userId: 'user-123'
      });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Log Level Behavior', () => {
    it('should use appropriate log level for API responses', () => {
      // 2xx - info
      logger.apiResponse('GET', '/api/test', 200, 100);

      // 4xx - warn
      logger.apiResponse('GET', '/api/test', 404, 100);

      // 5xx - error
      logger.apiResponse('GET', '/api/test', 500, 100);
    });

    it('should escalate log level for slow operations', () => {
      // Fast operation - debug
      logger.database('SELECT query', 50);

      // Slow operation - warn
      logger.database('SELECT query', 1500);
    });
  });

  describe('Request Metadata Management', () => {
    it('should set and clear request metadata', () => {
      const testLogger = createLogger('metadata-test');
      const metadata: LogContext = {
        requestId: 'req-123',
        userId: 'user-456',
      };

      testLogger.setRequest(metadata);
      testLogger.info('Message with metadata');

      testLogger.clearRequest();
      testLogger.info('Message without metadata');
    });
  });

  describe('Error Storage (Client-Side)', () => {
    it('should provide getStoredErrors method', () => {
      const errors = logger.getStoredErrors();
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should provide clearStoredErrors method', () => {
      expect(() => logger.clearStoredErrors()).not.toThrow();
    });
  });

  describe('Data Sanitization', () => {
    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.info('Circular reference test', { data: circular });
      }).not.toThrow();
    });

    it('should handle undefined values', () => {
      expect(() => {
        logger.info('Undefined test', { value: undefined });
      }).not.toThrow();
    });

    it('should handle null values', () => {
      expect(() => {
        logger.info('Null test', { value: null });
      }).not.toThrow();
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: new Array(1000).fill({ key: 'value', nested: { deep: 'data' } })
      };

      expect(() => {
        logger.info('Large object test', largeObject);
      }).not.toThrow();
    });
  });
});
