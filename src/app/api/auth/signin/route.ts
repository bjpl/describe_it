/**
 * Production-ready signin endpoint with proper Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { createClient } from '@supabase/supabase-js';
import {
  authSigninSchema,
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/schemas/api-validation';
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
      return createErrorResponse(
        "Security validation failed",
        403,
        [{ field: "security", message: securityCheck.reason || "Security check failed" }]
      );
    }

    // Parse and validate request
    const requestText = await request.text();
    
    if (!validateRequestSize(requestText, 10 * 1024)) { // 10KB limit
      return createErrorResponse("Request too large", 413);
    }

    const body = safeParse(requestText);
    if (!body) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    
    // Validate with schema
    let validatedData;
    try {
      validatedData = authSigninSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          "Invalid request parameters",
          400,
          error.errors.map((err) => ({
            field: err.path.join("."),
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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration', undefined, {
        category: 'system',
        severity: 'critical'
      });
      return createErrorResponse('Server configuration error', 500);
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    logger.info('Authenticating user', { email, rememberMe });

    // Sign in the user with Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      apiLogger.error('[Signin] Auth error:', error);

      // Handle rate limiting errors
      if (error.message?.includes('quota') ||
          error.message?.includes('rate') ||
          error.message?.includes('exceeded') ||
          error.status === 429) {
        return createErrorResponse(
          'Too many login attempts. Please try again later.',
          429
        );
      }
      
      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        return createErrorResponse('Invalid email or password', 401);
      }
      
      if (error.message?.includes('Email not confirmed')) {
        return createErrorResponse('Please confirm your email address before signing in', 401);
      }
      
      return createErrorResponse(
        error.message || 'Sign in failed',
        error.status || 401
      );
    }
    
    apiLogger.info('[Signin] Success:', { userId: data.user?.id });
    
    // Return success with session
    return createSuccessResponse({
      message: 'Signed in successfully!',
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        lastSignIn: data.user.last_sign_in_at
      } : null,
      session: data.session
    });
    
  } catch (error: any) {
    apiLogger.error('[Signin] Unexpected error:', error);
    return createErrorResponse(
      'Server error during sign in', 
      500,
      [{ field: "server", message: error.message || "Internal server error" }]
    );
  }
}