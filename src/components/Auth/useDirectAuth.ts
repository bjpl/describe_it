/**
 * Direct authentication hook that bypasses AuthManager
 * Used as a fallback when AuthManager has issues
 */

import { useState } from 'react';

export function useDirectAuth() {
  const [loading, setLoading] = useState(false);

  const directSignIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success && data.session) {
        // Store session in localStorage
        localStorage.setItem('auth_session', JSON.stringify(data.session));
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        // Set auth cookie for server-side
        document.cookie = `auth_token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}`;
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: data.error || 'Authentication failed' 
      };
    } catch (error: any) {
      console.error('[DirectAuth] Error:', error);
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, metadata })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.session) {
          // Auto sign in after signup
          localStorage.setItem('auth_session', JSON.stringify(data.session));
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          document.cookie = `auth_token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}`;
        }
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: data.error || 'Signup failed' 
      };
    } catch (error: any) {
      console.error('[DirectAuth] Signup error:', error);
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