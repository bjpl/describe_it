/**
 * Password Reset Request Endpoint
 *
 * Sends a password reset email via Supabase Auth
 * Uses type-safe schemas from core/schemas
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
import {
  resetPasswordRequestSchema,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
} from '@/core/schemas/auth.schema';
import { z } from 'zod';
import { authLogger, createRequestLogger, apiLogger } from '@/lib/logger';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger('auth-reset-password', request);
  logger.auth('Password reset requested', true);

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

    if (!validateRequestSize(requestText, 1024)) {
      return createErrorResponse('Request too large', 413);
    }

    const body = safeParse(requestText);
    if (!body) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate with type-safe schema
    let validatedData: ResetPasswordRequest;
    try {
      validatedData = resetPasswordRequestSchema.parse(body);
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

    const { email } = validatedData;

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

    logger.info('Sending password reset email', { email });

    // Request password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://describe-it-lovat.vercel.app'}/auth/update-password`,
    });

    if (error) {
      apiLogger.error('[ResetPassword] Auth error:', error);

      // Handle rate limiting
      if (
        error.message?.includes('quota') ||
        error.message?.includes('rate') ||
        error.status === 429
      ) {
        return createErrorResponse('Too many reset requests. Please try again later.', 429);
      }

      // Don't reveal if email exists for security
      // Always return success to prevent email enumeration
      logger.warn('Password reset failed but returning success', { email, error: error.message });
    }

    apiLogger.info('[ResetPassword] Request processed', { email });

    // Always return success for security (prevent email enumeration)
    const response: ResetPasswordResponse = {
      success: true,
      message: 'If an account exists with that email, a password reset link will be sent.',
      resetEmailSent: true,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    apiLogger.error('[ResetPassword] Unexpected error:', error);
    return createErrorResponse('Server error during password reset', 500, [
      { field: 'server', message: error.message || 'Internal server error' },
    ]);
  }
}
