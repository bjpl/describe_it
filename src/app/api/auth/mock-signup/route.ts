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
    
    // For testing: just return success
    // In a real app, you'd save to a database here
    
    return NextResponse.json({
      success: true,
      message: 'Mock signup successful! (Not actually saved)',
      user: {
        id: 'mock-' + Date.now(),
        email: email,
        emailConfirmed: false
      },
      session: {
        access_token: 'mock-token-' + Date.now(),
        refresh_token: 'mock-refresh-' + Date.now(),
        expires_at: Date.now() + 3600000 // 1 hour
      }
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Mock signup error', message: error.message },
      { status: 500 }
    );
  }
}