/**
 * Authentication Middleware
 * Comprehensive JWT and Supabase session validation with user-tier rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { rateLimiter } from '@/lib/security/rateLimiter';
import type { Database, User } from '@/types/database';
import jwt from 'jsonwebtoken';

// User subscription tiers with rate limits
const RATE_LIMITS = {
  free: {
    perHour: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 15 * 60 * 1000, // 15 minute block
  },
  premium: {
    perHour: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  },
  premium_plus: {
    perHour: Infinity, // Unlimited
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 0, // No blocking
  },
  trial: {
    perHour: 200, // Higher than free during trial
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 10 * 60 * 1000, // 10 minute block
  }
} as const;

export interface AuthenticatedUser extends User {
  subscription_status: 'free' | 'premium' | 'premium_plus' | 'trial';
  jwt?: string;
  session?: any;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
  rateLimitInfo?: {
    limited: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  };
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
  rateLimitInfo?: {
    limited: boolean;
    remaining: number;
    resetTime: number;
  };
}

/**
 * Configure user-tier rate limiting
 */
function configureUserRateLimits() {
  // Configure rate limits for each user tier
  Object.entries(RATE_LIMITS).forEach(([tier, config]) => {
    if (config.perHour !== Infinity) {
      rateLimiter.configure(`user-${tier}`, {
        windowMs: config.windowMs,
        maxRequests: config.perHour,
        blockDurationMs: config.blockDurationMs,
        keyGenerator: (identifier: string) => `user-${tier}:${identifier}`,
      });
    }
  });
}

// Initialize rate limiting configuration
configureUserRateLimits();

/**
 * Extract JWT token from request headers
 */
function extractJWTToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Verify JWT token
 */
async function verifyJWTToken(token: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
  try {
    const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (!secret) {
      return { valid: false, error: 'JWT secret not configured' };
    }

    const payload = jwt.verify(token, secret) as any;
    
    // Verify token expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Invalid token' };
  }
}

/**
 * Get Supabase session from request
 */
async function getSupabaseSession(request: NextRequest): Promise<{ session?: any; user?: any; error?: string }> {
  try {
    // Try to get session from cookies first
    const cookieStore = cookies();
    const supabaseClient = createServerComponentClient<Database>({ cookies: () => cookieStore });
    
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Supabase session error:', error);
      return { error: error.message };
    }

    if (session?.user) {
      return { session, user: session.user };
    }

    return { error: 'No active session' };
  } catch (error: any) {
    console.error('Failed to get Supabase session:', error);
    return { error: error.message || 'Session verification failed' };
  }
}

/**
 * Get user details from database
 */
async function getUserDetails(userId: string): Promise<{ user?: User; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { error: 'Database connection not available' };
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Database user query error:', error);
      return { error: error.message };
    }

    if (!user) {
      return { error: 'User not found' };
    }

    return { user };
  } catch (error: any) {
    console.error('Failed to get user details:', error);
    return { error: error.message || 'Database query failed' };
  }
}

/**
 * Check user-tier rate limiting
 */
async function checkUserRateLimit(user: AuthenticatedUser, request: NextRequest): Promise<{
  limited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}> {
  const tier = user.subscription_status || 'free';
  const rateConfig = RATE_LIMITS[tier];
  
  // Premium Plus users have unlimited access
  if (rateConfig.perHour === Infinity) {
    return {
      limited: false,
      remaining: Infinity,
      resetTime: Date.now() + rateConfig.windowMs,
    };
  }

  // Check rate limit for this user tier
  const rateLimitKey = `user-${tier}`;
  const userIdentifier = user.id;
  
  try {
    return await rateLimiter.isRateLimited(rateLimitKey, userIdentifier);
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fall back to allowing the request if rate limiting fails
    return {
      limited: false,
      remaining: rateConfig.perHour,
      resetTime: Date.now() + rateConfig.windowMs,
    };
  }
}

/**
 * Main authentication function
 */
