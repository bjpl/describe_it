/**
 * Simplified Supabase client for debugging
 * This creates a basic client without SSR complications
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a simple client for browser use
export const supabaseSimple = typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null;

// Debug function to test connection
export async function testSupabaseConnection() {
  if (!supabaseSimple) {
    return {
      success: false,
      error: 'Supabase client not initialized',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      isBrowser: typeof window !== 'undefined'
    };
  }

  try {
    const { data, error } = await supabaseSimple.auth.getSession();
    return {
      success: !error,
      error: error?.message || null,
      hasSession: !!data?.session,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error',
      stack: err.stack
    };
  }
}

// Simple signup function for testing
export async function testSignup(email: string, password: string) {
  if (!supabaseSimple) {
    return {
      success: false,
      error: 'Supabase client not initialized'
    };
  }

  try {
    const { data, error } = await supabaseSimple.auth.signUp({
      email,
      password
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        code: error.status,
        details: error
      };
    }

    return {
      success: true,
      user: data.user?.email,
      session: !!data.session,
      confirmationRequired: !data.session && !!data.user
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error'
    };
  }
}