/**
 * Supabase Auth Callback Handler
 * Handles OAuth redirects and email confirmation links
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authLogger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  authLogger.info('[Auth Callback] Request received:', {
    hasCode: !!code,
    hasError: !!error,
    error,
    errorDescription,
    origin: requestUrl.origin
  });

  // Handle error from Supabase
  if (error) {
    authLogger.error('[Auth Callback] Auth error:', { error, errorDescription });
    return NextResponse.redirect(
      `${requestUrl.origin}/?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Exchange code for session
  if (code) {
    try {
      // Create direct Supabase client (not SSR client - avoids cookie issues)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        authLogger.error('[Auth Callback] Missing Supabase credentials');
        return NextResponse.redirect(
          `${requestUrl.origin}/?error=${encodeURIComponent('Server configuration error')}`
        );
      }

      authLogger.info('[Auth Callback] Creating Supabase client:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlPrefix: supabaseUrl.substring(0, 30)
      });

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      authLogger.info('[Auth Callback] Exchanging code for session...');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        authLogger.error('[Auth Callback] Code exchange failed:', exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/?error=${encodeURIComponent('Authentication failed')}`
        );
      }

      authLogger.info('[Auth Callback] Code exchange successful:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        email: data.user?.email
      });

      // Create response with redirect
      const response = NextResponse.redirect(`${requestUrl.origin}/?auth=success`);

      // Set session cookies for client
      if (data.session) {
        const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
        response.cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }

      return response;
    } catch (error: any) {
      authLogger.error('[Auth Callback] Unexpected error:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/?error=${encodeURIComponent('Server error during authentication')}`
      );
    }
  }

  // No code or error - redirect to home
  authLogger.warn('[Auth Callback] No code or error in callback');
  return NextResponse.redirect(requestUrl.origin);
}
