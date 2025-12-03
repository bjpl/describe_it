/**
 * Higher-order function for protecting API routes
 * Type-safe version compatible with Next.js App Router
 *
 * Uses function overloads to correctly handle:
 * 1. Handlers without context (most routes)
 * 2. Handlers with context (dynamic routes with params)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from './auth';
import { authLogger } from '@/lib/logger';

export interface AuthOptions {
  requiredFeatures?: string[];
  allowGuest?: boolean;
  required?: boolean;
  errorMessages?: {
    featureRequired?: string;
    unauthorized?: string;
  };
}

// Type for handlers WITHOUT context (most API routes)
type SimpleRouteHandler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

// Type for handlers WITH context (dynamic routes like /api/[id])
type ContextRouteHandler<T> = (request: NextRequest, context: T) => Promise<NextResponse> | NextResponse;

// Overload 1: Handler without context parameter
export function withAuth(
  handler: SimpleRouteHandler,
  options?: AuthOptions
): SimpleRouteHandler;

// Overload 2: Handler with context parameter
export function withAuth<T>(
  handler: ContextRouteHandler<T>,
  options?: AuthOptions
): ContextRouteHandler<T>;

// Implementation
export function withAuth<T = never>(
  handler: SimpleRouteHandler | ContextRouteHandler<T>,
  options?: AuthOptions
): SimpleRouteHandler | ContextRouteHandler<T> {
  // Check if handler expects context by examining its length (number of parameters)
  const handlerLength = handler.length;

  if (handlerLength <= 1) {
    // Handler WITHOUT context - return simple handler signature
    const simpleWrapper: SimpleRouteHandler = async (request: NextRequest): Promise<NextResponse> => {
      try {
        if (options?.allowGuest || options?.required === false) {
          return await (handler as SimpleRouteHandler)(request);
        }

        const authResult = await validateAuth(request);

        if (!authResult.authenticated) {
          return NextResponse.json(
            { error: options?.errorMessages?.unauthorized || 'Unauthorized' },
            { status: 401 }
          );
        }

        return await (handler as SimpleRouteHandler)(request);
      } catch (error) {
        authLogger.error('Auth middleware error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    };
    return simpleWrapper;
  } else {
    // Handler WITH context - return context handler signature
    const contextWrapper: ContextRouteHandler<T> = async (request: NextRequest, context: T): Promise<NextResponse> => {
      try {
        if (options?.allowGuest || options?.required === false) {
          return await (handler as ContextRouteHandler<T>)(request, context);
        }

        const authResult = await validateAuth(request);

        if (!authResult.authenticated) {
          return NextResponse.json(
            { error: options?.errorMessages?.unauthorized || 'Unauthorized' },
            { status: 401 }
          );
        }

        return await (handler as ContextRouteHandler<T>)(request, context);
      } catch (error) {
        authLogger.error('Auth middleware error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    };
    return contextWrapper;
  }
}

// Export convenience functions
export const withBasicAuth = withAuth;
export const withPremiumAuth = withAuth;
export const withOptionalAuth = withAuth;
export const withAdminAuth = withAuth;
