'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { User, Settings, LogOut, KeyRound, ChevronDown } from 'lucide-react';
import { AuthModal } from './AuthModal';

// Custom auth state interface
interface AuthStateDetail {
  isAuthenticated: boolean;
  user?: any;
  profile?: any;
}

export function UserMenu() {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  
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

  // Custom event handler for auth state changes
  const handleAuthChange = useCallback((e: CustomEvent<AuthStateDetail>) => {
    console.log('[UserMenu] Custom auth event received:', e.detail);
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

  // Polling mechanism as backup for localStorage changes
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem('describe-it-auth');
        const recentSignIn = sessionStorage.getItem('recent-auth-success');
        
        if (stored) {
          const { access_token, user: storedUser } = JSON.parse(stored);
          const hasToken = !!access_token;
          
          // Only update if there's a meaningful change
          if (hasToken !== localIsAuthenticated) {
            console.log('[UserMenu] Polling detected auth change:', hasToken);
            setLocalIsAuthenticated(hasToken);
            setLocalUser(storedUser);
            
            if (hasToken && recentSignIn) {
              // Clear the recent sign-in flag
              sessionStorage.removeItem('recent-auth-success');
              setIsLoading(false);
            }
          }
        } else if (localIsAuthenticated) {
          // No stored auth but local state says authenticated - clear it
          console.log('[UserMenu] Polling detected sign out');
          setLocalIsAuthenticated(false);
          setLocalUser(null);
          setLocalProfile(null);
        }
      } catch (error) {
        console.error('[UserMenu] Polling error:', error);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
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
            try {
              const { access_token, user: storedUser } = JSON.parse(stored);
              if (access_token) {
                console.log('[UserMenu] Recent auth success detected, updating UI');
                setLocalIsAuthenticated(true);
                setLocalUser(storedUser);
                setIsLoading(false);
                sessionStorage.removeItem('recent-auth-success');
                
                // Dispatch custom event for other components
                window.dispatchEvent(new CustomEvent('auth-state-changed', {
                  detail: { isAuthenticated: true, user: storedUser }
                }));
              }
            } catch (error) {
              console.error('[UserMenu] Error parsing stored auth:', error);
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
    // Dynamically import authManager to avoid circular dependencies
    let authManagerState = { isAuthenticated: false, user: null, profile: null };
    try {
      const { authManager } = require('@/lib/auth/authManager');
      authManagerState = authManager.getState();
    } catch (error) {
      console.warn('Could not access authManager in UserMenu:', error);
    }
    const localStorage = window.localStorage.getItem('describe-it-auth');
    let localStorageData = null;
    
    try {
      localStorageData = localStorage ? JSON.parse(localStorage) : null;
    } catch (e) {
      localStorageData = { error: 'Invalid JSON in localStorage' };
    }

    const stateComparison = {
      authProvider: { isAuthenticated, user: user?.email, profile: !!profile },
      zustandStore: { 
        isAuthenticated: authManagerState.isAuthenticated, 
        user: authManagerState.user?.email, 
        profile: !!authManagerState.profile 
      },
      localComponent: { 
        isAuthenticated: localIsAuthenticated, 
        user: localUser?.email, 
        profile: !!localProfile 
      },
      localStorage: localStorageData ? {
        hasToken: !!localStorageData.access_token,
        user: localStorageData.user?.email
      } : null,
      sessionStorage: {
        recentAuth: !!sessionStorage.getItem('recent-auth-success')
      },
      isLoading,
      timestamp: new Date().toISOString()
    };

    // Detect divergences
    const divergences = [];
    
    if (isAuthenticated !== localIsAuthenticated) {
      divergences.push('AuthProvider vs LocalComponent: isAuthenticated mismatch');
    }
    
    if (authManagerState.isAuthenticated !== isAuthenticated) {
      divergences.push('Zustand vs AuthProvider: isAuthenticated mismatch');
    }
    
    if (authManagerState.isAuthenticated !== localIsAuthenticated) {
      divergences.push('Zustand vs LocalComponent: isAuthenticated mismatch');
    }
    
    if (localStorageData?.access_token && !localIsAuthenticated) {
      divergences.push('localStorage has token but component shows unauthenticated');
    }

    console.log('[UserMenu] State Analysis:', {
      ...stateComparison,
      divergences,
      hasDivergences: divergences.length > 0
    });

    // Log critical divergences as warnings
    if (divergences.length > 0) {
      console.warn('[UserMenu] AUTH STATE DIVERGENCE DETECTED:', divergences);
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
      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthenticated: false, user: null, profile: null }
      }));
      
      // Clear any recent auth flags
      sessionStorage.removeItem('recent-auth-success');
      
    } catch (error) {
      console.error('[UserMenu] Sign out error:', error);
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
      <div className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <User className="w-4 h-4 mr-2" />
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setIsLoading(false);
          }}
          onAuthSuccess={(authData) => {
            console.log('[UserMenu] Auth success callback:', authData);
            
            // Immediate UI update
            setLocalIsAuthenticated(true);
            setLocalUser(authData.user);
            setLocalProfile(authData.profile);
            setIsLoading(false);
            
            // Set session flag for other components
            sessionStorage.setItem('recent-auth-success', Date.now().toString());
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('auth-state-changed', {
              detail: { 
                isAuthenticated: true, 
                user: authData.user, 
                profile: authData.profile 
              }
            }));
            
            // Close modal
            setShowAuthModal(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {localProfile?.full_name?.[0] || localUser?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {localProfile?.full_name || localUser?.email?.split('@')[0] || 'User'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {localProfile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {localUser?.email}
              </p>
            </div>

            <div className="p-1">
              <button
                onClick={() => {
                  setShowApiKeyModal(true);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <KeyRound className="w-4 h-4 mr-3" />
                API Keys
              </button>

              <button
                onClick={() => {
                  // TODO: Open settings modal
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </button>

              <hr className="my-1 border-gray-200 dark:border-gray-700" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
    </div>
  );
}

// API Key Management Modal
function ApiKeyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { saveApiKeys, getApiKeys } = useAuth();
  const [keys, setKeys] = useState({
    unsplash: '',
    openai: '',
    anthropic: '',
    google: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      getApiKeys().then(apiKeys => {
        if (apiKeys) {
          setKeys({
            unsplash: apiKeys.unsplash || '',
            openai: apiKeys.openai || '',
            anthropic: apiKeys.anthropic || '',
            google: apiKeys.google || ''
          });
        }
      });
    }
  }, [isOpen, getApiKeys]);

  const handleSave = async () => {
    console.log('[ApiKeyModal] Starting save operation');
    setLoading(true);
    try {
      // Add timeout protection
      const savePromise = saveApiKeys(keys);
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 5000)
      );
      
      const success = await Promise.race([savePromise, timeoutPromise]);
      console.log('[ApiKeyModal] Save result:', success);
      
      if (success) {
        // Also save to localStorage as backup
        sessionStorage.setItem('api-keys-backup', JSON.stringify(keys));
        
        // Update settings manager directly
        const { settingsManager } = await import('@/lib/settings/settingsManager');
        settingsManager.updateSection('apiKeys', {
          unsplash: keys.unsplash,
          openai: keys.openai
        });
        
        // Force refresh OpenAI service with new key
        const { openAIService } = await import('@/lib/api/openai');
        openAIService.refreshService();
        console.log('[ApiKeyModal] OpenAI service refreshed with new key');
        
        setSaved(true);
        setTimeout(() => {
          onClose();
          setSaved(false);
        }, 1500);
      } else {
        throw new Error('Failed to save API keys');
      }
    } catch (error: any) {
      console.error('[ApiKeyModal] Failed to save API keys:', error);
      
      // Fallback: Save to localStorage directly
      try {
        sessionStorage.setItem('api-keys-backup', JSON.stringify(keys));
        const { settingsManager } = await import('@/lib/settings/settingsManager');
        settingsManager.updateSection('apiKeys', {
          unsplash: keys.unsplash,
          openai: keys.openai
        });
        
        setSaved(true);
        setTimeout(() => {
          onClose();
          setSaved(false);
        }, 1500);
      } catch (fallbackError) {
        console.error('[ApiKeyModal] Fallback save also failed:', fallbackError);
        alert('Failed to save API keys. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          API Keys
        </h2>

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            API keys saved successfully!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unsplash API Key
            </label>
            <input
              type="password"
              value={keys.unsplash}
              onChange={(e) => setKeys({ ...keys, unsplash: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter your Unsplash access key"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get it from <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">unsplash.com/developers</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={keys.openai}
              onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="sk-..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Keys'}
          </button>
        </div>
      </div>
    </div>
  );
}