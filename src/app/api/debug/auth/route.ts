import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const hasUrl = !!supabaseUrl;
    const hasKey = !!supabaseAnonKey;
    
    if (!hasUrl || !hasKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        hasUrl,
        hasKey,
        urlLength: supabaseUrl?.length || 0,
        keyLength: supabaseAnonKey?.length || 0
      });
    }

    // Try to create a client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test connection with a simple query
    const { data, error } = await supabase.auth.getSession();
    
    return NextResponse.json({
      status: 'success',
      message: 'Supabase connection successful',
      hasUrl,
      hasKey,
      urlFormat: supabaseUrl.includes('supabase.co') ? 'valid' : 'invalid',
      sessionCheck: error ? 'failed' : 'success',
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to Supabase',
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({
        status: 'error',
        message: 'Email and password are required'
      }, { status: 400 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Signup failed',
        error: error.message,
        code: error.status,
        details: error
      }, { status: 400 });
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Signup successful',
      user: data.user?.email,
      session: !!data.session,
      confirmationRequired: !data.session && !!data.user
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to process signup',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}