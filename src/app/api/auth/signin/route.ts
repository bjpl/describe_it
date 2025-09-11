/**
 * Production-ready signin endpoint with proper Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  console.log('[Signin] Endpoint called');
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Signin] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('[Signin] Authenticating user:', email);
    
    // Sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('[Signin] Auth error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      if (error.message?.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: 'Please confirm your email address before signing in' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { 
          error: error.message || 'Sign in failed',
          code: error.code
        },
        { status: error.status || 401, headers: corsHeaders }
      );
    }
    
    console.log('[Signin] Success:', { userId: data.user?.id });
    
    // Return success with session
    return NextResponse.json({
      success: true,
      message: 'Signed in successfully!',
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        lastSignIn: data.user.last_sign_in_at
      } : null,
      session: data.session
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('[Signin] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Server error during sign in',
        message: error.message
      },
      { status: 500, headers: corsHeaders }
    );
  }
}