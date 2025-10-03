/**
 * Integration Examples for Rate Limiting
 * 
 * This file demonstrates how to integrate the rate limiting system
 * with existing API routes in the Describe-It application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RateLimitMiddleware, QuickSetup } from './index';
import { withBasicAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { logger } from '@/lib/logger';

/**
 * Example 1: Adding rate limiting to authentication endpoints
 * 
 * Apply strict rate limiting to prevent brute force attacks
 */
export function integrateAuthRateLimit() {
  // Original handler
  async function handleSignin(request: AuthenticatedRequest): Promise<NextResponse> {
    // ... existing signin logic
    return NextResponse.json({ success: true });
  }

  // With rate limiting applied
  const rateLimitedSignin = QuickSetup.forAuth(handleSignin);

  // For Next.js API routes, export like this:
  // export const POST = rateLimitedSignin;
  
  return rateLimitedSignin;
}

/**
 * Example 2: Adding tier-based rate limiting to description generation
 * 
 * Different limits for free vs paid users
 */
export function integrateDescriptionRateLimit() {
  // Original handler with auth
  const originalHandler = withBasicAuth(
    async (request: AuthenticatedRequest): Promise<NextResponse> => {
      // ... existing description generation logic
      return NextResponse.json({ success: true, data: [] });
    }
  );

  // Enhanced with rate limiting based on user tier
  const rateLimitedHandler = async (request: AuthenticatedRequest): Promise<NextResponse> => {
    // Determine user tier from request
    const userTier = request.user?.subscription_status || 'free';
    const isPaidTier = userTier === 'pro' || userTier === 'premium';

    // Apply appropriate rate limiting
    const rateLimitedWithTier = QuickSetup.forDescriptions(originalHandler, isPaidTier ? 'paid' : 'free');
    
    return rateLimitedWithTier(request);
  };

  return rateLimitedHandler;
}

/**
 * Example 3: Custom rate limiting with business logic
 * 
 * Complex rate limiting that considers multiple factors
 */
export function integrateCustomRateLimit() {
  const customRateLimitedHandler = withRateLimit(
    async (request: NextRequest): Promise<NextResponse> => {
      // ... existing API logic
      return NextResponse.json({ success: true });
    },
    {
      // Custom configuration
      config: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 50,
        keyGenerator: (req) => {
          // Custom key generation logic
          const userId = req.headers.get('x-user-id') || 'anonymous';
          const apiKey = req.headers.get('x-api-key');
          const clientType = req.headers.get('x-client-type') || 'web';
          
          // Different limits for different client types
          return `${userId}:${clientType}:${apiKey ? 'api' : 'web'}`;
        },
      },
      message: 'Custom rate limit exceeded for this operation',
      enableExpBackoff: true,
      bypassAdmin: true,
      onLimitExceeded: (req, result) => {
        // Custom logging or alerting
        logger.warn('Custom rate limit exceeded:', {
          url: req.url,
          method: req.method,
          headers: Object.fromEntries(req.headers.entries()),
          timestamp: new Date().toISOString(),
        });
      },
      skipIf: (req) => {
        // Skip rate limiting for health checks
        return req.url.includes('/health') || req.url.includes('/status');
      }
    }
  );

  return customRateLimitedHandler;
}

/**
 * Example 4: Multiple rate limiting layers
 * 
 * Apply both burst protection and regular rate limiting
 */
export function integrateLayeredRateLimit() {
  const handler = async (request: NextRequest): Promise<NextResponse> => {
    // ... existing logic
    return NextResponse.json({ success: true });
  };

  // Apply burst protection first
  const burstProtected = QuickSetup.forBurst(handler);
  
  // Then apply general rate limiting
  const fullyProtected = QuickSetup.forAPI(burstProtected);

  return fullyProtected;
}

/**
 * Example 5: Conditional rate limiting based on endpoint sensitivity
 * 
 * Different rate limits for different operations
 */
