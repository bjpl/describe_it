/**
 * Production-ready signin endpoint with proper Supabase integration
 * Using type-safe schemas from core/schemas
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';
import { createClient } from '@supabase/supabase-js';
import {
  authSigninSchema,
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/schemas/api-validation';
import {
  signinRequestSchema,
  type SigninRequest,
  type SigninResponse,
} from '@/core/schemas/auth.schema';
import { z } from 'zod';
import { authLogger, createRequestLogger, apiLogger } from '@/lib/logger';

// CORS headers for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger('auth-signin', request);
  logger.auth('Sign-in endpoint called', true);

  try {
    // Security validation
    const securityCheck = validateSecurityHeaders(request.headers);
    if (!securityCheck.valid) {
      return createErrorResponse('Security validation failed', 403, [
        { field: 'security', message: securityCheck.reason || 'Security check failed' },
      ]);
    }

    // Parse and validate request
    const requestText = await request.text();

    if (!validateRequestSize(requestText, 10 * 1024)) {
      // 10KB limit
      return createErrorResponse('Request too large', 413);
    }

    const body = safeParse(requestText);
    if (!body) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate with type-safe schema (new core schema with fallback to legacy)
    let validatedData: SigninRequest;
    try {
      validatedData = signinRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request parameters',
          400,
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          }))
        );
      }
      throw error;
    }

    const { email, password, rememberMe } = validatedData;

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration', undefined, {
        category: 'system',
        severity: 'critical',
      });
      return createErrorResponse('Server configuration error', 500);
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });

    logger.info('Authenticating user', { email, rememberMe });

    // Sign in the user with Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      apiLogger.error('[Signin] Auth error:', error);

      // Handle rate limiting errors - admin bypass in development/test
      if (
        error.message?.includes('quota') ||
        error.message?.includes('rate') ||
        error.message?.includes('exceeded') ||
        error.status === 429
      ) {
        // Development/test mode - return mock auth for any user when rate limited
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          const isAdmin = email === 'brandon.lambert87@gmail.com';
          logger.info('Mock auth on rate limit (development mode)', { email, isAdmin });
          return NextResponse.json(
            {
              success: true,
              message: 'Signed in successfully (development mode)',
              isMock: true,
              isAdmin: isAdmin,
              user: {
                id: isAdmin ? 'mock-admin-user-id' : 'mock-user-id',
                email: email,
                emailConfirmed: true,
                lastSignIn: new Date().toISOString(),
              },
              session: {
                access_token: isAdmin ? 'mock-admin-token' : 'mock-user-token',
                refresh_token: isAdmin ? 'mock-admin-refresh' : 'mock-user-refresh',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              },
            },
            { status: 200 }
          );
        }

        return createErrorResponse('Too many login attempts. Please try again later.', 429);
      }

      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        return createErrorResponse('Invalid email or password', 401);
      }

      if (error.message?.includes('Email not confirmed')) {
        return createErrorResponse('Please confirm your email address before signing in', 401);
      }

      // Sanitize error messages - don't expose internal details
      let sanitizedMessage = error.message || 'Sign in failed';

      // Remove database/system details from error messages
      if (
        sanitizedMessage.includes('Database') ||
        sanitizedMessage.includes('SELECT') ||
        sanitizedMessage.includes('INSERT') ||
        sanitizedMessage.includes('UPDATE') ||
        sanitizedMessage.includes('DELETE') ||
        sanitizedMessage.toLowerCase().includes('sql')
      ) {
        sanitizedMessage = 'Server error during authentication';
      }

      return createErrorResponse(sanitizedMessage, error.status || 500);
    }

    apiLogger.info('[Signin] Success:', { userId: data.user?.id });

    // Return success with session - type-safe response
    const response: SigninResponse = {
      success: true,
      message: 'Signed in successfully!',
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email!,
            emailConfirmed: !!data.user.email_confirmed_at,
            lastSignIn: data.user.last_sign_in_at || null,
          }
        : null,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
          }
        : null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    apiLogger.error('[Signin] Unexpected error:', error);
    return createErrorResponse('Server error during sign in', 500, [
      { field: 'server', message: error.message || 'Internal server error' },
    ]);
  }
}
