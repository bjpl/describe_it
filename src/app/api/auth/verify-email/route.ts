/**
 * Email Verification Endpoint
 *
 * Handles email verification tokens from Supabase
 * Verifies the token and confirms the user's email
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse } from '@/lib/utils/json-safe';
import { createClient } from '@supabase/supabase-js';
import {
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/schemas/api-validation';
import { z } from 'zod';
import { authLogger, createRequestLogger, apiLogger } from '@/lib/logger';

// Verification request schema
const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  type: z.enum(['signup', 'email_change', 'recovery']).optional().default('signup'),
});

type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

// Response schema
const verifyEmailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  verified: z.boolean(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    emailConfirmed: z.boolean(),
  }).nullable().optional(),
});

type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET handler for email verification links
export async function GET(request: NextRequest) {
  const logger = createRequestLogger('auth-verify-email', request);
  logger.auth('Email verification via GET', true);

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || searchParams.get('token_hash');
    const type = searchParams.get('type') as 'signup' | 'email_change' | 'recovery' || 'signup';

    if (!token) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL('/auth/error?message=Missing+verification+token', request.url)
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration', undefined, {
        category: 'system',
        severity: 'critical',
      });
      return NextResponse.redirect(
        new URL('/auth/error?message=Server+configuration+error', request.url)
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : type === 'email_change' ? 'email_change' : 'signup',
    });

    if (error) {
      apiLogger.error('[VerifyEmail] Verification failed:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, request.url)
      );
    }

    apiLogger.info('[VerifyEmail] Email verified successfully', { userId: data.user?.id });

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/auth/verified?success=true', request.url)
    );
  } catch (error: any) {
    apiLogger.error('[VerifyEmail] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Verification+failed', request.url)
    );
  }
}

// POST handler for programmatic verification
export async function POST(request: NextRequest) {
  const logger = createRequestLogger('auth-verify-email', request);
  logger.auth('Email verification via POST', true);

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

    if (!validateRequestSize(requestText, 4096)) {
      return createErrorResponse('Request too large', 413);
    }

    const body = safeParse(requestText);
    if (!body) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate with schema
    let validatedData: VerifyEmailRequest;
    try {
      validatedData = verifyEmailRequestSchema.parse(body);
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

    const { token, type } = validatedData;

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
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('Verifying email token', { type });

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : type === 'email_change' ? 'email_change' : 'signup',
    });

    if (error) {
      apiLogger.error('[VerifyEmail] Verification failed:', error);

      // Handle specific error cases
      if (error.message?.includes('expired')) {
        return createErrorResponse('Verification token has expired. Please request a new one.', 400);
      }
      if (error.message?.includes('invalid')) {
        return createErrorResponse('Invalid verification token.', 400);
      }

      return createErrorResponse(error.message || 'Verification failed', error.status || 400);
    }

    apiLogger.info('[VerifyEmail] Email verified successfully', { userId: data.user?.id });

    // Return success response
    const response: VerifyEmailResponse = {
      success: true,
      message: 'Email verified successfully!',
      verified: true,
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email!,
            emailConfirmed: !!data.user.email_confirmed_at,
          }
        : null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    apiLogger.error('[VerifyEmail] Unexpected error:', error);
    return createErrorResponse('Server error during verification', 500, [
      { field: 'server', message: error.message || 'Internal server error' },
    ]);
  }
}
