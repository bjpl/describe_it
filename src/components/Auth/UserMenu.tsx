'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { User, Settings, LogOut, KeyRound, ChevronDown } from 'lucide-react';
import { AuthModal } from './AuthModal';

export function UserMenu() {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
  };

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <User className="w-4 h-4 mr-2" />
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
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
          {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {profile?.full_name || user?.email?.split('@')[0] || 'User'}
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
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user?.email}
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