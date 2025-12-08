/**
 * Type-Safe Route Handler Utilities
 *
 * Generic wrapper for creating type-safe Next.js API route handlers
 * with automatic validation, error handling, and standardized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { apiLogger } from '@/lib/logger';
import type { APIResponse, APIError, APIMetadata } from './api-response';

// ============================================================================
// ROUTE CONTEXT
// ============================================================================

export interface RouteContext {
  requestId: string;
  request: NextRequest;
  startTime: number;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

export interface RouteConfig<TInput, TOutput> {
  /**
   * Input validation schema (Zod)
   */
  inputSchema: z.ZodSchema<TInput>;

  /**
   * Output validation schema (optional, for runtime validation)
   */
  outputSchema?: z.ZodSchema<TOutput>;

  /**
   * Whether authentication is required
   */
  requireAuth?: boolean;

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };

  /**
   * Cache configuration
   */
  cache?: {
    ttl: number;
    key?: (input: TInput) => string;
  };

  /**
   * Custom error messages
   */
  errorMessages?: {
    validation?: string;
    auth?: string;
    rateLimit?: string;
    internal?: string;
  };

  /**
   * Whether to log request/response
   */
  logging?: boolean;
}

// ============================================================================
// ROUTE HANDLER TYPE
// ============================================================================

export type RouteHandler<TInput, TOutput> = (
  input: TInput,
  context: RouteContext
) => Promise<TOutput>;

// ============================================================================
// CREATE TYPE-SAFE ROUTE HANDLER
// ============================================================================

/**
 * Creates a type-safe route handler with automatic validation,
 * error handling, and standardized response format
 *
 * @param config - Route configuration
 * @param handler - The actual route handler function
 * @returns Next.js route handler function
 *
 * @example
 * ```typescript
 * export const POST = createTypedRoute(
 *   {
 *     inputSchema: createVocabularyRequestSchema,
 *     outputSchema: vocabularyItemSchema,
 *     requireAuth: true,
 *   },
 *   async (input, context) => {
 *     // Type-safe handler implementation
 *     return await vocabularyService.create(input, context.user.id);
 *   }
 * );
 * ```
 */
export function createTypedRoute<TInput, TOutput>(
  config: RouteConfig<TInput, TOutput>,
  handler: RouteHandler<TInput, TOutput>
): (request: NextRequest) => Promise<NextResponse<APIResponse<TOutput>>> {
  return async (request: NextRequest): Promise<NextResponse<APIResponse<TOutput>>> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    const context: RouteContext = {
      requestId,
      request,
      startTime,
    };

    try {
      // 1. Parse and validate input
      const rawBody = await request.json().catch(() => ({}));

      let validatedInput: TInput;
      try {
        validatedInput = config.inputSchema.parse(rawBody);
      } catch (error) {
        if (error instanceof ZodError) {
          return createValidationErrorResponse(
            error,
            requestId,
            startTime,
            config.errorMessages?.validation
          );
        }
        throw error;
      }

      // 2. Check authentication (if required)
      if (config.requireAuth) {
        // Authentication check would go here
        // For now, we'll skip this as it requires integration with auth middleware
      }

      // 3. Rate limiting (if configured)
      if (config.rateLimit) {
        // Rate limit check would go here
        // This would integrate with your rate limiting service
      }

      // 4. Execute handler
      const output = await handler(validatedInput, context);

      // 5. Validate output (optional)
      if (config.outputSchema) {
        try {
          config.outputSchema.parse(output);
        } catch (error) {
          apiLogger.error('Output validation failed', {
            requestId,
            error,
          });
          // Don't fail the request, just log it
        }
      }

      // 6. Log success (if enabled)
      if (config.logging !== false) {
        const duration = Date.now() - startTime;
        apiLogger.info('Route handler success', {
          requestId,
          duration,
          path: request.nextUrl.pathname,
        });
      }

      // 7. Create response
      const metadata: APIMetadata = {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      return NextResponse.json({
        success: true,
        data: output,
        metadata,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle validation errors
      if (error instanceof ZodError) {
        return createValidationErrorResponse(
          error,
          requestId,
          startTime,
          config.errorMessages?.validation
        );
      }

      // Handle other errors
      apiLogger.error('Route handler error', {
        requestId,
        duration,
        error,
        path: request.nextUrl.pathname,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: config.errorMessages?.internal || 'An unexpected error occurred',
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
            }),
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            version: '1.0',
          },
        } satisfies APIResponse<TOutput>,
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// VALIDATION ERROR RESPONSE
// ============================================================================

function createValidationErrorResponse<T>(
  error: ZodError,
  requestId: string,
  startTime: number,
  customMessage?: string
): NextResponse<APIResponse<T>> {
  const duration = Date.now() - startTime;

  apiLogger.warn('Validation error', {
    requestId,
    duration,
    errors: error.errors,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: customMessage || 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    } satisfies APIResponse<T>,
    { status: 400 }
  );
}

// ============================================================================
// TYPED GET ROUTE
// ============================================================================

export interface GetRouteConfig<TQuery, TOutput> {
  querySchema: z.ZodSchema<TQuery>;
  outputSchema?: z.ZodSchema<TOutput>;
  requireAuth?: boolean;
  cache?: {
    ttl: number;
    key?: (query: TQuery) => string;
  };
  logging?: boolean;
}

export type GetRouteHandler<TQuery, TOutput> = (
  query: TQuery,
  context: RouteContext
) => Promise<TOutput>;

/**
 * Creates a type-safe GET route handler with query parameter validation
 */
export function createTypedGetRoute<TQuery, TOutput>(
  config: GetRouteConfig<TQuery, TOutput>,
  handler: GetRouteHandler<TQuery, TOutput>
): (request: NextRequest) => Promise<NextResponse<APIResponse<TOutput>>> {
  return async (request: NextRequest): Promise<NextResponse<APIResponse<TOutput>>> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    const context: RouteContext = {
      requestId,
      request,
      startTime,
    };

    try {
      // Parse query parameters
      const searchParams = Object.fromEntries(request.nextUrl.searchParams);

      // Validate query parameters
      let validatedQuery: TQuery;
      try {
        validatedQuery = config.querySchema.parse(searchParams);
      } catch (error) {
        if (error instanceof ZodError) {
          return createValidationErrorResponse(
            error,
            requestId,
            startTime,
            'Invalid query parameters'
          );
        }
        throw error;
      }

      // Execute handler
      const output = await handler(validatedQuery, context);

      // Validate output (optional)
      if (config.outputSchema) {
        try {
          config.outputSchema.parse(output);
        } catch (error) {
          apiLogger.error('Output validation failed', {
            requestId,
            error,
          });
        }
      }

      // Log success
      if (config.logging !== false) {
        const duration = Date.now() - startTime;
        apiLogger.info('GET route handler success', {
          requestId,
          duration,
          path: request.nextUrl.pathname,
        });
      }

      // Create response
      const metadata: APIMetadata = {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      return NextResponse.json({
        success: true,
        data: output,
        metadata,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      apiLogger.error('GET route handler error', {
        requestId,
        duration,
        error,
        path: request.nextUrl.pathname,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
            }),
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            version: '1.0',
          },
        } satisfies APIResponse<TOutput>,
        { status: 500 }
      );
    }
  };
}