export async function authenticate(request: NextRequest): Promise<AuthResult> {
  try {
    let user: AuthenticatedUser | undefined;
    let authMethod: 'jwt' | 'session' | null = null;

    // Try JWT authentication first
    const jwtToken = extractJWTToken(request);
    if (jwtToken) {
      const jwtResult = await verifyJWTToken(jwtToken);
      if (jwtResult.valid && jwtResult.payload?.sub) {
        const userDetails = await getUserDetails(jwtResult.payload.sub);
        if (userDetails.user) {
          user = { ...userDetails.user, jwt: jwtToken } as AuthenticatedUser;
          authMethod = 'jwt';
        }
      }
    }

    // Try Supabase session authentication if JWT didn't work
    if (!user) {
      const sessionResult = await getSupabaseSession(request);
      if (sessionResult.user && sessionResult.session) {
        const userDetails = await getUserDetails(sessionResult.user.id);
        if (userDetails.user) {
          user = { ...userDetails.user, session: sessionResult.session } as AuthenticatedUser;
          authMethod = 'session';
        }
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401,
      };
    }

    // Ensure subscription_status has a default value
    if (!user.subscription_status) {
      user.subscription_status = 'free';
    }

    // Check user-tier rate limiting
    const rateLimitResult = await checkUserRateLimit(user, request);
    
    if (rateLimitResult.limited) {
      return {
        success: false,
        error: `Rate limit exceeded for ${user.subscription_status} tier`,
        statusCode: 429,
        rateLimitInfo: rateLimitResult,
      };
    }

    return {
      success: true,
      user,
      rateLimitInfo: rateLimitResult,
    };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
      statusCode: 500,
    };
  }
}

/**
 * Middleware to inject user context into requests
 */
export function injectUserContext(authResult: AuthResult, request: NextRequest): AuthenticatedRequest {
  const authenticatedRequest = request as AuthenticatedRequest;
  
  if (authResult.success && authResult.user) {
    authenticatedRequest.user = authResult.user;
    authenticatedRequest.rateLimitInfo = authResult.rateLimitInfo;
  }
  
  return authenticatedRequest;
}

/**
 * Create error responses for authentication failures
 */
export function createAuthErrorResponse(
  authResult: AuthResult,
  requestId?: string
): NextResponse {
  const timestamp = new Date().toISOString();
  const statusCode = authResult.statusCode || 401;

  const responseBody = {
    success: false,
    error: authResult.error || 'Authentication failed',
    metadata: {
      timestamp,
      requestId: requestId || crypto.randomUUID(),
      statusCode,
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'no-referrer',
  };

  // Add rate limit headers for 429 responses
  if (statusCode === 429 && authResult.rateLimitInfo) {
    const { rateLimitInfo } = authResult;
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = new Date(rateLimitInfo.resetTime).toISOString();
    
    if (rateLimitInfo.retryAfter) {
      headers['Retry-After'] = rateLimitInfo.retryAfter.toString();
    }
  }

  // Add WWW-Authenticate header for 401 responses
  if (statusCode === 401) {
    headers['WWW-Authenticate'] = 'Bearer realm="API", error="invalid_token"';
  }

  return NextResponse.json(responseBody, {
    status: statusCode,
    headers,
  });
}

/**
 * Utility function to get user subscription benefits
 */
export function getUserBenefits(user: AuthenticatedUser): {
  rateLimitPerHour: number;
  features: string[];
  priority: 'low' | 'normal' | 'high';
} {
  const tier = user.subscription_status || 'free';
  
  const benefits = {
    free: {
      rateLimitPerHour: RATE_LIMITS.free.perHour,
      features: ['basic_descriptions', 'image_search', 'vocabulary_save'],
      priority: 'low' as const,
    },
    trial: {
      rateLimitPerHour: RATE_LIMITS.trial.perHour,
      features: ['basic_descriptions', 'image_search', 'vocabulary_save', 'qa_generation', 'export_csv'],
      priority: 'normal' as const,
    },
    premium: {
      rateLimitPerHour: RATE_LIMITS.premium.perHour,
      features: ['all_descriptions', 'advanced_search', 'bulk_operations', 'qa_generation', 'all_exports', 'progress_analytics'],
      priority: 'high' as const,
    },
    premium_plus: {
      rateLimitPerHour: Infinity,
      features: ['unlimited_access', 'priority_support', 'custom_styles', 'api_access', 'advanced_analytics'],
      priority: 'high' as const,
    },
  };

  return benefits[tier] || benefits.free;
}

/**
 * Check if user has access to specific feature
 */
export function hasFeatureAccess(user: AuthenticatedUser, feature: string): boolean {
  const benefits = getUserBenefits(user);
  return benefits.features.includes(feature) || benefits.features.includes('unlimited_access');
}

export default {
  authenticate,
  injectUserContext,
  createAuthErrorResponse,
  getUserBenefits,
  hasFeatureAccess,
};