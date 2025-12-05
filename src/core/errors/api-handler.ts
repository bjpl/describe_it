/**
 * API error handling middleware and utilities
 * Provides consistent error handling for Next.js API routes
 */

import { NextResponse } from 'next/server';
import { AppError, handleError, isAppError } from './index';
import { logger, ErrorContext } from './logger';
import { Result, ok, err } from './result';

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Combined API response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  context?: ErrorContext
): NextResponse<ApiErrorResponse> {
  const appError = handleError(error);

  // Log the error
  logger.error(appError, context);

  // Return sanitized error response
  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code || 'INTERNAL_ERROR',
        message: appError.message,
        statusCode: appError.statusCode,
        // Only include details in development
        details: process.env.NODE_ENV === 'development' ? appError.details : undefined,
      },
    },
    { status: appError.statusCode }
  );
}

/**
 * Extracts error context from Next.js request
 */
export function extractRequestContext(request: Request): ErrorContext {
  return {
    path: new URL(request.url).pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    // requestId could come from a header if you implement request tracking
    requestId: request.headers.get('x-request-id') || undefined,
  };
}

/**
 * Higher-order function that wraps API route handlers with error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await fetchData();
 *   return createSuccessResponse(data);
 * });
 * ```
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      // Extract request if available (first arg is typically Request in API routes)
      const request = args[0] as Request | undefined;
      const context = request instanceof Request ? extractRequestContext(request) : undefined;

      try {
        return await handler(...args);
      } catch (error) {
        return createErrorResponse(error, context);
      }
    } catch (error) {
      // Fallback error handling if context extraction fails
      return createErrorResponse(error);
    }
  };
}

/**
 * Wrapper for API route handlers that use Result pattern
 * Automatically converts Result to appropriate HTTP response
 *
 * @example
 * ```typescript
 * export const GET = withResultHandling(async (request) => {
 *   const result = await someOperation();
 *   return result; // Automatically converted to HTTP response
 * });
 * ```
 */
export function withResultHandling<T>(
  handler: (request: Request, context: any) => Promise<Result<T, AppError>>
): (request: Request, context: any) => Promise<NextResponse> {
  return async (request: Request, context: any) => {
    const requestContext = extractRequestContext(request);

    try {
      const result = await handler(request, context);

      if (result.success) {
        return createSuccessResponse(result.data);
      } else {
        return createErrorResponse(result.error, requestContext);
      }
    } catch (error) {
      return createErrorResponse(error, requestContext);
    }
  };
}

/**
 * Validates request body and returns typed result
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: {
    parse: (data: unknown) => T;
  }
): Promise<Result<T, AppError>> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return ok(validated);
  } catch (error) {
    if (error instanceof Error) {
      return err(
        new AppError(
          'Invalid request body',
          400,
          'VALIDATION_ERROR',
          { message: error.message }
        )
      );
    }
    return err(new AppError('Invalid request body', 400, 'VALIDATION_ERROR'));
  }
}

/**
 * Parses and validates query parameters
 */
export function validateQueryParams<T>(
  request: Request,
  schema: {
    parse: (data: unknown) => T;
  }
): Result<T, AppError> {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const validated = schema.parse(params);
    return ok(validated);
  } catch (error) {
    if (error instanceof Error) {
      return err(
        new AppError(
          'Invalid query parameters',
          400,
          'VALIDATION_ERROR',
          { message: error.message }
        )
      );
    }
    return err(new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR'));
  }
}

/**
 * Middleware to handle CORS errors
 */
export function withCORS(
  handler: (request: Request) => Promise<NextResponse>,
  options?: {
    origin?: string | string[];
    methods?: string[];
    credentials?: boolean;
  }
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    const response = await handler(request);

    // Add CORS headers
    const origin = options?.origin || '*';
    const methods = options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const credentials = options?.credentials !== undefined ? options.credentials : true;

    response.headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(',') : origin);
    response.headers.set('Access-Control-Allow-Methods', methods.join(','));
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  };
}

/**
 * Rate limiting helper (placeholder - implement with actual rate limiter)
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<Result<void, AppError>> {
  // TODO: Implement actual rate limiting logic
  // This is a placeholder that always succeeds
  // You might want to use a library like 'rate-limiter-flexible' or implement Redis-based limiting

  return ok(undefined);
}
