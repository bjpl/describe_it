/**
 * Standardized API Response Types
 *
 * Provides consistent response structures for all API endpoints
 * with type-safe error handling and metadata
 */

import { NextResponse } from 'next/server';

// ============================================================================
// API RESPONSE TYPE
// ============================================================================

/**
 * Standard API response structure
 * All API endpoints should return this format for consistency
 */
export interface APIResponse<T = unknown> {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * Response data (present when success: true)
   */
  data?: T;

  /**
   * Error information (present when success: false)
   */
  error?: APIError;

  /**
   * Response metadata
   */
  metadata?: APIMetadata;
}

// ============================================================================
// API ERROR TYPE
// ============================================================================

export interface APIError {
  /**
   * Error code for client-side handling
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Additional error details
   */
  details?: unknown;

  /**
   * Stack trace (development only)
   */
  stack?: string;
}

// ============================================================================
// API METADATA TYPE
// ============================================================================

export interface APIMetadata {
  /**
   * Unique request identifier
   */
  requestId: string;

  /**
   * Response timestamp (ISO 8601)
   */
  timestamp: string;

  /**
   * API version
   */
  version: string;

  /**
   * Pagination information (for list endpoints)
   */
  pagination?: PaginationMetadata;

  /**
   * Response time in milliseconds
   */
  responseTime?: number;
}

// ============================================================================
// PAGINATION METADATA
// ============================================================================

export interface PaginationMetadata {
  /**
   * Current page number
   */
  page: number;

  /**
   * Items per page
   */
  limit: number;

  /**
   * Total number of items
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there are more pages
   */
  hasMore: boolean;

  /**
   * Current offset
   */
  offset?: number;
}

// ============================================================================
// RESPONSE BUILDER FUNCTIONS
// ============================================================================

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Partial<APIMetadata>
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...metadata,
    },
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * Creates an error API response
 */
export function createErrorResponse<T = never>(
  error: APIError | string,
  status: number = 500,
  metadata?: Partial<APIMetadata>
): NextResponse<APIResponse<T>> {
  const errorObj: APIError = typeof error === 'string'
    ? { code: 'ERROR', message: error }
    : error;

  const response: APIResponse<T> = {
    success: false,
    error: errorObj,
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...metadata,
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Creates a paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMetadata,
  metadata?: Partial<APIMetadata>
): NextResponse<APIResponse<T[]>> {
  const response: APIResponse<T[]> = {
    success: true,
    data,
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      pagination,
      ...metadata,
    },
  };

  return NextResponse.json(response, { status: 200 });
}

// ============================================================================
// ERROR CODE CONSTANTS
// ============================================================================

export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

  // Rate limiting errors (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is an APIResponse
 */
export function isAPIResponse<T>(value: unknown): value is APIResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as APIResponse).success === 'boolean'
  );
}

/**
 * Type guard to check if a value is an APIError
 */
export function isAPIError(value: unknown): value is APIError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as APIError).code === 'string' &&
    typeof (value as APIError).message === 'string'
  );
}

/**
 * Asserts that a response is successful and has data
 */
export function assertSuccessResponse<T>(
  response: APIResponse<T>
): asserts response is APIResponse<T> & { success: true; data: T } {
  if (!response.success || !response.data) {
    throw new Error(
      response.error?.message || 'Response was not successful'
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates pagination metadata from total count, offset, and limit
 */
export function calculatePagination(
  total: number,
  offset: number = 0,
  limit: number = 20
): PaginationMetadata {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
    offset,
  };
}

/**
 * Extracts pagination parameters from query string
 */
export function extractPaginationParams(searchParams: URLSearchParams): {
  offset: number;
  limit: number;
} {
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

  return { offset, limit };
}
