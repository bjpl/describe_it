/**
 * withAuth Higher-Order Function
 * Protects API routes with authentication and authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createAuthErrorResponse, injectUserContext, hasFeatureAccess } from './auth';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth';

export interface AuthOptions {
  // Required authentication level
  required?: boolean;
  
  // Required subscription tiers (user must have one of these)
  requiredTiers?: Array<'free' | 'trial' | 'premium' | 'premium_plus'>;
  
  // Required features (user must have access to these features)
  requiredFeatures?: string[];
  
  // Allow guest access (unauthenticated users)
  allowGuest?: boolean;
  
  // Custom authorization check
  customAuthCheck?: (user: AuthenticatedUser) => Promise<boolean> | boolean;
  
  // Custom error messages
  errorMessages?: {
    authRequired?: string;
    tierRequired?: string;
    featureRequired?: string;
    customAuthFailed?: string;
  };
}

export type AuthenticatedHandler = (
  request: AuthenticatedRequest,
  context?: { params?: any }
) => Promise<NextResponse> | NextResponse;

export type RegularHandler = (
  request: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse> | NextResponse;

/**
 * Default authentication options
 */
const DEFAULT_AUTH_OPTIONS: Required<AuthOptions> = {
  required: true,
  requiredTiers: [],
  requiredFeatures: [],
  allowGuest: false,
  customAuthCheck: async () => true,
  errorMessages: {
    authRequired: 'Authentication required to access this resource',
    tierRequired: 'Your subscription tier does not have access to this feature',
    featureRequired: 'This feature is not available in your subscription plan',
    customAuthFailed: 'Access denied: authorization check failed',
  },
};

/**
 * Create a 403 Forbidden response
 */
function createForbiddenResponse(message: string, requestId?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: requestId || crypto.randomUUID(),
        statusCode: 403,
      },
    },
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
      },
    }
  );
}

/**
 * Check if user meets subscription tier requirements
 */
function checkTierRequirements(user: AuthenticatedUser, requiredTiers: string[]): boolean {
  if (requiredTiers.length === 0) return true;
  
  const userTier = user.subscription_status || 'free';
  return requiredTiers.includes(userTier);
}

/**
 * Check if user has required features
 */
function checkFeatureRequirements(user: AuthenticatedUser, requiredFeatures: string[]): boolean {
  if (requiredFeatures.length === 0) return true;
  
  return requiredFeatures.every(feature => hasFeatureAccess(user, feature));
}

/**
 * Higher-order function to add authentication to API routes
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: AuthOptions = {}
): RegularHandler {
  const config = { ...DEFAULT_AUTH_OPTIONS, ...options };

  return async (request: NextRequest, context?: { params?: any }): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    try {
      // Perform authentication
      const authResult = await authenticate(request);

      // Handle authentication failure
      if (!authResult.success) {
        // Allow guest access if configured
        if (config.allowGuest && !config.required) {
          const guestRequest = injectUserContext(
            { success: true, user: undefined },
            request
          );
          return await handler(guestRequest, context);
        }

        return createAuthErrorResponse(authResult, requestId);
      }

      const { user } = authResult;
      if (!user) {
        return createAuthErrorResponse({
          success: false,
          error: config.errorMessages.authRequired,
          statusCode: 401,
        }, requestId);
      }

      // Check subscription tier requirements
      if (!checkTierRequirements(user, config.requiredTiers)) {
        const requiredTiersStr = config.requiredTiers.join(', ');
        const message = `${config.errorMessages.tierRequired}. Required: ${requiredTiersStr}, Current: ${user.subscription_status || 'free'}`;
        return createForbiddenResponse(message, requestId);
      }

      // Check feature requirements
      if (!checkFeatureRequirements(user, config.requiredFeatures)) {
        const message = `${config.errorMessages.featureRequired}. Required features: ${config.requiredFeatures.join(', ')}`;
        return createForbiddenResponse(message, requestId);
      }

      // Custom authorization check
      if (config.customAuthCheck) {
        try {
          const customAuthPassed = await config.customAuthCheck(user);
          if (!customAuthPassed) {
            return createForbiddenResponse(config.errorMessages.customAuthFailed, requestId);
          }
        } catch (error: any) {
          console.error('Custom auth check error:', error);
          return createForbiddenResponse(
            `Authorization check failed: ${error.message}`,
            requestId
          );
        }
      }

      // Inject user context into request
      const authenticatedRequest = injectUserContext(authResult, request);

      // Call the protected handler
      const response = await handler(authenticatedRequest, context);

      // Add auth-related headers to response
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Add user info headers (non-sensitive data only)
      newResponse.headers.set('X-User-Tier', user.subscription_status || 'free');
      newResponse.headers.set('X-Request-ID', requestId);
      
      // Add rate limit info
      if (authResult.rateLimitInfo) {
        const { rateLimitInfo } = authResult;
        newResponse.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        newResponse.headers.set('X-RateLimit-Reset', new Date(rateLimitInfo.resetTime).toISOString());
      }

      // Add response time
      const responseTime = performance.now() - startTime;
      newResponse.headers.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);

      return newResponse;

    } catch (error: any) {
      console.error('withAuth middleware error:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication middleware error',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
          },
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
          },
        }
      );
    }
  };
}

/**
 * Convenience function for routes that require premium access
 */
export function withPremiumAuth(
  handler: AuthenticatedHandler,
  additionalOptions: Partial<AuthOptions> = {}
): RegularHandler {
  return withAuth(handler, {
    required: true,
    requiredTiers: ['premium', 'premium_plus'],
    ...additionalOptions,
  });
}

/**
 * Convenience function for routes that allow free tier but require auth
 */
export function withBasicAuth(
  handler: AuthenticatedHandler,
  additionalOptions: Partial<AuthOptions> = {}
): RegularHandler {
  return withAuth(handler, {
    required: true,
    requiredTiers: ['free', 'trial', 'premium', 'premium_plus'],
    ...additionalOptions,
  });
}

/**
 * Convenience function for routes that work for both authenticated and guest users
 */
export function withOptionalAuth(
  handler: AuthenticatedHandler,
  additionalOptions: Partial<AuthOptions> = {}
): RegularHandler {
  return withAuth(handler, {
    required: false,
    allowGuest: true,
    ...additionalOptions,
  });
}

/**
 * Convenience function for admin-only routes
 */
export function withAdminAuth(
  handler: AuthenticatedHandler,
  additionalOptions: Partial<AuthOptions> = {}
): RegularHandler {
  return withAuth(handler, {
    required: true,
    requiredTiers: ['premium_plus'],
    customAuthCheck: (user) => {
      // Add additional admin checks here if needed
      // For now, premium_plus is considered admin level
      return true;
    },
    errorMessages: {
      authRequired: 'Admin authentication required',
      tierRequired: 'Admin access required (premium_plus subscription)',
      ...additionalOptions.errorMessages,
    },
    ...additionalOptions,
  });
}

export default withAuth;