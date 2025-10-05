/**
 * Simplified API Keys Section - Uses Unified KeyManager
 * Clean, maintainable, single responsibility
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, X, AlertCircle, Sparkles, Camera, Save } from 'lucide-react';
import { keyManager, type ServiceType } from '@/lib/keys/keyManager';
import { logger } from '@/lib/logger';

export function ApiKeysSection() {
  // Local state synchronized with keyManager
  const [keys, setKeys] = useState({ anthropic: '', unsplash: '' });
  const [showKeys, setShowKeys] = useState({ anthropic: false, unsplash: false });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load keys on mount
  useEffect(() => {
    const currentKeys = keyManager.getAll();
    setKeys(currentKeys);

    // Subscribe to changes
    const unsubscribe = keyManager.subscribe((updatedKeys) => {
      setKeys(updatedKeys);
    });

    return unsubscribe;
  }, []);

  const handleChange = (service: ServiceType, value: string) => {
    // Update local state immediately (controlled input)
    setKeys(prev => ({ ...prev, [service]: value }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    logger.info('[ApiKeysSection] Saving keys...');

    try {
      // Save to unified storage
      const saved = keyManager.setAll(keys);

      if (saved) {
        setSaveStatus('saved');
        logger.info('[ApiKeysSection] Keys saved successfully');

        // Reset after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      logger.error('[ApiKeysSection] Save failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const toggleVisibility = (service: ServiceType) => {
    setShowKeys(prev => ({ ...prev, [service]: !prev[service] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-500" />
          API Keys
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure your API keys for AI and image services
        </p>
      </div>

      {/* Anthropic (Claude) Key */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Anthropic API Key (Claude Sonnet 4.5)
              <span className="text-red-500 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Required for AI descriptions, Q&A, and translations
            </p>

            <div className="relative">
              <input
                type={showKeys.anthropic ? 'text' : 'password'}
                value={keys.anthropic}
                onChange={(e) => handleChange('anthropic', e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                autoComplete="off"
              />
              <button
                onClick={() => toggleVisibility('anthropic')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                type="button"
              >
                {showKeys.anthropic ?
                  <EyeOff className="h-4 w-4 text-gray-400" /> :
                  <Eye className="h-4 w-4 text-gray-400" />
                }
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Get your key: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 underline">Anthropic Console</a>
            </p>
          </div>
        </div>
      </div>

      {/* Unsplash Key */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Camera className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Unsplash API Key
              <span className="text-gray-400 ml-1 text-xs">(Optional)</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              For high-quality image search (works in demo mode without key)
            </p>

            <div className="relative">
              <input
                type={showKeys.unsplash ? 'text' : 'password'}
                value={keys.unsplash}
                onChange={(e) => handleChange('unsplash', e.target.value)}
                placeholder="Enter Unsplash access key..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                autoComplete="off"
              />
              <button
                onClick={() => toggleVisibility('unsplash')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                type="button"
              >
                {showKeys.unsplash ?
                  <EyeOff className="h-4 w-4 text-gray-400" /> :
                  <Eye className="h-4 w-4 text-gray-400" />
                }
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Get your key: <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">Unsplash Developers</a>
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-medium">🔒 Your Keys are Secure</p>
            <ul className="text-xs space-y-1">
              <li>• Stored locally in your browser only</li>
              <li>• Never sent to our servers or third parties</li>
              <li>• Used only for direct API calls to Anthropic/Unsplash</li>
              <li>• You can delete them anytime</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`
            px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2
            ${saveStatus === 'saved'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : saveStatus === 'error' ? (
            <>
              <X className="h-4 w-4" />
              Error - Retry
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save API Keys
            </>
          )}
        </button>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
            {JSON.stringify({
              hasAnthropic: !!keys.anthropic,
              anthropicLength: keys.anthropic.length,
              hasUnsplash: !!keys.unsplash,
              unsplashLength: keys.unsplash.length,
              storage: typeof localStorage !== 'undefined' ? 'available' : 'unavailable'
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