export function integrateConditionalRateLimit() {
  const handler = async (request: NextRequest): Promise<NextResponse> => {
    const url = new URL(request.url);
    const path = url.pathname;

    // Determine sensitivity level
    if (path.includes('/admin/') || path.includes('/dangerous')) {
      // Apply strict rate limiting to sensitive endpoints
      return QuickSetup.forSensitive(
        async (req: NextRequest) => {
          // ... sensitive operation logic
          return NextResponse.json({ success: true });
        }
      )(request);
    } else if (path.includes('/auth/')) {
      // Apply auth rate limiting
      return QuickSetup.forAuth(
        async (req: NextRequest) => {
          // ... auth operation logic
          return NextResponse.json({ success: true });
        }
      )(request);
    } else {
      // Apply general rate limiting
      return QuickSetup.forAPI(
        async (req: NextRequest) => {
          // ... general operation logic
          return NextResponse.json({ success: true });
        }
      )(request);
    }
  };

  return handler;
}

/**
 * Example 6: Integration with existing middleware chain
 * 
 * Show how to integrate rate limiting with existing middleware
 */
export function integrateWithMiddlewareChain() {
  // Existing middleware imports would go here
  // import { withMonitoring } from '@/lib/monitoring/middleware';
  // import { withSecurity } from '@/lib/security/secure-middleware';

  const baseHandler = async (request: AuthenticatedRequest): Promise<NextResponse> => {
    // ... base logic
    return NextResponse.json({ success: true });
  };

  // Build middleware chain (order matters!)
  const withCompleteProtection = withBasicAuth(
    // Rate limiting should typically go early in the chain
    QuickSetup.forAPI(
      // Then other middleware...
      // withMonitoring(
      //   withSecurity(
            baseHandler
      //   )
      // )
    )
  );

  return withCompleteProtection;
}

/**
 * Example 7: Rate limiting with user context
 * 
 * Use user information to make rate limiting decisions
 */
export function integrateUserContextRateLimit() {
  const handler = withRateLimit(
    async (request: NextRequest): Promise<NextResponse> => {
      // ... existing logic
      return NextResponse.json({ success: true });
    },
    {
      config: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100, // Base limit
        keyGenerator: (req) => {
          const userId = req.headers.get('x-user-id') || 'anonymous';
          const userTier = req.headers.get('x-user-tier') || 'free';
          
          // Include tier in the key so different tiers get different buckets
          return `${userId}:${userTier}`;
        },
      },
      // Override limits based on user tier
      skipIf: (req) => {
        const userTier = req.headers.get('x-user-tier');
        // Enterprise users get unlimited requests
        return userTier === 'enterprise';
      },
    }
  );

  return handler;
}

/**
 * Example 8: Development and testing utilities
 * 
 * Show how to disable or mock rate limiting for development
 */
export function integrateWithDevelopmentMode() {
  const handler = async (request: NextRequest): Promise<NextResponse> => {
    // ... existing logic
    return NextResponse.json({ success: true });
  };

  // Conditional rate limiting based on environment
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMITING === 'true') {
    logger.info('[Dev] Rate limiting disabled for development');
    return handler;
  }

  // Apply rate limiting in production/staging
  return QuickSetup.forAPI(handler);
}

/**
 * Utility function to create a rate limited version of existing API routes
 * 
 * This is a helper to quickly add rate limiting to existing routes without major refactoring
 */
export function addRateLimitingToExistingRoute(
  existingHandler: (req: NextRequest) => Promise<NextResponse>,
  type: 'auth' | 'descriptions' | 'api' | 'sensitive' | 'custom',
  customConfig?: Parameters<typeof withRateLimit>[1]
) {
  switch (type) {
    case 'auth':
      return QuickSetup.forAuth(existingHandler);
    
    case 'descriptions':
      return QuickSetup.forDescriptions(existingHandler);
    
    case 'api':
      return QuickSetup.forAPI(existingHandler);
    
    case 'sensitive':
      return QuickSetup.forSensitive(existingHandler);
    
    case 'custom':
      if (!customConfig) {
        throw new Error('Custom config required for custom rate limiting');
      }
      return withRateLimit(existingHandler, customConfig);
    
    default:
      return QuickSetup.forAPI(existingHandler);
  }
}

// Export examples for documentation and testing
export const IntegrationExamples = {
  auth: integrateAuthRateLimit,
  descriptions: integrateDescriptionRateLimit,
  custom: integrateCustomRateLimit,
  layered: integrateLayeredRateLimit,
  conditional: integrateConditionalRateLimit,
  middlewareChain: integrateWithMiddlewareChain,
  userContext: integrateUserContextRateLimit,
  development: integrateWithDevelopmentMode,
  utility: addRateLimitingToExistingRoute,
} as const;