/**
 * Clean, modern API keys configuration section
 * Provides real-time validation, testing, and status indicators
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw,
  Shield,
  Sparkles,
  Camera
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { settingsManager } from '@/lib/settings/settingsManager';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

interface ApiKeyConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  description: string;
  testEndpoint?: string;
  required: boolean;
}

interface ValidationState {
  [key: string]: {
    status: 'idle' | 'testing' | 'valid' | 'invalid';
    message?: string;
  };
}

export function ApiKeysSection() {
  const { settings, updateSection } = useSettings();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validation, setValidation] = useState<ValidationState>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const apiKeys: ApiKeyConfig[] = [
    {
      id: 'unsplash',
      name: 'Unsplash API Key',
      icon: <Camera className="h-5 w-5" />,
      value: settings.apiKeys.unsplash || '',
      placeholder: 'Enter your Unsplash access key',
      description: 'High-quality stock photos for image search',
      testEndpoint: '/api/images/test',
      required: false
    },
    {
      id: 'openai',
      name: 'OpenAI API Key',
      icon: <Sparkles className="h-5 w-5" />,
      value: settings.apiKeys.openai || '',
      placeholder: 'sk-...',
      description: 'AI-powered descriptions and translations',
      testEndpoint: '/api/ai/test',
      required: false
    }
  ];

  const toggleKeyVisibility = useCallback((keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  }, []);

  const testApiKey = useCallback(async (keyId: string, apiKey: string, endpoint?: string) => {
    if (!apiKey || !endpoint) {
      setValidation(prev => ({
        ...prev,
        [keyId]: { status: 'idle' }
      }));
      return;
    }

    setValidation(prev => ({
      ...prev,
      [keyId]: { status: 'testing', message: 'Testing API key...' }
    }));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ apiKey })
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        setValidation(prev => ({
          ...prev,
          [keyId]: { 
            status: 'valid', 
            message: result.message || 'API key is valid' 
          }
        }));
      } else {
        setValidation(prev => ({
          ...prev,
          [keyId]: { 
            status: 'invalid', 
            message: result.error || 'Invalid API key' 
          }
        }));
      }
    } catch (error) {
      setValidation(prev => ({
        ...prev,
        [keyId]: { 
          status: 'invalid', 
          message: 'Failed to validate API key' 
        }
      }));
    }
  }, []);

  const handleKeyChange = useCallback(async (keyId: string, value: string, testEndpoint?: string) => {
    // Update the settings
    updateSection('apiKeys', { [keyId]: value });
    
    // Clear validation when typing
    if (validation[keyId]?.status !== 'idle') {
      setValidation(prev => ({
        ...prev,
        [keyId]: { status: 'idle' }
      }));
    }

    // Auto-test if key looks complete
    if (keyId === 'openai' && value.startsWith('sk-') && value.length > 20) {
      setTimeout(() => testApiKey(keyId, value, testEndpoint), 500);
    } else if (keyId === 'unsplash' && value.length > 20) {
      setTimeout(() => testApiKey(keyId, value, testEndpoint), 500);
    }
  }, [updateSection, validation, testApiKey]);

  const handleSave = useCallback(async () => {
    logger.info('[ApiKeysSection] Starting save operation');
    setSaveStatus('saving');
    
    try {
      // Add timeout protection
      const saveTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 5000)
      );
      
      // Save to local storage with timeout
      const savePromise = settingsManager.saveSettings();
      const saveResult = await Promise.race([savePromise, saveTimeout]) as boolean;
      
      if (!saveResult) {
        throw new Error('Failed to save settings locally');
      }
      
      logger.info('[ApiKeysSection] Settings saved to localStorage');
      
      // Optional: Save to cloud if authenticated
      try {
        const authUser = localStorage.getItem('auth_user');
        if (authUser) {
          const user = safeParse(authUser);
          if (user?.id) {
            logger.info('[ApiKeysSection] Attempting cloud save for user:', user.email);
            
            const cloudTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cloud save timed out')), 3000)
            );
            
            const cloudPromise = fetch('/api/settings/apikeys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: safeStringify({
                userId: user.id,
                settings: { apiKeys: settings.apiKeys }
              })
            });
            
            const response = await Promise.race([cloudPromise, cloudTimeout]) as Response;
            
            if (!response.ok) {
              logger.warn('[ApiKeysSection] Cloud save failed, but local save succeeded');
            } else {
              logger.info('[ApiKeysSection] Cloud save successful');
            }
          }
        }
      } catch (cloudError) {
        // Cloud save is optional, don't fail the whole operation
        logger.warn('[ApiKeysSection] Cloud save failed:', cloudError);
      }

      // Trigger Unsplash service update
      if (settings.apiKeys.unsplash) {
        logger.info('[ApiKeysSection] Updating Unsplash service with new API key');
        // Dispatch a custom event to notify the Unsplash service
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', { 
          detail: { unsplash: settings.apiKeys.unsplash } 
        }));
      }

      setSaveStatus('saved');
      logger.info('[ApiKeysSection] Save operation completed successfully');
      
      // Reset status after showing success
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      logger.error('[ApiKeysSection] Save operation failed:', error);
      setSaveStatus('error');
      
      // Show error for longer
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [settings.apiKeys]);

  const getStatusIcon = (keyId: string) => {
    const state = validation[keyId];
    if (!state) return null;

    switch (state.status) {
      case 'testing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getInputClassName = (keyId: string) => {
    const state = validation[keyId];
    const baseClass = "w-full px-4 py-2 pr-20 rounded-lg border transition-all duration-200 font-mono text-sm";
    const darkClass = "dark:bg-gray-700 dark:text-white";
    
    if (state?.status === 'valid') {
      return `${baseClass} ${darkClass} border-green-500 focus:border-green-600 focus:ring-2 focus:ring-green-500/20`;
    } else if (state?.status === 'invalid') {
      return `${baseClass} ${darkClass} border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20`;
    }
    
    return `${baseClass} ${darkClass} border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            API Keys & Services
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Connect external services to enhance functionality
          </p>
        </div>
        
        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            saveStatus === 'saved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            saveStatus === 'saving' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {saveStatus === 'saving' && <RefreshCw className="h-3 w-3 animate-spin" />}
            {saveStatus === 'saved' && <Check className="h-3 w-3" />}
            {saveStatus === 'error' && <X className="h-3 w-3" />}
            {saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'saved' ? 'Saved!' : 'Error saving'}
          </div>
        )}
      </div>

      {/* API Keys */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <div key={apiKey.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  {apiKey.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-grow space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {apiKey.name}
                    {apiKey.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {apiKey.description}
                  </p>
                </div>

                {/* Input Field */}
                <div className="relative">
                  <input
                    type={showKeys[apiKey.id] ? 'text' : 'password'}
                    value={apiKey.value}
                    onChange={(e) => handleKeyChange(apiKey.id, e.target.value, apiKey.testEndpoint)}
                    placeholder={apiKey.placeholder}
                    className={getInputClassName(apiKey.id)}
                  />
                  
                  {/* Action Buttons */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* Status Icon */}
                    {getStatusIcon(apiKey.id)}
                    
                    {/* Test Button */}
                    {apiKey.testEndpoint && apiKey.value && (
                      <button
                        onClick={() => testApiKey(apiKey.id, apiKey.value, apiKey.testEndpoint)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Test API key"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                    
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title={showKeys[apiKey.id] ? 'Hide' : 'Show'}
                    >
                      {showKeys[apiKey.id] ? 
                        <EyeOff className="h-4 w-4 text-gray-400" /> : 
                        <Eye className="h-4 w-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>

                {/* Validation Message */}
                {validation[apiKey.id]?.message && (
                  <p className={`text-xs flex items-center gap-1 ${
                    validation[apiKey.id].status === 'valid' ? 'text-green-600 dark:text-green-400' :
                    validation[apiKey.id].status === 'invalid' ? 'text-red-600 dark:text-red-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {validation[apiKey.id].status === 'valid' && <Check className="h-3 w-3" />}
                    {validation[apiKey.id].status === 'invalid' && <AlertCircle className="h-3 w-3" />}
                    {validation[apiKey.id].message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">About API Keys</p>
            <ul className="space-y-1 text-xs">
              <li>• Your API keys are stored locally and encrypted</li>
              <li>• Keys are never shared or sent to third parties</li>
              <li>• You can use the app without API keys (demo mode)</li>
              <li>• Get free API keys from <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a> and <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="underline">OpenAI</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {/* Status Message */}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to save. Please try again.</span>
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`
            px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
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
              <RefreshCw className="h-4 w-4 animate-spin" />
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
              Retry Save
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save API Keys
            </>
          )}
        </button>
      </div>
    </div>
  );
}