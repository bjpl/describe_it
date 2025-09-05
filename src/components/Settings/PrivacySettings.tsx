"use client";

import { memo } from "react";
import { PrivacySettingsProps } from "./types";

export const PrivacySettings = memo<PrivacySettingsProps>(function PrivacySettings({
  settings,
  apiKeyValidation,
  validating,
  onSettingChange,
  onValidateAPIKeys,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">API Configuration</h3>
        <button
          onClick={onValidateAPIKeys}
          disabled={validating}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {validating ? "Validating..." : "Test Keys"}
        </button>
      </div>

      {/* Unsplash API Key */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Unsplash API Key</h4>
          {apiKeyValidation && (
            <span
              className={`px-2 py-1 rounded text-xs ${
                apiKeyValidation.unsplash
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {apiKeyValidation.unsplash ? "Valid" : "Invalid"}
            </span>
          )}
        </div>
        <input
          type="password"
          value={settings.apiKeys.unsplash}
          onChange={(e) =>
            onSettingChange("apiKeys", {
              unsplash: e.target.value,
            })
          }
          placeholder="Enter your Unsplash API key"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
        />
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Get your API key from{" "}
          <a
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener"
            className="text-blue-600 hover:underline"
          >
            Unsplash Developers
          </a>
        </p>
      </div>

      {/* OpenAI API Key */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">OpenAI API Key</h4>
          {apiKeyValidation && (
            <span
              className={`px-2 py-1 rounded text-xs ${
                apiKeyValidation.openai
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {apiKeyValidation.openai ? "Valid" : "Invalid"}
            </span>
          )}
        </div>
        <input
          type="password"
          value={settings.apiKeys.openai}
          onChange={(e) =>
            onSettingChange("apiKeys", { openai: e.target.value })
          }
          placeholder="Enter your OpenAI API key"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
        />
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Get your API key from{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener"
            className="text-blue-600 hover:underline"
          >
            OpenAI Platform
          </a>
        </p>
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