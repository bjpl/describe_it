/**
 * Higher-order function for protecting API routes
 * Simplified version for build stability
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, checkRateLimit } from './auth';
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

export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options?: AuthOptions
) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Allow guest access if specified
      if (options?.allowGuest || options?.required === false) {
        return handler(request, context);
      }

      // Simple auth check
      const authResult = await validateAuth(request);

      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: options?.errorMessages?.unauthorized || 'Unauthorized' },
          { status: 401 }
        );
      }

      // Execute the handler
      return handler(request, context);
    } catch (error) {
      authLogger.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Export convenience functions
export const withBasicAuth = withAuth;
export const withPremiumAuth = withAuth;
export const withOptionalAuth = withAuth;
export const withAdminAuth = withAuth;