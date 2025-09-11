'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authManager, AuthState } from '@/lib/auth/AuthManager';
import { User } from '@supabase/supabase-js';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github' | 'discord') => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: any) => Promise<boolean>;
  saveApiKeys: (keys: any) => Promise<boolean>;
  getApiKeys: () => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      const currentState = authManager.getAuthState();
      console.log('[AuthProvider] Initial auth check:', {
        isAuthenticated: currentState.isAuthenticated,
        hasUser: !!currentState.user
      });
      
      // Check localStorage directly for session
      const storedSession = localStorage.getItem('describe-it-auth');
      if (storedSession && !currentState.isAuthenticated) {
        console.log('[AuthProvider] Found session in localStorage but auth not initialized');
        try {
          const sessionData = JSON.parse(storedSession);
          if (sessionData.access_token) {
            // Initialize auth manager with the stored session
            await authManager.initialize();
            const newState = authManager.getAuthState();
            if (newState.isAuthenticated) {
              setAuthState(newState);
              return;
            }
          }
        } catch (error) {
          console.error('[AuthProvider] Failed to restore session from localStorage:', error);
        }
      }
      
      setAuthState(currentState);
      
      // Also check Supabase directly
      const { authHelpers } = await import('@/lib/supabase/client');
      const session = await authHelpers.getCurrentSession();
      if (session && !currentState.isAuthenticated) {
        console.log('[AuthProvider] Found session but auth state not updated, forcing update');
        // Force auth manager to recognize the session
        await authManager.initialize();
        setAuthState(authManager.getAuthState());
      }
    };
    
    checkSession();

    // Subscribe to auth state changes
    const unsubscribe = authManager.subscribe((state) => {
      setAuthState(state);
      console.log('[AuthProvider] Auth state changed:', {
        isAuthenticated: state.isAuthenticated,
        userEmail: state.user?.email,
        hasProfile: !!state.profile
      });
    });

    // Also listen for custom auth events
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[AuthProvider] Custom auth event received:', customEvent.detail);
      // Force a re-fetch of auth state
      setAuthState(authManager.getAuthState());
    };
    
    window.addEventListener('auth-state-change', handleAuthChange);

    return () => {
      unsubscribe();
      window.removeEventListener('auth-state-change', handleAuthChange);
    };
  }, []);

  const contextValue: AuthContextValue = {
    ...authState,
    signIn: authManager.signIn.bind(authManager),
    signUp: authManager.signUp.bind(authManager),
    signOut: authManager.signOut.bind(authManager),
    signInWithProvider: authManager.signInWithProvider.bind(authManager),
    updateProfile: authManager.updateProfile.bind(authManager),
    saveApiKeys: authManager.saveApiKeys.bind(authManager),
    getApiKeys: authManager.getApiKeys.bind(authManager),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Helper hook to get current user
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}

// Helper hook to check if authenticated
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

// Helper hook to get API keys
export function useApiKeys() {
  const { getApiKeys } = useAuth();
  const [keys, setKeys] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApiKeys().then(apiKeys => {
      setKeys(apiKeys);
      setLoading(false);
    }).catch(error => {
      console.error('Failed to get API keys:', error);
      setLoading(false);
    });
  }, [getApiKeys]);

  return { keys, loading };
}