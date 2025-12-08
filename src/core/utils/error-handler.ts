/**
 * Type-Safe Error Handling Utilities
 *
 * Provides consistent error handling and transformation
 * for API routes with type safety
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiLogger } from '@/lib/logger';
import type { APIResponse, APIError } from './api-response';
import { ErrorCodes } from './api-response';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base application error class
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string = ErrorCodes.INTERNAL_ERROR,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApplicationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCodes.UNAUTHORIZED, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorCodes.FORBIDDEN, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found', resource?: string) {
    super(message, ErrorCodes.NOT_FOUND, 404, { resource });
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error
 */
export class ConflictError extends ApplicationError {
  constructor(message: string = 'Resource already exists', details?: unknown) {
    super(message, ErrorCodes.CONFLICT, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApplicationError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, ErrorCodes.RATE_LIMIT_EXCEEDED, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends ApplicationError {
  constructor(
    message: string,
    public service: string,
    details?: unknown
  ) {
    super(message, ErrorCodes.EXTERNAL_SERVICE_ERROR, 502, { service, ...details });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCodes.DATABASE_ERROR, 500, details);
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// ERROR TRANSFORMATION
// ============================================================================

/**
 * Transforms any error into a standardized APIError
 */
export function transformError(error: unknown): APIError {
  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Invalid request data',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    };
  }

  // Application errors
  if (error instanceof ApplicationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    };
  }

  // Generic Error objects
  if (error instanceof Error) {
    return {
      code: ErrorCodes.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    };
  }

  // Unknown errors
  return {
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error : undefined,
  };
}

/**
 * Gets the appropriate HTTP status code for an error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof ApplicationError) {
    return error.statusCode;
  }

  if (error instanceof ZodError) {
    return 400;
  }

  return 500;
}

// ============================================================================
// ERROR RESPONSE BUILDER
// ============================================================================

/**
 * Creates a standardized error response from any error
 */
export function createErrorResponseFromError<T = never>(
  error: unknown,
  requestId?: string,
  options?: {
    logError?: boolean;
    includeStack?: boolean;
  }
): NextResponse<APIResponse<T>> {
  const statusCode = getErrorStatusCode(error);
  const apiError = transformError(error);

  // Log error if requested
  if (options?.logError !== false) {
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    apiLogger[logLevel]('API error', {
      requestId,
      error: apiError,
      statusCode,
    });
  }

  // Remove stack in production unless explicitly requested
  if (process.env.NODE_ENV === 'production' && !options?.includeStack) {
    delete apiError.stack;
  }

  const response: APIResponse<T> = {
    success: false,
    error: apiError,
    metadata: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0',
    },
  };

  return NextResponse.json(response, {
    status: statusCode,
    ...(error instanceof RateLimitError && error.retryAfter && {
      headers: {
        'Retry-After': String(error.retryAfter),
      },
    }),
  });
}

// ============================================================================
// ERROR HANDLER WRAPPER
// ============================================================================

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context?: string
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (context) {
        apiLogger.error(`Error in ${context}`, { error });
      }
      throw error;
    }
  };
}

/**
 * Catches errors and transforms them into API responses
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  requestId?: string
): Promise<T | NextResponse<APIResponse<never>>> {
  try {
    return await fn();
  } catch (error) {
    return createErrorResponseFromError(error, requestId);
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Checks if an error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Checks if an error is a ZodError
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Checks if an error is a standard Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// ============================================================================
// ERROR SANITIZATION
// ============================================================================

/**
 * Sanitizes error messages to prevent sensitive data leakage
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove database/system details
  const patterns = [
    /Database/gi,
    /SELECT|INSERT|UPDATE|DELETE/gi,
    /sql/gi,
    /postgres|mysql|mongodb/gi,
    /password|token|secret|key/gi,
    /\/[a-z0-9_-]+\/[a-z0-9_-]+\//gi, // file paths
  ];

  let sanitized = message;
  for (const pattern of patterns) {
    if (pattern.test(sanitized)) {
      return 'An error occurred while processing your request';
    }
  }

  return sanitized;
}

/**
 * Sanitizes an API error for production
 */
export function sanitizeError(error: APIError): APIError {
  return {
    code: error.code,
    message: sanitizeErrorMessage(error.message),
    // Remove details and stack in production
    ...(process.env.NODE_ENV === 'development' && {
      details: error.details,
      stack: error.stack,
    }),
  };
}
