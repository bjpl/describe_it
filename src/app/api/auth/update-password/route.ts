/**
 * Update Password Endpoint
 *
 * Handles password updates for authenticated users
 * and password resets via recovery tokens
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
  updatePasswordRequestSchema,
  type UpdatePasswordRequest,
  type UpdatePasswordResponse,
} from '@/core/schemas/auth.schema';
import { z } from 'zod';
import { authLogger, createRequestLogger, apiLogger } from '@/lib/logger';

// Schema for password reset (with token, no current password required)
const resetPasswordWithTokenSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

type ResetPasswordWithToken = z.infer<typeof resetPasswordWithTokenSchema>;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST: Update password with recovery token (password reset flow)
export async function POST(request: NextRequest) {
  const logger = createRequestLogger('auth-update-password', request);
  logger.auth('Password update with token', true);

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
    let validatedData: ResetPasswordWithToken;
    try {
      validatedData = resetPasswordWithTokenSchema.parse(body);
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

    const { accessToken, newPassword } = validatedData;

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

    // Create Supabase client with the user's access token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    logger.info('Updating password with access token');

    // Update the user's password
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      apiLogger.error('[UpdatePassword] Password update failed:', error);

      // Handle specific error cases
      if (error.message?.includes('expired')) {
        return createErrorResponse('Session has expired. Please request a new password reset.', 401);
      }
      if (error.message?.includes('invalid')) {
        return createErrorResponse('Invalid or expired token.', 401);
      }
      if (error.message?.includes('same password')) {
        return createErrorResponse('New password must be different from your current password.', 400);
      }

      return createErrorResponse(error.message || 'Password update failed', error.status || 400);
    }

    apiLogger.info('[UpdatePassword] Password updated successfully', { userId: data.user?.id });

    // Return success response
    const response: UpdatePasswordResponse = {
      success: true,
      message: 'Password updated successfully!',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    apiLogger.error('[UpdatePassword] Unexpected error:', error);
    return createErrorResponse('Server error during password update', 500, [
      { field: 'server', message: error.message || 'Internal server error' },
    ]);
  }
}

// PUT: Update password for authenticated user (change password flow)
export async function PUT(request: NextRequest) {
  const logger = createRequestLogger('auth-change-password', request);
  logger.auth('Password change for authenticated user', true);

  try {
    // Security validation
    const securityCheck = validateSecurityHeaders(request.headers);
    if (!securityCheck.valid) {
      return createErrorResponse('Security validation failed', 403, [
        { field: 'security', message: securityCheck.reason || 'Security check failed' },
      ]);
    }

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Authentication required', 401);
    }
    const accessToken = authHeader.slice(7);

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
    let validatedData: UpdatePasswordRequest;
    try {
      validatedData = updatePasswordRequestSchema.parse(body);
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

    const { currentPassword, newPassword } = validatedData;

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
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return createErrorResponse('Invalid or expired session', 401);
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userData.user.email!,
      password: currentPassword,
    });

    if (verifyError) {
      return createErrorResponse('Current password is incorrect', 401);
    }

    logger.info('Changing password for user', { userId: userData.user.id });

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      apiLogger.error('[ChangePassword] Password change failed:', error);
      return createErrorResponse(error.message || 'Password change failed', error.status || 400);
    }

    apiLogger.info('[ChangePassword] Password changed successfully', { userId: userData.user.id });

    // Return success response
    const response: UpdatePasswordResponse = {
      success: true,
      message: 'Password changed successfully!',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    apiLogger.error('[ChangePassword] Unexpected error:', error);
    return createErrorResponse('Server error during password change', 500, [
      { field: 'server', message: error.message || 'Internal server error' },
    ]);
  }
}
