"use client";

import { memo } from "react";
import { ExportSettingsProps } from "./types";

export const ExportSettings = memo<ExportSettingsProps>(function ExportSettings({
  settings,
  cacheSize,
  onSettingChange,
  onClearCache,
  onExportSettings,
  onImportSettings,
  onResetSettings,
  fileInputRef,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Cache Management & Data</h3>

      {/* Cache Status */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">Storage Usage</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current cache size: {cacheSize.toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={onClearCache}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear Cache
          </button>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((cacheSize / settings.cache.maxSize) * 100, 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
          <span>0 MB</span>
          <span>{settings.cache.maxSize} MB</span>
        </div>
      </div>

      {/* Cache Settings */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Max Cache Size (MB)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic cleanup when exceeded
            </p>
          </div>
          <input
            type="number"
            min="10"
            max="500"
            value={settings.cache.maxSize}
            onChange={(e) =>
              onSettingChange("cache", {
                maxSize: parseInt(e.target.value) || 50,
              })
            }
            className="w-20 px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Auto Clean</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically clean old cache data
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.cache.autoClean}
            onChange={(e) =>
              onSettingChange("cache", {
                autoClean: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Retention (Days)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              How long to keep cached data
            </p>
          </div>
          <input
            type="number"
            min="1"
            max="30"
            value={settings.cache.retention}
            onChange={(e) =>
              onSettingChange("cache", {
                retention: parseInt(e.target.value) || 7,
              })
            }
            className="w-16 px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500"
          />
        </div>
      </div>

      {/* Export Settings */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Export Settings</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Export your settings to share or backup
        </p>
        <button
          onClick={onExportSettings}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export Settings
        </button>
      </div>

      {/* Import Settings */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Import Settings</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Import settings from a backup file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportSettings}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Import Settings
        </button>
      </div>

      {/* Auto Backup */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Auto Backup</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically backup settings
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.backup.autoBackup}
            onChange={(e) =>
              onSettingChange("backup", {
                autoBackup: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>

        {settings.backup.autoBackup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Backup Frequency</label>
              <select
                value={settings.backup.backupFrequency}
                onChange={(e) =>
                  onSettingChange("backup", {
                    backupFrequency: e.target.value as any,
                  })
                }
                className="px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Include API Keys</span>
                <p className="text-xs text-gray-500">
                  ⚠️ Not recommended for shared backups
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.backup.includeAPIKeys}
                onChange={(e) =>
                  onSettingChange("backup", {
                    includeAPIKeys: e.target.checked,
                  })
                }
                className="rounded"
              />
            </div>
          </div>
        )}
      </div>

      {/* Reset Settings */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
          Reset Settings
        </h4>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          This will reset all settings to their default values. This action
          cannot be undone.
        </p>
        <button
          onClick={onResetSettings}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
});

ExportSettings.displayName = "ExportSettings";