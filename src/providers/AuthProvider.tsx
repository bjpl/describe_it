'use client';

import React, { createContext, useContext, useEffect, useState, useReducer, useMemo } from 'react';
import { authManager, AuthState } from '@/lib/auth/AuthManager';
import { User } from '@supabase/supabase-js';
import { safeParse } from '@/lib/utils/json-safe';
import { authLogger } from '@/lib/logger';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github' | 'discord') => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: any) => Promise<boolean>;
  saveApiKeys: (keys: any) => Promise<boolean>;
  getApiKeys: () => Promise<any>;
  refreshKey: number;
  version: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Export AuthContext for debugging components
export { AuthContext };

// Synchronously initialize state from localStorage before React renders
function getInitialAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, user: null, profile: null, session: null, isLoading: false, error: null };
  }

  try {
    const storedSession = localStorage.getItem('describe-it-auth');
    if (storedSession) {
      const sessionData = safeParse<{ access_token?: string; user?: any; profile?: any }>(storedSession);
      if (sessionData?.access_token && sessionData?.user) {
        authLogger.info('[AuthProvider] Initializing with stored session');
        return {
          isAuthenticated: true,
          user: sessionData.user,
          profile: sessionData.profile || null,
          session: null,
          isLoading: false,
          error: null
        };
      }
    }
  } catch (error) {
    authLogger.error('[AuthProvider] Error reading initial state:', error);
  }

  return authManager.getAuthState();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with localStorage data immediately (no delay!)
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState());
  const [forceUpdateCounter, forceUpdate] = useReducer(x => x + 1, 0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Initialize auth and set up event-driven listeners (NO POLLING)
    const initAuth = async () => {
      const currentState = authManager.getAuthState();
      authLogger.info('[AuthProvider] Initializing event-driven auth:', {
        isAuthenticated: currentState.isAuthenticated,
        hasUser: !!currentState.user
      });

      // If we have a stored session but authManager doesn't know about it
      const storedSession = localStorage.getItem('describe-it-auth');
      if (storedSession && !currentState.isAuthenticated) {
        authLogger.info('[AuthProvider] Syncing authManager with localStorage');
        await authManager.initialize();
        const newState = authManager.getAuthState();
        setAuthState(newState);
        setVersion(v => v + 1);
        forceUpdate();
        return;
      }

      // Set initial state
      setAuthState(currentState);
      setVersion(v => v + 1);
      forceUpdate();

      // Check Supabase directly for initial session
      const { authHelpers } = await import('@/lib/supabase/client');
      const session = await authHelpers.getCurrentSession();
      if (session && !currentState.isAuthenticated) {
        authLogger.info('[AuthProvider] Found session, initializing auth manager');
        await authManager.initialize();
        const updatedState = authManager.getAuthState();
        setAuthState(updatedState);
        setVersion(v => v + 1);
        forceUpdate();
      }
    };

    initAuth();

    // Subscribe to auth state changes from AuthManager (event-driven via Supabase onAuthStateChange)
    const unsubscribe = authManager.subscribe((state) => {
      authLogger.info('[AuthProvider] Auth state changed (event-driven):', {
        isAuthenticated: state.isAuthenticated,
        userEmail: state.user?.email,
        hasProfile: !!state.profile
      });

      setAuthState(state);
      setVersion(v => v + 1);
      forceUpdate();
    });

    // Listen for custom auth events
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      authLogger.info('[AuthProvider] Custom auth event received:', customEvent.detail);
      setAuthState(authManager.getAuthState());
      setVersion(v => v + 1);
      forceUpdate();
    };

    window.addEventListener('auth-state-change', handleAuthChange);

    // Listen for storage changes (cross-tab auth changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'describe-it-auth' || e.key?.startsWith('supabase.auth.token')) {
        authLogger.info('[AuthProvider] Storage change detected (cross-tab sync)');
        setTimeout(() => {
          const currentState = authManager.getAuthState();
          setAuthState(currentState);
          setVersion(v => v + 1);
          forceUpdate();
        }, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('auth-state-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Create context value with forced refresh triggers
  const contextValue: AuthContextValue = useMemo(() => {
    const refreshKey = Date.now(); // Force new object reference every time
    
    authLogger.info('[AuthProvider] Creating new context value:', {
      isAuthenticated: authState.isAuthenticated,
      userEmail: authState.user?.email,
      refreshKey,
      version,
      forceUpdateCounter
    });
    
    return {
      ...authState,
      refreshKey,
      version,
      signIn: authManager.signIn.bind(authManager),
      signUp: authManager.signUp.bind(authManager),
      signOut: authManager.signOut.bind(authManager),
      signInWithProvider: authManager.signInWithProvider.bind(authManager),
      updateProfile: authManager.updateProfile.bind(authManager),
      saveApiKeys: authManager.saveApiKeys.bind(authManager),
      getApiKeys: authManager.getApiKeys.bind(authManager),
    };
  }, [authState, version, forceUpdateCounter]); // Dependencies ensure new object on any change

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
  
  // Debug logging for state changes
  React.useEffect(() => {
    authLogger.info('[useAuth] Hook triggered with context:', {
      isAuthenticated: context.isAuthenticated,
      userEmail: context.user?.email,
      refreshKey: context.refreshKey,
      version: context.version
    });
  }, [context.isAuthenticated, context.user, context.refreshKey, context.version]);
  
  return context;
}

// Helper hook to get current user
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}

// Helper hook to check if authenticated
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, refreshKey, version } = useAuth();
  
  // Debug logging for authentication state changes
  React.useEffect(() => {
    authLogger.info('[useIsAuthenticated] Authentication state:', {
      isAuthenticated,
      refreshKey,
      version,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, refreshKey, version]);
  
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
      authLogger.error('Failed to get API keys:', error);
      setLoading(false);
    });
  }, [getApiKeys]);

  return { keys, loading };
}