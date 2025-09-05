"use client";

import { memo } from "react";
import { GeneralSettingsProps } from "./types";

export const GeneralSettings = memo<GeneralSettingsProps>(function GeneralSettings({
  settings,
  darkMode,
  onToggleDarkMode,
  onSettingChange,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">General Settings</h3>

      {/* Dark Mode */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div>
          <h4 className="font-medium">Dark Mode</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Toggle between light and dark themes
          </p>
        </div>
        <button
          onClick={onToggleDarkMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            darkMode ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              darkMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Performance */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Performance</h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm">Image Quality</label>
            <select
              value={settings.performance.imageQuality}
              onChange={(e) =>
                onSettingChange("performance", {
                  imageQuality: e.target.value as "low" | "medium" | "high",
                })
              }
              className="px-3 py-1 rounded border dark:bg-gray-600 dark:border-gray-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm">Preload Images</label>
            <input
              type="checkbox"
              checked={settings.performance.preloadImages}
              onChange={(e) =>
                onSettingChange("performance", {
                  preloadImages: e.target.checked,
                })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm">Enable Analytics</label>
            <input
              type="checkbox"
              checked={settings.performance.analyticsEnabled}
              onChange={(e) =>
                onSettingChange("performance", {
                  analyticsEnabled: e.target.checked,
                })
              }
              className="rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

GeneralSettings.displayName = "GeneralSettings";