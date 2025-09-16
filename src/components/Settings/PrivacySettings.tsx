"use client";

import { memo, useCallback } from "react";
import { PrivacySettingsProps } from "./types";
import { ApiKeyInput } from "./ApiKeyInput";
import { Shield, Globe, Languages } from "lucide-react";

export const PrivacySettings = memo<PrivacySettingsProps>(function PrivacySettings({
  settings,
  apiKeyValidation,
  validating,
  onSettingChange,
  onValidateAPIKeys,
}) {
  const handleUnsplashKeyChange = useCallback((value: string) => {
    onSettingChange("apiKeys", { unsplash: value });
  }, [onSettingChange]);

  const handleOpenAIKeyChange = useCallback((value: string) => {
    onSettingChange("apiKeys", { openai: value });
  }, [onSettingChange]);

  const validateUnsplash = useCallback(async () => {
    await onValidateAPIKeys();
    return apiKeyValidation?.unsplash || false;
  }, [onValidateAPIKeys, apiKeyValidation]);

  const validateOpenAI = useCallback(async () => {
    await onValidateAPIKeys();
    return apiKeyValidation?.openai || false;
  }, [onValidateAPIKeys, apiKeyValidation]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center mb-2">
          <Shield className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            API Configuration
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure your API keys to enable all features. Your keys are stored locally in your browser and never sent to our servers.
        </p>
      </div>

      {/* Test All Keys Button */}
      <div className="flex justify-end">
        <button
          onClick={onValidateAPIKeys}
          disabled={validating}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center shadow-lg"
        >
          {validating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Validating All Keys...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Test All Keys
            </>
          )}
        </button>
      </div>

      {/* API Keys Section */}
      <div className="space-y-6">
        {/* Unsplash API Key */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
          <ApiKeyInput
            label="Unsplash API Key"
            value={settings.apiKeys.unsplash}
            onChange={handleUnsplashKeyChange}
            onValidate={validateUnsplash}
            placeholder="Enter your Unsplash Access Key"
            helperText="Required for image search functionality. Free tier includes 50 requests per hour."
            apiKeyUrl="https://unsplash.com/developers"
            apiKeyUrlText="Get Free API Key"
            isValid={apiKeyValidation?.unsplash}
            validating={validating}
            serviceName="unsplash"
          />
        </div>

        {/* OpenAI API Key */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
          <ApiKeyInput
            label="OpenAI API Key"
            value={settings.apiKeys.openai}
            onChange={handleOpenAIKeyChange}
            onValidate={validateOpenAI}
            placeholder="Enter your OpenAI API Key (sk-...)"
            helperText="Required for AI-powered descriptions and translations. Pay-as-you-go pricing."
            apiKeyUrl="https://platform.openai.com/api-keys"
            apiKeyUrlText="Get API Key"
            isValid={apiKeyValidation?.openai}
            validating={validating}
            serviceName="openai"
          />
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              Your API Keys are Secure
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keys are stored locally in your browser's storage</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Never transmitted to our servers or third parties</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Used only for direct API calls to respective services</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can delete them anytime from this settings panel</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="space-y-4">
        <h4 className="font-medium">Language Settings</h4>
        
        {/* UI Language */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h5 className="font-medium mb-3">Interface Language</h5>
          <select
            value={settings.language.ui}
            onChange={(e) =>
              onSettingChange("language", {
                ui: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
          </select>
        </div>

        {/* Target Language */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h5 className="font-medium mb-3">Learning Target</h5>
          <select
            value={settings.language.target}
            onChange={(e) =>
              onSettingChange("language", {
                target: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
          >
            <option value="spanish">Spanish</option>
            <option value="french">French</option>
            <option value="german">German</option>
            <option value="italian">Italian</option>
            <option value="portuguese">Portuguese</option>
            <option value="english">English</option>
          </select>
        </div>
      </div>
    </div>
  );
});

PrivacySettings.displayName = "PrivacySettings";