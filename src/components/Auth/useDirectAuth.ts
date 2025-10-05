/**
 * Direct authentication hook that bypasses AuthManager
 * Used as a fallback when AuthManager has issues
 */

import { useState } from 'react';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import { authLogger } from '@/lib/logger';

export function useDirectAuth() {
  const [loading, setLoading] = useState(false);

  const directSignIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success && data.session) {
        // Store session in localStorage
        safeSetLocalStorage('auth_session', data.session);
        safeSetLocalStorage('auth_user', data.user);
        
        // Set auth cookie for server-side
        document.cookie = `auth_token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}`;
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: data.error || 'Authentication failed' 
      };
    } catch (error: any) {
      authLogger.error('[DirectAuth] Error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const directSignUp = async (email: string, password: string, metadata: any) => {
    setLoading(true);

    try {
      // Use simple-signup endpoint (no complex password requirements)
      const response = await fetch('/api/auth/simple-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ email, password, metadata })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.session) {
          // Auto sign in after signup
          safeSetLocalStorage('auth_session', data.session);
          safeSetLocalStorage('auth_user', data.user);
          document.cookie = `auth_token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}`;
        }
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: data.error || 'Signup failed' 
      };
    } catch (error: any) {
      authLogger.error('[DirectAuth] Signup error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    directSignIn,
    directSignUp,
    loading
  };
}