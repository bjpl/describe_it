"use client";

import { useEffect, useState } from "react";
import { Check, X, AlertCircle, Settings, Key } from "lucide-react";
import { settingsManager } from "@/lib/settings/settingsManager";
import { apiKeyProvider } from "@/lib/api/keyProvider";

interface ApiKeyStatusProps {
  onOpenSettings?: () => void;
  compact?: boolean;
}

export function ApiKeyStatus({ onOpenSettings, compact = false }: ApiKeyStatusProps) {
  const [keyStatus, setKeyStatus] = useState({
    unsplash: { hasKey: false, isValid: false },
    openai: { hasKey: false, isValid: false }
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkKeys = () => {
      const settings = settingsManager.getSettings();
      const unsplashConfig = apiKeyProvider.getServiceConfig('unsplash');
      const openaiConfig = apiKeyProvider.getServiceConfig('openai');

      setKeyStatus({
        unsplash: {
          hasKey: !!settings.apiKeys.unsplash || !!unsplashConfig.apiKey,
          isValid: unsplashConfig.isValid && !unsplashConfig.isDemo
        },
        openai: {
          hasKey: !!settings.apiKeys.openai || !!openaiConfig.apiKey,
          isValid: openaiConfig.isValid && !openaiConfig.isDemo
        }
      });
    };

    // Check on mount
    checkKeys();

    // Listen for settings changes
    const unsubscribe = settingsManager.addListener(() => {
      checkKeys();
    });

    return unsubscribe;
  }, []);

  const allKeysValid = keyStatus.unsplash.isValid && keyStatus.openai.isValid;
  const someKeysValid = keyStatus.unsplash.isValid || keyStatus.openai.isValid;
  const noKeys = !keyStatus.unsplash.hasKey && !keyStatus.openai.hasKey;

  if (compact) {
    return (
      <button
        onClick={onOpenSettings}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
          ${allKeysValid 
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
            : someKeysValid
            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
          }
        `}
        title={`API Keys: ${allKeysValid ? 'All configured' : someKeysValid ? 'Partially configured' : 'Not configured'}`}
      >
        <Key className="w-4 h-4" />
        {allKeysValid ? (
          <Check className="w-4 h-4" />
        ) : someKeysValid ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
          <Key className="w-4 h-4 mr-2" />
          API Key Status
        </h3>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
          >
            <Settings className="w-3 h-3 mr-1" />
            Configure
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Unsplash Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Unsplash</span>
          <div className="flex items-center gap-1">
            {keyStatus.unsplash.isValid ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Active</span>
              </>
            ) : keyStatus.unsplash.hasKey ? (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400">Invalid</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400">Not Set</span>
              </>
            )}
          </div>
        </div>

        {/* OpenAI Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">OpenAI</span>
          <div className="flex items-center gap-1">
            {keyStatus.openai.isValid ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Active</span>
              </>
            ) : keyStatus.openai.hasKey ? (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400">Invalid</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400">Not Set</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {noKeys && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-xs text-red-600 dark:text-red-400">
            No API keys configured. Click Configure to add your keys.
          </p>
        </div>
      )}

      {!allKeysValid && someKeysValid && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Some features may be limited. Configure all keys for full functionality.
          </p>
        </div>
      )}
    </div>
  );
}