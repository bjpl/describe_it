import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { loginSchema, type LoginRequest } from '@/lib/validations/auth';
import { withPublicRateLimit, withValidation } from '@/lib/api/middleware';

async function loginHandler(req: NextRequest, validData: LoginRequest) {
  const { email, password } = validData;

  try {
    const { data, error } = await supabaseService.getClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 401 }
      );
    }

    // Update last_active_at
    await supabaseService.getClient()
      .from('users')
      .update({ 
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.user.id);

    // Store user session data in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/session-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            action: 'login',
            metadata: { email, timestamp: new Date().toISOString() }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data: {
        user: data.user,
        session: data.session,
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withPublicRateLimit('auth')(
  withValidation(loginSchema, loginHandler)
);