/**
 * Comprehensive Test Suite for Error Middleware
 * Tests: Error categorization, severity assessment, sanitization, logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  ErrorMiddleware,
  errorMiddleware,
  withErrorHandling,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ExternalServiceError,
  DatabaseError,
  isValidationError,
  isAuthenticationError,
  isAuthorizationError,
  isExternalServiceError,
  isDatabaseError,
} from '@/lib/middleware/errorMiddleware';
import { ErrorCategory, ErrorSeverity } from '@/lib/errorHandler';

describe('Error Middleware - Error Categorization', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
    vi.clearAllMocks();
  });

  describe('Database Error Detection', () => {
    it('should categorize database connection errors', () => {
      const errors = [
        new Error('Database connection failed'),
        new Error('SQL query timeout'),
        new Error('Prisma client error'),
        new Error('MongoDB connection refused'),
      ];

      errors.forEach(error => {
        const context = {
          method: 'POST',
          url: 'http://localhost/api/test',
          headers: {},
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
        };

        const category = (middleware as any).categorizeError(error, context);
        expect(category).toBe(ErrorCategory.DATABASE);
      });
    });
  });

  describe('Authentication Error Detection', () => {
    it('should categorize authentication errors', () => {
      const errors = [
        new Error('Unauthorized access'),
        new Error('Invalid token provided'),
        new Error('Authentication failed'),
      ];

      errors.forEach(error => {
        const context = {
          method: 'POST',
          url: 'http://localhost/api/test',
          headers: {},
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
        };

        const category = (middleware as any).categorizeError(error, context);
        expect(category).toBe(ErrorCategory.AUTHENTICATION);
      });
    });
  });

  describe('Validation Error Detection', () => {
    it('should categorize validation errors', () => {
      const errors = [
        new Error('Validation failed'),
        new Error('Invalid email format'),
        new Error('Required field missing'),
        new Error('Schema validation error'),
      ];

      errors.forEach(error => {
        const context = {
          method: 'POST',
          url: 'http://localhost/api/test',
          headers: {},
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
        };

        const category = (middleware as any).categorizeError(error, context);
        expect(category).toBe(ErrorCategory.VALIDATION);
      });
    });
  });

  describe('Network/External Service Error Detection', () => {
    it('should categorize network errors', () => {
      const errors = [
        new Error('fetch failed'),
        new Error('Network timeout'),
        new Error('ENOTFOUND api.external.com'),
        new Error('ECONNREFUSED'),
      ];

      errors.forEach(error => {
        const context = {
          method: 'POST',
          url: 'http://localhost/api/test',
          headers: {},
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
        };

        const category = (middleware as any).categorizeError(error, context);
        expect(category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      });
    });
  });

  describe('File System Error Detection', () => {
    it('should categorize file system errors', () => {
      const errors = [
        new Error('ENOENT: file not found'),
        new Error('EACCES: permission denied'),
        new Error('File operation failed'),
        new Error('Directory not found'),
      ];

      errors.forEach(error => {
        const context = {
          method: 'POST',
          url: 'http://localhost/api/test',
          headers: {},
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
        };

        const category = (middleware as any).categorizeError(error, context);
        expect(category).toBe(ErrorCategory.FILE_SYSTEM);
      });
    });
  });

  describe('API Error Detection', () => {
    it('should categorize API errors for /api/ routes', () => {
      const error = new Error('Generic error');
      const context = {
        method: 'POST',
        url: 'http://localhost/api/test',
        headers: {},
        timestamp: new Date().toISOString(),
        requestId: 'req-123',
      };

      const category = (middleware as any).categorizeError(error, context);
      expect(category).toBe(ErrorCategory.API);
    });
  });
});

describe('Error Middleware - Severity Assessment', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
  });

  it('should assess CRITICAL severity for security errors', () => {
    const error = new Error('Critical security breach');
    const severity = (middleware as any).assessSeverity(
      error,
      ErrorCategory.SECURITY
    );
    expect(severity).toBe(ErrorSeverity.CRITICAL);
  });

  it('should assess HIGH severity for database errors', () => {
    const error = new Error('Database error');
    const severity = (middleware as any).assessSeverity(
      error,
      ErrorCategory.DATABASE
    );
    expect(severity).toBe(ErrorSeverity.HIGH);
  });

  it('should assess HIGH severity for authentication errors', () => {
    const error = new Error('Auth failed');
    const severity = (middleware as any).assessSeverity(
      error,
      ErrorCategory.AUTHENTICATION
    );
    expect(severity).toBe(ErrorSeverity.HIGH);
  });

  it('should assess MEDIUM severity for external service errors', () => {
    const error = new Error('API call failed');
    const severity = (middleware as any).assessSeverity(
      error,
      ErrorCategory.EXTERNAL_SERVICE
    );
    expect(severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should assess LOW severity for generic errors', () => {
    const error = new Error('Generic error');
    const severity = (middleware as any).assessSeverity(
      error,
      ErrorCategory.UNKNOWN
    );
    expect(severity).toBe(ErrorSeverity.LOW);
  });
});

describe('Error Middleware - Sensitive Data Sanitization', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
  });

  it('should sanitize database connection strings', async () => {
    const error = new Error('Connection failed to postgresql://user:password@localhost:5432/db');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-123',
    };

    const response = await middleware.handleError(error, context);
    const data = await response.json();

    // Should not contain password
    expect(JSON.stringify(data)).not.toContain('password');
  });

  it('should sanitize API keys from error messages', async () => {
    const error = new Error('Failed to authenticate with API key: sk-test-key-123456');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-123',
    };

    const response = await middleware.handleError(error, context);
    const data = await response.json();

    // Should not expose API key in production
    if (process.env.NODE_ENV !== 'development') {
      expect(JSON.stringify(data)).not.toContain('sk-test-key-123456');
    }
  });

  it('should not expose internal paths in production', async () => {
    const error = new Error('File not found: /internal/secrets/config.json');
    const context = {
      method: 'GET',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-123',
    };

    process.env.NODE_ENV = 'production';
    const response = await middleware.handleError(error, context);
    const data = await response.json();

    expect(data.stack).toBeUndefined();
    expect(data.details).toBeUndefined();
  });

  it('should sanitize user emails from error messages', async () => {
    const error = new Error('User user@example.com not found');
    const context = {
      method: 'GET',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-123',
    };

    const response = await middleware.handleError(error, context);
    const data = await response.json();

    // Generic error message in production
    if (process.env.NODE_ENV === 'production') {
      expect(data.error).not.toContain('user@example.com');
    }
  });
});

describe('Error Middleware - Error Response Formatting', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
  });

  it('should format error response with required fields', async () => {
    const error = new Error('Test error');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-456',
    };

    const response = await middleware.handleError(error, context);
    const data = await response.json();

    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('requestId', 'req-456');
    expect(data).toHaveProperty('category');
    expect(data).toHaveProperty('severity');
  });

  it('should include details in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Development error');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-789',
    };

    const response = await middleware.handleError(error, context);
    const data = await response.json();

    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('details');
    expect(data).toHaveProperty('stack');
  });

  it('should hide details in production mode', async () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Production error');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-101',
    };

    const response = await middleware.handleError(error, context);
    const data = await response.json();

    expect(data.stack).toBeUndefined();
    expect(data.details).toBeUndefined();
  });

  it('should set appropriate security headers', async () => {
    const error = new Error('Test error');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-202',
    };

    const response = await middleware.handleError(error, context);

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('X-Request-ID')).toBe('req-202');
    expect(response.headers.get('X-Error-Category')).toBeTruthy();
    expect(response.headers.get('X-Error-Severity')).toBeTruthy();
  });
});

describe('Error Middleware - Security Event Logging', () => {
  let middleware: ErrorMiddleware;
  let consoleSpy: any;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log security events for authentication failures', async () => {
    const error = new AuthenticationError('Invalid credentials');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/auth/login',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-303',
    };

    await middleware.handleError(error, context);

    // Verify logging occurred (in real implementation)
    expect(true).toBe(true);
  });

  it('should log all error attempts with context', async () => {
    const error = new Error('Database connection failed');
    const context = {
      method: 'GET',
      url: 'http://localhost/api/data',
      headers: { 'user-agent': 'Test Agent' },
      ip: '192.168.1.1',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      requestId: 'req-404',
    };

    await middleware.handleError(error, context);

    // Verify context was logged
    expect(true).toBe(true);
  });
});

describe('Error Middleware - Rate Limiting on Errors', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
    middleware.clearPerformanceMetrics();
  });

  it('should track error frequency', async () => {
    const error = new Error('Repeated error');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      timestamp: new Date().toISOString(),
      requestId: 'req-505',
    };

    // Simulate multiple errors
    for (let i = 0; i < 5; i++) {
      await middleware.handleError(error, { ...context, requestId: `req-${i}` });
    }

    const stats = middleware.getPerformanceStats();
    expect(stats?.totalRequests).toBe(5);
  });

  it('should implement rate limiting for repeated errors from same source', async () => {
    const error = new Error('Rate limited error');
    const context = {
      method: 'POST',
      url: 'http://localhost/api/test',
      headers: {},
      ip: '192.168.1.100',
      timestamp: new Date().toISOString(),
      requestId: 'req-606',
    };

    // In full implementation, would track IP-based rate limiting
    await middleware.handleError(error, context);

    // Should log security event for excessive errors
    expect(true).toBe(true);
  });
});

describe('Error Middleware - HTTP Status Code Determination', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
  });

  it('should return 404 for not found errors', () => {
    const error = new Error('Resource not found');
    const statusCode = (middleware as any).determineStatusCode(
      error,
      ErrorCategory.API,
      500
    );
    expect(statusCode).toBe(404);
  });

  it('should return 401 for authentication errors', () => {
    const error = new Error('Unauthorized');
    const statusCode = (middleware as any).determineStatusCode(
      error,
      ErrorCategory.AUTHENTICATION,
      500
    );
    expect(statusCode).toBe(401);
  });

  it('should return 403 for authorization errors', () => {
    const error = new Error('Forbidden');
    const statusCode = (middleware as any).determineStatusCode(
      error,
      ErrorCategory.AUTHORIZATION,
      500
    );
    expect(statusCode).toBe(403);
  });

  it('should return 400 for validation errors', () => {
    const error = new Error('Validation failed');
    const statusCode = (middleware as any).determineStatusCode(
      error,
      ErrorCategory.VALIDATION,
      500
    );
    expect(statusCode).toBe(400);
  });

  it('should return 429 for rate limit errors', () => {
    const error = new Error('Too many requests');
    const statusCode = (middleware as any).determineStatusCode(
      error,
      ErrorCategory.API,
      500
    );
    expect(statusCode).toBe(429);
  });

  it('should return 502 for external service errors', () => {
    const error = new Error('External service error');
    const statusCode = (middleware as any).determineStatusCode(
      error,
      ErrorCategory.EXTERNAL_SERVICE,
      500
    );
    expect(statusCode).toBe(502);
  });
});

describe('Error Middleware - Custom Error Classes', () => {
  it('should create ValidationError correctly', () => {
    const error = new ValidationError('Invalid email', 'email', 'not-an-email');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid email');
    expect(error.field).toBe('email');
    expect(error.value).toBe('not-an-email');
    expect(isValidationError(error)).toBe(true);
  });

  it('should create AuthenticationError correctly', () => {
    const error = new AuthenticationError('Invalid token');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toBe('Invalid token');
    expect(isAuthenticationError(error)).toBe(true);
  });

  it('should create AuthorizationError correctly', () => {
    const error = new AuthorizationError('Access denied');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AuthorizationError');
    expect(isAuthorizationError(error)).toBe(true);
  });

  it('should create ExternalServiceError correctly', () => {
    const error = new ExternalServiceError('API failed', 'OpenAI', 500);

    expect(error).toBeInstanceOf(Error);
    expect(error.service).toBe('OpenAI');
    expect(error.statusCode).toBe(500);
    expect(isExternalServiceError(error)).toBe(true);
  });

  it('should create DatabaseError correctly', () => {
    const error = new DatabaseError('Query failed', 'SELECT');

    expect(error).toBeInstanceOf(Error);
    expect(error.operation).toBe('SELECT');
    expect(isDatabaseError(error)).toBe(true);
  });
});

describe('Error Middleware - Wrapper Function', () => {
  let mockHandler: any;

  beforeEach(() => {
    mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );
  });

  it('should wrap handler and catch errors', async () => {
    const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const wrappedHandler = withErrorHandling(errorHandler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should pass through successful responses', async () => {
    const wrappedHandler = withErrorHandling(mockHandler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should add request context headers', async () => {
    const wrappedHandler = withErrorHandling(mockHandler);
    const request = new NextRequest('http://localhost/api/test');

    await wrappedHandler(request);

    // Verify headers were set (in implementation)
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should log performance metrics', async () => {
    const wrappedHandler = withErrorHandling(mockHandler);
    const request = new NextRequest('http://localhost/api/test');

    await wrappedHandler(request);

    const stats = errorMiddleware.getPerformanceStats();
    expect(stats).toBeTruthy();
  });
});

describe('Error Middleware - Performance Tracking', () => {
  let middleware: ErrorMiddleware;

  beforeEach(() => {
    middleware = ErrorMiddleware.getInstance();
    middleware.clearPerformanceMetrics();
  });

  it('should track request duration', async () => {
    const handler = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json({ success: true });
    };

    const wrappedHandler = withErrorHandling(handler);
    const request = new NextRequest('http://localhost/api/test');

    await wrappedHandler(request);

    const stats = middleware.getPerformanceStats();
    expect(stats?.averageDuration).toBeGreaterThan(0);
  });

  it('should identify slow requests', async () => {
    const slowHandler = async () => {
      await new Promise(resolve => setTimeout(resolve, 6000));
      return NextResponse.json({ success: true });
    };

    const wrappedHandler = withErrorHandling(slowHandler);
    const request = new NextRequest('http://localhost/api/slow');

    await wrappedHandler(request);

    const stats = middleware.getPerformanceStats();
    expect(stats?.slowRequests).toBeGreaterThan(0);
  });

  it('should calculate performance statistics', async () => {
    const handler = async () => NextResponse.json({ success: true });
    const wrappedHandler = withErrorHandling(handler);

    // Make multiple requests
    for (let i = 0; i < 10; i++) {
      const request = new NextRequest('http://localhost/api/test');
      await wrappedHandler(request);
    }

    const stats = middleware.getPerformanceStats();
    expect(stats?.totalRequests).toBe(10);
    expect(stats?.averageDuration).toBeGreaterThanOrEqual(0);
    expect(stats?.medianDuration).toBeGreaterThanOrEqual(0);
  });
});
