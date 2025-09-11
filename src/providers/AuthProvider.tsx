'use client';

import React, { createContext, useContext, useEffect, useState, useReducer, useMemo } from 'react';
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
  refreshKey: number;
  version: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());
  const [forceUpdateCounter, forceUpdate] = useReducer(x => x + 1, 0);
  const [version, setVersion] = useState(0);

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
              setVersion(v => v + 1);
              forceUpdate();
              return;
            }
          }
        } catch (error) {
          console.error('[AuthProvider] Failed to restore session from localStorage:', error);
        }
      }
      
      setAuthState(currentState);
      setVersion(v => v + 1);
      forceUpdate();
      
      // Also check Supabase directly
      const { authHelpers } = await import('@/lib/supabase/client');
      const session = await authHelpers.getCurrentSession();
      if (session && !currentState.isAuthenticated) {
        console.log('[AuthProvider] Found session but auth state not updated, forcing update');
        // Force auth manager to recognize the session
        await authManager.initialize();
        const updatedState = authManager.getAuthState();
        setAuthState(updatedState);
        setVersion(v => v + 1);
        forceUpdate();
      }
    };
    
    checkSession();

    // Subscribe to auth state changes
    const unsubscribe = authManager.subscribe((state) => {
      console.log('[AuthProvider] Auth state changed:', {
        isAuthenticated: state.isAuthenticated,
        userEmail: state.user?.email,
        hasProfile: !!state.profile
      });
      
      setAuthState(state);
      setVersion(v => v + 1);
      forceUpdate(); // Force re-render on any auth change
    });

    // Also listen for custom auth events
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[AuthProvider] Custom auth event received:', customEvent.detail);
      // Force a re-fetch of auth state
      setAuthState(authManager.getAuthState());
      setVersion(v => v + 1);
      forceUpdate(); // Force re-render on custom auth events
    };
    
    window.addEventListener('auth-state-change', handleAuthChange);

    // Listen for storage changes (cross-tab auth changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'describe-it-auth' || e.key?.startsWith('supabase.auth.token')) {
        console.log('[AuthProvider] Storage change detected, forcing auth state sync');
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
  }, []);

  // Additional effect to monitor auth state periodically and force updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = authManager.getAuthState();
      
      // Check if there's a mismatch between our state and the auth manager's state
      if (currentState.isAuthenticated !== authState.isAuthenticated ||
          currentState.user?.id !== authState.user?.id) {
        console.log('[AuthProvider] Detected state mismatch, forcing sync:', {
          current: { isAuth: currentState.isAuthenticated, userId: currentState.user?.id },
          local: { isAuth: authState.isAuthenticated, userId: authState.user?.id }
        });
        
        setAuthState(currentState);
        setVersion(v => v + 1);
        forceUpdate();
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [authState]);


  // Create context value with forced refresh triggers
  const contextValue: AuthContextValue = useMemo(() => {
    const refreshKey = Date.now(); // Force new object reference every time
    
    console.log('[AuthProvider] Creating new context value:', {
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
    console.log('[useAuth] Hook triggered with context:', {
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
    console.log('[useIsAuthenticated] Authentication state:', {
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
      console.error('Failed to get API keys:', error);
      setLoading(false);
    });
  }, [getApiKeys]);

  return { keys, loading };
}