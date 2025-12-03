/**
 * Unified Error Handling System
 * Provides consistent error handling across the application
 */

/**
 * Error codes categorizing different types of errors
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',

  // API errors
  API_ERROR = 'API_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_FORBIDDEN = 'API_FORBIDDEN',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT = 'VALIDATION_FORMAT',

  // Authentication errors
  AUTH_ERROR = 'AUTH_ERROR',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',

  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_QUOTA = 'STORAGE_QUOTA',
  STORAGE_READ = 'STORAGE_READ',
  STORAGE_WRITE = 'STORAGE_WRITE',

  // Business logic errors
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Context object for additional error information
 */
export interface ErrorContext {
  [key: string]: unknown;
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
}

/**
 * Application error class with structured information
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly isRecoverable: boolean;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      severity?: ErrorSeverity;
      context?: ErrorContext;
      originalError?: Error;
      isRecoverable?: boolean;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = options?.severity || this.inferSeverity(code);
    this.context = options?.context;
    this.originalError = options?.originalError;
    this.isRecoverable = options?.isRecoverable ?? this.inferRecoverable(code);
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    // Include original error stack if available
    if (options?.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.originalError.stack}`;
    }
  }

  /**
   * Infer severity from error code
   */
  private inferSeverity(code: ErrorCode): ErrorSeverity {
    switch (code) {
      case ErrorCode.SYSTEM_ERROR:
      case ErrorCode.INITIALIZATION_ERROR:
      case ErrorCode.API_SERVER_ERROR:
        return ErrorSeverity.CRITICAL;

      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.STORAGE_ERROR:
      case ErrorCode.OPERATION_FAILED:
        return ErrorSeverity.HIGH;

      case ErrorCode.API_UNAUTHORIZED:
      case ErrorCode.API_FORBIDDEN:
      case ErrorCode.AUTH_ERROR:
      case ErrorCode.VALIDATION_ERROR:
        return ErrorSeverity.MEDIUM;

      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Infer if error is recoverable from error code
   */
  private inferRecoverable(code: ErrorCode): boolean {
    switch (code) {
      case ErrorCode.NETWORK_TIMEOUT:
      case ErrorCode.NETWORK_OFFLINE:
      case ErrorCode.API_RATE_LIMIT:
      case ErrorCode.STORAGE_QUOTA:
      case ErrorCode.VALIDATION_ERROR:
        return true;

      case ErrorCode.SYSTEM_ERROR:
      case ErrorCode.INITIALIZATION_ERROR:
      case ErrorCode.API_SERVER_ERROR:
        return false;

      default:
        return true;
    }
  }

  /**
   * Get user-friendly message based on error code
   */
  public getUserMessage(): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
      [ErrorCode.NETWORK_TIMEOUT]: 'The request took too long. Please try again.',
      [ErrorCode.NETWORK_OFFLINE]: 'You appear to be offline. Please check your connection.',
      [ErrorCode.API_ERROR]: 'An error occurred while communicating with the server.',
      [ErrorCode.API_RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
      [ErrorCode.API_UNAUTHORIZED]: 'You need to be logged in to perform this action.',
      [ErrorCode.API_FORBIDDEN]: 'You do not have permission to perform this action.',
      [ErrorCode.API_NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCode.API_SERVER_ERROR]: 'A server error occurred. Please try again later.',
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorCode.VALIDATION_REQUIRED]: 'Required field is missing.',
      [ErrorCode.VALIDATION_FORMAT]: 'Invalid format. Please check your input.',
      [ErrorCode.AUTH_ERROR]: 'Authentication failed. Please sign in again.',
      [ErrorCode.AUTH_EXPIRED]: 'Your session has expired. Please sign in again.',
      [ErrorCode.AUTH_INVALID]: 'Invalid credentials. Please try again.',
      [ErrorCode.STORAGE_ERROR]: 'Unable to access local storage.',
      [ErrorCode.STORAGE_QUOTA]: 'Storage quota exceeded. Please free up some space.',
      [ErrorCode.STORAGE_READ]: 'Unable to read from storage.',
      [ErrorCode.STORAGE_WRITE]: 'Unable to save to storage.',
      [ErrorCode.BUSINESS_ERROR]: 'Unable to complete the operation.',
      [ErrorCode.OPERATION_FAILED]: 'The operation failed. Please try again.',
      [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found.',
      [ErrorCode.DUPLICATE_RESOURCE]: 'This resource already exists.',
      [ErrorCode.SYSTEM_ERROR]: 'A system error occurred. Please contact support.',
      [ErrorCode.INITIALIZATION_ERROR]: 'Failed to initialize. Please refresh the page.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    };

    return messages[this.code] || this.message;
  }

  /**
   * Convert to JSON for logging
   */
  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      isRecoverable: this.isRecoverable,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }
}

/**
 * Factory function to create AppError from various inputs
 */
export function createError(
  code: ErrorCode,
  message: string,
  context?: ErrorContext,
  originalError?: Error
): AppError {
  return new AppError(code, message, {
    context,
    originalError,
  });
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown, context?: ErrorContext): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('fetch')) {
      return createError(
        ErrorCode.NETWORK_ERROR,
        error.message,
        context,
        error
      );
    }

    // Check for timeout errors
    if (error.message.toLowerCase().includes('timeout')) {
      return createError(
        ErrorCode.NETWORK_TIMEOUT,
        error.message,
        context,
        error
      );
    }

    // Default system error
    return createError(
      ErrorCode.SYSTEM_ERROR,
      error.message,
      context,
      error
    );
  }

  // String error
  if (typeof error === 'string') {
    return createError(
      ErrorCode.UNKNOWN_ERROR,
      error,
      context
    );
  }

  // Object with message
  if (error && typeof error === 'object' && 'message' in error) {
    return createError(
      ErrorCode.UNKNOWN_ERROR,
      String(error.message),
      context
    );
  }

  // Unknown error type
  return createError(
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred',
    {
      ...context,
      originalError: String(error),
    }
  );
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRecoverable;
  }
  return true; // Assume unknown errors are recoverable
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.getUserMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
