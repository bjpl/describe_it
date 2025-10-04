/**
 * Logging Performance Test Suite
 * Verifies logging doesn't impact application performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logger, apiLogger, type LogContext } from '@/lib/logger';
import { structuredLogger } from '@/lib/monitoring/logger';

describe('Logging Performance Tests', () => {
  beforeEach(() => {
    // Suppress console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logging Performance', () => {
    it('should log simple messages quickly (< 1ms)', () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        logger.info(`Test message ${i}`);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(1);
    });

    it('should log messages with context quickly (< 2ms)', () => {
      const iterations = 100;
      const context: LogContext = {
        userId: 'user-123',
        requestId: 'req-456',
        sessionId: 'session-789',
      };

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        logger.info(`Test message ${i}`, context);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(2);
    });

    it('should log errors with stack traces quickly (< 3ms)', () => {
      const iterations = 50;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const error = new Error(`Test error ${i}`);
        logger.error('Error occurred', error);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(3);
    });
  });

  describe('Structured Logging Performance', () => {
    it('should create log context quickly (< 0.5ms)', () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        headers: new Map([
          ['user-agent', 'test-agent'],
          ['x-forwarded-for', '127.0.0.1']
        ]),
      } as any;

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const requestId = structuredLogger.generateRequestId();
        structuredLogger.createLogContext(mockRequest, requestId);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(0.5);
    });

    it('should log structured data quickly (< 2ms)', () => {
      const context: LogContext = {
        requestId: 'req-123',
        endpoint: '/api/test',
        method: 'GET',
      };

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        structuredLogger.logRequest(context, { iteration: i });
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(2);
    });
  });

  describe('High-Volume Logging Performance', () => {
    it('should handle 1000 log entries efficiently (< 500ms total)', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        logger.info(`High volume test ${i}`, { index: i });
      }

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent logging without blocking', async () => {
      const promises = [];
      const iterations = 100;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        promises.push(
          Promise.resolve().then(() => {
            logger.info(`Concurrent log ${i}`);
          })
        );
      }

      await Promise.all(promises);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Complex Object Logging Performance', () => {
    it('should handle large objects efficiently (< 5ms)', () => {
      const largeObject = {
        users: new Array(100).fill({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        }),
      };

      const startTime = performance.now();
      logger.info('Large object test', largeObject);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5);
    });

    it('should handle deeply nested objects efficiently (< 3ms)', () => {
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { value: 'leaf' };
        return { nested: createNestedObject(depth - 1) };
      };

      const deepObject = createNestedObject(10);

      const startTime = performance.now();
      logger.info('Deep nested object test', deepObject);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(3);
    });

    it('should handle circular references safely', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const startTime = performance.now();

      expect(() => {
        logger.info('Circular reference test', { data: circular });
      }).not.toThrow();

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Request ID Generation Performance', () => {
    it('should generate unique IDs quickly (< 0.1ms)', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        logger.generateRequestId();
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(0.1);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        ids.add(logger.generateRequestId());
      }

      expect(ids.size).toBe(iterations);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory with repeated logging', () => {
      if (typeof process === 'undefined' || !process.memoryUsage) {
        return; // Skip in browser environments
      }

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        logger.info(`Memory test ${i}`, {
          data: { index: i, timestamp: Date.now() },
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 5MB for 1000 logs)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should handle error storage cleanup efficiently', () => {
      const testLogger = createLogger('cleanup-test');

      const startTime = performance.now();

      // Simulate storing errors
      for (let i = 0; i < 100; i++) {
        testLogger.error(`Error ${i}`, new Error(`Test error ${i}`));
      }

      // Clear errors
      testLogger.clearStoredErrors();

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Specialized Logger Performance', () => {
    it('should log API requests efficiently', () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        apiLogger.apiRequest('GET', `/api/test/${i}`);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(2);
    });

    it('should log API responses efficiently', () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        apiLogger.apiResponse('GET', `/api/test/${i}`, 200, 150);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(2);
    });

    it('should log performance metrics efficiently', () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        logger.performance(`Operation ${i}`, 150);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(2);
    });
  });

  describe('Log Retrieval Performance', () => {
    it('should retrieve stored logs quickly', () => {
      // Store some logs
      for (let i = 0; i < 100; i++) {
        const context: LogContext = { requestId: `req-${i}` };
        structuredLogger.logRequest(context);
      }

      const startTime = performance.now();
      const logs = structuredLogger.getRecentLogs(50);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10);
      expect(logs.length).toBeLessThanOrEqual(50);
    });

    it('should clear logs quickly', () => {
      // Store some logs
      for (let i = 0; i < 100; i++) {
        const context: LogContext = { requestId: `req-${i}` };
        structuredLogger.logRequest(context);
      }

      const startTime = performance.now();
      structuredLogger.clearLogs();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should get memory metrics quickly', () => {
      const startTime = performance.now();
      const metrics = structuredLogger.getMemoryMetrics();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1);
      if (metrics) {
        expect(metrics).toHaveProperty('heapUsed');
      }
    });

    it('should get CPU metrics quickly', () => {
      const startTime = performance.now();
      const metrics = structuredLogger.getCPUMetrics();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1);
      if (metrics) {
        expect(metrics).toHaveProperty('user');
      }
    });

    it('should log performance data without significant overhead', () => {
      const operation = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      // Without logging
      const startTime1 = performance.now();
      operation();
      const durationWithoutLogging = performance.now() - startTime1;

      // With logging
      const startTime2 = performance.now();
      const result = operation();
      const operationDuration = performance.now() - startTime2;
      logger.performance('Test operation', operationDuration);
      const durationWithLogging = performance.now() - startTime2;

      // Logging overhead should be minimal (< 5ms)
      const overhead = durationWithLogging - durationWithoutLogging;
      expect(overhead).toBeLessThan(5);
    });
  });
});
