'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { SettingsModal } from '@/components/SettingsModal';
import { safeParse, safeStringify, safeParseLocalStorage } from '@/lib/utils/json-safe';
import { authLogger } from '@/lib/logger';
import type { AuthResponse } from '@/types/api/index';

// Custom auth state interface
interface AuthStateDetail {
  isAuthenticated: boolean;
  user?: any;
  profile?: any;
}

// Auth data from localStorage
interface StoredAuthData {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
  profile?: any;
  error?: string;
}

export function UserMenu() {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'general' | 'apikeys'>('general');
  const [darkMode, setDarkMode] = useState(false);

  // Local state mirroring for immediate UI updates
  const [localIsAuthenticated, setLocalIsAuthenticated] = useState(isAuthenticated);
  const [localUser, setLocalUser] = useState(user);
  const [localProfile, setLocalProfile] = useState(profile);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state with auth provider state
  useEffect(() => {
    setLocalIsAuthenticated(isAuthenticated);
    setLocalUser(user);
    setLocalProfile(profile);
  }, [isAuthenticated, user, profile]);

  // Initialize dark mode from system/localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedTheme ? savedTheme === 'true' : systemDark);
  }, []);

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.classList.toggle('dark', newDarkMode);
  }, [darkMode]);

  // Custom event handler for auth state changes
  const handleAuthChange = useCallback((e: CustomEvent<AuthStateDetail>) => {
    authLogger.info('[UserMenu] Custom auth event received:', { detail: e.detail });
    const { isAuthenticated: authState, user: userData, profile: profileData } = e.detail;

    // Force immediate UI update
    setLocalIsAuthenticated(authState);
    setLocalUser(userData);
    setLocalProfile(profileData);
    setIsLoading(false);

    // Close dropdown and auth modal if user is now authenticated
    if (authState) {
      setShowDropdown(false);
      setShowAuthModal(false);
    }
  }, []);

  // Listen for custom auth events
  useEffect(() => {
    window.addEventListener('auth-state-changed' as any, handleAuthChange);

    return () => {
      window.removeEventListener('auth-state-changed' as any, handleAuthChange);
    };
  }, [handleAuthChange]);

  // Event-driven storage listener (NO POLLING)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only react to auth-related storage changes
      if (e.key !== 'describe-it-auth' && !e.key?.startsWith('supabase.auth')) return;

      try {
        authLogger.info('[UserMenu] Storage event detected:', { key: e.key });

        const stored = localStorage.getItem('describe-it-auth');
        const recentSignIn = sessionStorage.getItem('recent-auth-success');

        if (stored) {
          const parsedData = safeParse<StoredAuthData>(stored, undefined);
          if (parsedData && parsedData !== undefined && 'access_token' in parsedData) {
            const { access_token, user: storedUser } = parsedData;
            const hasToken = !!access_token;

            // Only update if there's a meaningful change
            if (hasToken !== localIsAuthenticated) {
              authLogger.info('[UserMenu] Event-driven auth change detected:', { hasToken });
              setLocalIsAuthenticated(hasToken);
              setLocalUser((storedUser as any) || null);

              if (hasToken && recentSignIn) {
                sessionStorage.removeItem('recent-auth-success');
                setIsLoading(false);
              }
            }
          } else {
            authLogger.error('[UserMenu] Failed to parse stored auth data');
            localStorage.removeItem('describe-it-auth');
            setLocalIsAuthenticated(false);
            setLocalUser(null);
          }
        } else if (localIsAuthenticated) {
          // No stored auth but local state says authenticated - clear it
          authLogger.info('[UserMenu] Event-driven sign out detected');
          setLocalIsAuthenticated(false);
          setLocalUser(null);
          setLocalProfile(null);
        }
      } catch (error) {
        authLogger.error('[UserMenu] Storage event error:', error);
      }
    };

    // Listen for storage events (cross-tab sync)
    window.addEventListener('storage', handleStorageChange);

    // Also do initial check on mount
    const checkInitialAuth = () => {
      try {
        const stored = localStorage.getItem('describe-it-auth');
        if (stored) {
          const parsedData = safeParse<StoredAuthData>(stored, undefined);
          if (parsedData && 'access_token' in parsedData && parsedData.access_token) {
            setLocalIsAuthenticated(true);
            setLocalUser((parsedData.user as any) || null);
          }
        }
      } catch (error) {
        authLogger.error('[UserMenu] Initial auth check error:', error);
      }
    };

    checkInitialAuth();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [localIsAuthenticated]);

  // Monitor session storage for recent auth success
  useEffect(() => {
    const checkRecentAuth = () => {
      const recentSignIn = sessionStorage.getItem('recent-auth-success');
      if (recentSignIn && !localIsAuthenticated) {
        setIsLoading(true);

        // Give auth provider time to update
        setTimeout(() => {
          const stored = localStorage.getItem('describe-it-auth');
          if (stored) {
            const parsedData = safeParse<StoredAuthData>(stored, undefined);
            if (parsedData && 'access_token' in parsedData && parsedData.access_token) {
              const { access_token, user: storedUser } = parsedData;
              authLogger.info('[UserMenu] Recent auth success detected, updating UI');
              setLocalIsAuthenticated(true);
              setLocalUser((storedUser as any) || null);
              setIsLoading(false);
              sessionStorage.removeItem('recent-auth-success');

              // Dispatch custom event for other components
              window.dispatchEvent(
                new CustomEvent('auth-state-changed', {
                  detail: { isAuthenticated: true, user: storedUser },
                })
              );
            } else {
              authLogger.error('[UserMenu] Error parsing stored auth');
              setIsLoading(false);
            }
          } else {
            setIsLoading(false);
          }
        }, 500);
      }
    };

    // Check immediately
    checkRecentAuth();

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recent-auth-success' && e.newValue) {
        checkRecentAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [localIsAuthenticated]);

  // Enhanced debug logging with state divergence detection
  useEffect(() => {
    // Check for state divergence
    const localStorageStr = window.localStorage.getItem('describe-it-auth');
    let localStorageData: StoredAuthData | { error: string } | null = null;

    if (localStorageStr) {
      const parsed = safeParse<StoredAuthData>(localStorageStr, undefined);
      localStorageData = parsed !== undefined ? parsed : null;
    }

    const stateComparison = {
      authProvider: { isAuthenticated, user: user?.email, profile: !!profile },
      zustandStore: {
        isAuthenticated: isAuthenticated,
        user: user?.email,
        profile: !!profile,
      },
      localComponent: {
        isAuthenticated: localIsAuthenticated,
        user: localUser?.email,
        profile: !!localProfile,
      },
      localStorage:
        localStorageData && 'access_token' in localStorageData
          ? {
              hasToken: !!localStorageData.access_token,
              user: localStorageData.user?.email,
            }
          : null,
      sessionStorage: {
        recentAuth: !!sessionStorage.getItem('recent-auth-success'),
      },
      isLoading,
      timestamp: new Date().toISOString(),
    };

    // Detect divergences
    const divergences = [];

    if (isAuthenticated !== localIsAuthenticated) {
      divergences.push('AuthProvider vs LocalComponent: isAuthenticated mismatch');
    }

    // Check for divergences between provider and local state
    if (isAuthenticated !== localIsAuthenticated) {
      divergences.push('AuthProvider vs LocalComponent: isAuthenticated mismatch');
    }

    if (
      localStorageData &&
      'access_token' in localStorageData &&
      localStorageData.access_token &&
      !localIsAuthenticated
    ) {
      divergences.push('localStorage has token but component shows unauthenticated');
    }

    authLogger.info('[UserMenu] State Analysis:', {
      ...stateComparison,
      divergences,
      hasDivergences: divergences.length > 0,
    });

    // Log critical divergences as warnings
    if (divergences.length > 0) {
      authLogger.warn('[UserMenu] AUTH STATE DIVERGENCE DETECTED:', { divergences });
    }
  }, [isAuthenticated, localIsAuthenticated, user, localUser, profile, localProfile, isLoading]);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      await signOut();

      // Immediate UI update
      setLocalIsAuthenticated(false);
      setLocalUser(null);
      setLocalProfile(null);
      setShowDropdown(false);

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent('auth-state-changed', {
          detail: { isAuthenticated: false, user: null, profile: null },
        })
      );

      // Clear any recent auth flags
      sessionStorage.removeItem('recent-auth-success');
    } catch (error) {
      authLogger.error('[UserMenu] Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInClick = () => {
    setIsLoading(true);
    setShowAuthModal(true);

    // Reset loading after modal opens
    setTimeout(() => setIsLoading(false), 100);
  };

  // Show loading state during auth transitions
  if (isLoading) {
    return (
      <div className='flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg'>
        <svg
          className='animate-spin h-4 w-4 mr-2'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
        >
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          ></circle>
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
          ></path>
        </svg>
        Authenticating...
      </div>
    );
  }

  if (!localIsAuthenticated) {
    return (
      <>
        <button
          onClick={handleSignInClick}
          className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          <User className='w-4 h-4 mr-2' />
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setIsLoading(false);
          }}
          onAuthSuccess={authData => {
            authLogger.info('[UserMenu] Auth success callback:', authData);

            // Immediate UI update
            setLocalIsAuthenticated(true);
            setLocalUser(authData.user);
            setLocalProfile(authData.profile);
            setIsLoading(false);

            // Set session flag for other components
            sessionStorage.setItem('recent-auth-success', Date.now().toString());

            // Dispatch custom event
            window.dispatchEvent(
              new CustomEvent('auth-state-changed', {
                detail: {
                  isAuthenticated: true,
                  user: authData.user,
                  profile: authData.profile,
                },
              })
            );

            // Close modal
            setShowAuthModal(false);
          }}
        />
      </>
    );
  }

  return (
    <div className='relative'>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className='flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
      >
        <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold'>
          {localProfile?.full_name?.[0] || localUser?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          {localProfile?.full_name || localUser?.email?.split('@')[0] || 'User'}
        </span>
        <ChevronDown className='w-4 h-4 text-gray-500' />
      </button>

      {showDropdown && (
        <>
          <div className='fixed inset-0 z-10' onClick={() => setShowDropdown(false)} />
          <div className='absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20'>
            <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>
                {localProfile?.full_name || 'User'}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>{localUser?.email}</p>
            </div>

            <div className='p-1'>
              <button
                onClick={() => {
                  setSettingsDefaultTab('general');
                  setShowSettingsModal(true);
                  setShowDropdown(false);
                }}
                className='w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors'
              >
                <Settings className='w-4 h-4 mr-3' />
                Settings
              </button>

              <hr className='my-1 border-gray-200 dark:border-gray-700' />

              <button
                onClick={handleSignOut}
                className='w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors'
              >
                <LogOut className='w-4 h-4 mr-3' />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          darkMode={darkMode}
          onClose={() => setShowSettingsModal(false)}
          onToggleDarkMode={toggleDarkMode}
          defaultTab={settingsDefaultTab}
        />
      )}
    </div>
  );
}
