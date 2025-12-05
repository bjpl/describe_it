/**
 * Core error classes and utilities
 * Provides comprehensive error handling infrastructure
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(
      `External service error: ${service} - ${message}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { service, ...details }
    );
  }
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, 'INTERNAL_ERROR', {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new AppError('An unknown error occurred', 500, 'UNKNOWN_ERROR');
}

// Export Result type and utilities
export type { Result } from './result';
export {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrapOr,
  unwrap,
  fromPromise,
  all,
  tryCatch,
  tryCatchAsync,
} from './result';

// Export API handler utilities
export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from './api-handler';
export {
  createSuccessResponse,
  createErrorResponse,
  extractRequestContext,
  withErrorHandling,
  withResultHandling,
  validateRequestBody,
  validateQueryParams,
  withCORS,
  checkRateLimit,
} from './api-handler';

// Export logger
export type { LogLevel, ErrorContext, LogEntry } from './logger';
export { logger, withErrorLogging } from './logger';
