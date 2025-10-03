/**
 * Higher-order function for protecting API routes
 * Simplified version for build stability
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, checkRateLimit } from './auth';
import { authLogger } from '@/lib/logger';

export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Simple auth check
      const authResult = await validateAuth(request);
      
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: 'Unauthorized' },
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