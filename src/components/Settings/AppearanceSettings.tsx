"use client";

import { memo } from "react";
import { AppearanceSettingsProps } from "./types";

export const AppearanceSettings = memo<AppearanceSettingsProps>(function AppearanceSettings({
  settings,
  onSettingChange,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Theme Customization</h3>

      {/* Theme Mode */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Theme Mode</h4>
        <select
          value={settings.theme.mode}
          onChange={(e) =>
            onSettingChange("theme", {
              mode: e.target.value as any,
            })
          }
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">Follow System</option>
        </select>
      </div>

      {/* Custom Colors */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-3">Custom Colors</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Primary</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.theme.customColors.primary}
                onChange={(e) =>
                  onSettingChange("theme", {
                    customColors: {
                      ...settings.theme.customColors,
                      primary: e.target.value,
                    },
                  })
                }
                className="w-8 h-8 rounded border"
              />
              <input
                type="text"
                value={settings.theme.customColors.primary}
                onChange={(e) =>
                  onSettingChange("theme", {
                    customColors: {
                      ...settings.theme.customColors,
                      primary: e.target.value,
                    },
                  })
                }
                className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Secondary</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.theme.customColors.secondary}
                onChange={(e) =>
                  onSettingChange("theme", {
                    customColors: {
                      ...settings.theme.customColors,
                      secondary: e.target.value,
                    },
                  })
                }
                className="w-8 h-8 rounded border"
              />
              <input
                type="text"
                value={settings.theme.customColors.secondary}
                onChange={(e) =>
                  onSettingChange("theme", {
                    customColors: {
                      ...settings.theme.customColors,
                      secondary: e.target.value,
                    },
                  })
                }
                className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Accent</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.theme.customColors.accent}
                onChange={(e) =>
                  onSettingChange("theme", {
                    customColors: {
                      ...settings.theme.customColors,
                      accent: e.target.value,
                    },
                  })
                }
                className="w-8 h-8 rounded border"
              />
              <input
                type="text"
                value={settings.theme.customColors.accent}
                onChange={(e) =>
                  onSettingChange("theme", {
                    customColors: {
                      ...settings.theme.customColors,
                      accent: e.target.value,
                    },
                  })
                }
                className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Animation Preferences */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Animations</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enable interface animations
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.theme.animations}
            onChange={(e) =>
              onSettingChange("theme", {
                animations: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Reduced Motion</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Minimize motion for accessibility
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.theme.reducedMotion}
            onChange={(e) =>
              onSettingChange("theme", {
                reducedMotion: e.target.checked,
              })
            }
            className="rounded"
          />
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
        <h4 className="font-medium">Accessibility</h4>
        
        {/* Font Size */}
        <div className="flex items-center justify-between">
          <label className="text-sm">Font Size</label>
          <select
            value={settings.accessibility.fontSize}
            onChange={(e) =>
              onSettingChange("accessibility", {
                fontSize: e.target.value as any,
              })
            }
            className="px-3 py-1 rounded border dark:bg-gray-600 dark:border-gray-500"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </div>

        {/* Contrast */}
        <div className="flex items-center justify-between">
          <label className="text-sm">Contrast</label>
          <select
            value={settings.accessibility.contrast}
            onChange={(e) =>
              onSettingChange("accessibility", {
                contrast: e.target.value as any,
              })
            }
            className="px-3 py-1 rounded border dark:bg-gray-600 dark:border-gray-500"
          >
            <option value="normal">Normal</option>
            <option value="high">High Contrast</option>
          </select>
        </div>
      </div>
    </div>
  );
});

AppearanceSettings.displayName = "AppearanceSettings";