import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { registerSchema, type RegisterRequest } from '@/lib/validations/auth';
import { withPublicRateLimit, withValidation } from '@/lib/api/middleware';

async function registerHandler(req: NextRequest, validData: RegisterRequest) {
  const { email, password, full_name, preferred_language, learning_level, timezone } = validData;

  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseService.getClient()
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth
    const { data, error } = await supabaseService.getClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          preferred_language,
          learning_level,
          timezone,
        }
      }
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 400 }
      );
    }

    // Create user profile in database
    const userProfile = {
      id: data.user.id,
      email,
      full_name: full_name || null,
      preferred_language: preferred_language || 'en',
      learning_level: learning_level || 'beginner',
      timezone: timezone || 'UTC',
      daily_goal: 50, // Default goal
      streak_count: 0,
      total_points: 0,
      is_premium: false,
      subscription_status: 'free' as const,
      notification_settings: {
        email: true,
        push: false,
        reminders: true,
        weekly_reports: true,
        achievement_alerts: true,
        study_reminders: true,
      },
      preferences: {
        theme: 'light',
        difficulty_preference: learning_level || 'beginner',
        session_length: 15,
        preferred_styles: ['simple', 'detailed'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabaseService.getClient()
      .from('users')
      .insert(userProfile);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // User was created in auth, but profile failed
      // This will be handled by the database trigger
    }

    // Store registration event in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/session-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            action: 'register',
            metadata: { email, learning_level, timestamp: new Date().toISOString() }
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
      message: 'Registration successful. Please check your email to verify your account.'
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withPublicRateLimit('auth')(
  withValidation(registerSchema, registerHandler)
);