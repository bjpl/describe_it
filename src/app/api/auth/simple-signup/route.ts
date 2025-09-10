/**
 * Simplified auth endpoint that definitely works
 * This bypasses all complexity and just does basic signup
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[SimpleSignup] Endpoint called');
  
  try {
    const body = await request.json();
    console.log('[SimpleSignup] Request body:', { email: body.email, hasPassword: !!body.password });
    
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[SimpleSignup] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl?.substring(0, 30)
    });
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration missing' },
        { status: 500 }
      );
    }
    
    // Make direct HTTP request to Supabase Auth API
    const signupUrl = `${supabaseUrl}/auth/v1/signup`;
    
    console.log('[SimpleSignup] Calling Supabase:', signupUrl);
    
    const response = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        email,
        password,
        options: {
          emailRedirectTo: 'https://describe-it-lovat.vercel.app/auth/callback'
        }
      })
    });
    
    const responseText = await response.text();
    console.log('[SimpleSignup] Supabase response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 200)
    });
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: result.error_description || result.msg || result.message || 'Signup failed',
          details: result,
          status: response.status
        },
        { status: response.status }
      );
    }
    
    // Success!
    return NextResponse.json({
      success: true,
      message: 'Check your email to confirm your account',
      user: result.user,
      session: result.session
    });
    
  } catch (error: any) {
    console.error('[SimpleSignup] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Server error during signup',
        message: error.message,
        type: error.constructor.name
      },
      { status: 500 }
    );
  }
}