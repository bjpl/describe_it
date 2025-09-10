/**
 * Mock signup endpoint for testing
 * This bypasses Supabase completely and just returns success
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // For testing: return success with auto-confirmed account
    // This is mock data - not saved to any database
    
    console.log('[MockAuth] Creating mock user for:', email);
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully! (Mock mode - not saved to database)',
      user: {
        id: 'mock-' + Date.now(),
        email: email,
        email_confirmed_at: new Date().toISOString(), // Auto-confirmed for mock
        emailConfirmed: true
      },
      session: {
        access_token: 'mock-token-' + Date.now(),
        refresh_token: 'mock-refresh-' + Date.now(),
        expires_at: Date.now() + 3600000, // 1 hour
        user: {
          id: 'mock-' + Date.now(),
          email: email,
          email_confirmed_at: new Date().toISOString()
        }
      }
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Mock signup error', message: error.message },
      { status: 500 }
    );
  }
}