/**
 * Supabase Auth Callback Handler
 * Handles OAuth redirects and email confirmation links
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  authLogger.info('[Auth Callback] Request received:', {
    hasCode: !!code,
    hasError: !!error,
    error,
    errorDescription
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
      const supabase = await createServerSupabaseClient();
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

      // Successful authentication - redirect to home
      return NextResponse.redirect(`${requestUrl.origin}/?auth=success`);
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
