"use client";

import { memo, useCallback, useState, useEffect, useRef } from "react";
import {
  settingsManager,
  type AppSettings,
} from "@/lib/settings/settingsManager";

interface SettingsModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  onToggleDarkMode: () => void;
}

type TabType =
  | "general"
  | "api"
  | "language"
  | "study"
  | "theme"
  | "accessibility"
  | "cache"
  | "backup";

export const SettingsModal = memo<SettingsModalProps>(function SettingsModal({
  isOpen,
  darkMode,
  onClose,
  onToggleDarkMode,
}) {
  const [settings, setSettings] = useState<AppSettings>(
    settingsManager.getSettings(),
  );
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [apiKeyValidation, setApiKeyValidation] = useState<{
    unsplash: boolean;
    openai: boolean;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update settings when they change
  useEffect(() => {
    const unsubscribe = settingsManager.addListener(setSettings);
    return unsubscribe;
  }, []);

  // Load cache size
  useEffect(() => {
    if (isOpen) {
      setCacheSize(settingsManager.getCacheSize());
    }
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSettingChange = useCallback(
    <K extends keyof AppSettings>(
      section: K,
      updates: Partial<AppSettings[K]>,
    ) => {
      settingsManager.updateSection(section, updates);
    },
    [],
  );

  const validateAPIKeys = useCallback(async () => {
    setValidating(true);
    try {
      const results = await settingsManager.validateAPIKeys();
      setApiKeyValidation(results);
    } catch (error) {
      console.error("API validation failed:", error);
      setApiKeyValidation({ unsplash: false, openai: false });
    } finally {
      setValidating(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    if (
      confirm(
        "Are you sure you want to clear the cache? This will remove stored images and data.",
      )
    ) {
      settingsManager.clearCache();
      setCacheSize(0);
    }
  }, []);

  const exportSettings = useCallback(() => {
    const includeAPIKeys = confirm(
      "Include API keys in export? (Not recommended for sharing)",
    );
    const data = settingsManager.exportSettings(includeAPIKeys);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `describe-it-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importSettings = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          const success = settingsManager.importSettings(data);
          if (success) {
            alert("Settings imported successfully!");
          } else {
            alert("Failed to import settings. Please check the file format.");
          }
        } catch (error) {
          alert("Failed to read settings file.");
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const resetSettings = useCallback(() => {
    if (
      confirm(
        "Are you sure you want to reset all settings to defaults? This cannot be undone.",
      )
    ) {
      settingsManager.resetSettings();
    }
  }, []);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "api", label: "API Keys", icon: "🔑" },
    { id: "language", label: "Language", icon: "🌍" },
    { id: "study", label: "Study", icon: "📚" },
    { id: "theme", label: "Theme", icon: "🎨" },
    { id: "accessibility", label: "Accessibility", icon: "♿" },
    { id: "cache", label: "Cache", icon: "💾" },
    { id: "backup", label: "Backup", icon: "📦" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Settings
            </h2>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && (
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
                          handleSettingChange("performance", {
                            imageQuality: e.target.value as
                              | "low"
                              | "medium"
                              | "high",
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
                          handleSettingChange("performance", {
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
                          handleSettingChange("performance", {
                            analyticsEnabled: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "api" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">API Configuration</h3>
                  <button
                    onClick={validateAPIKeys}
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
                      handleSettingChange("apiKeys", {
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
                      handleSettingChange("apiKeys", { openai: e.target.value })
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
              </div>
            )}

            {activeTab === "language" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Language Settings</h3>

                {/* UI Language */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Interface Language</h4>
                  <select
                    value={settings.language.ui}
                    onChange={(e) =>
                      handleSettingChange("language", {
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
                  <h4 className="font-medium mb-3">Learning Target</h4>
                  <select
                    value={settings.language.target}
                    onChange={(e) =>
                      handleSettingChange("language", {
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
            )}

            {activeTab === "study" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Study Preferences</h3>

                {/* Daily Goal */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Daily Goal</h4>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={settings.study.dailyGoal}
                      onChange={(e) =>
                        handleSettingChange("study", {
                          dailyGoal: parseInt(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-16 text-center">
                      {settings.study.dailyGoal} images
                    </span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Difficulty Level</h4>
                  <select
                    value={settings.study.difficulty}
                    onChange={(e) =>
                      handleSettingChange("study", {
                        difficulty: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                {/* Reminders */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Study Reminders</h4>
                    <input
                      type="checkbox"
                      checked={settings.study.enableReminders}
                      onChange={(e) =>
                        handleSettingChange("study", {
                          enableReminders: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>

                  {settings.study.enableReminders && (
                    <div className="space-y-2">
                      {settings.study.reminderTimes.map((time, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [
                                ...settings.study.reminderTimes,
                              ];
                              newTimes[index] = e.target.value;
                              handleSettingChange("study", {
                                reminderTimes: newTimes,
                              });
                            }}
                            className="px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500"
                          />
                          <button
                            onClick={() => {
                              const newTimes =
                                settings.study.reminderTimes.filter(
                                  (_, i) => i !== index,
                                );
                              handleSettingChange("study", {
                                reminderTimes: newTimes,
                              });
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      {settings.study.reminderTimes.length < 5 && (
                        <button
                          onClick={() => {
                            const newTimes = [
                              ...settings.study.reminderTimes,
                              "12:00",
                            ];
                            handleSettingChange("study", {
                              reminderTimes: newTimes,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Add Reminder
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Auto Advance */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Auto Advance</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically move to next image after completing tasks
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.study.autoAdvance}
                      onChange={(e) =>
                        handleSettingChange("study", {
                          autoAdvance: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "theme" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Theme Customization</h3>

                {/* Theme Mode */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Theme Mode</h4>
                  <select
                    value={settings.theme.mode}
                    onChange={(e) =>
                      handleSettingChange("theme", {
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
                            handleSettingChange("theme", {
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
                            handleSettingChange("theme", {
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
                            handleSettingChange("theme", {
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
                            handleSettingChange("theme", {
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
                            handleSettingChange("theme", {
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
                            handleSettingChange("theme", {
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
                        handleSettingChange("theme", {
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
                        handleSettingChange("theme", {
                          reducedMotion: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "accessibility" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Accessibility Options</h3>

                {/* Font Size */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Font Size</h4>
                  <select
                    value={settings.accessibility.fontSize}
                    onChange={(e) =>
                      handleSettingChange("accessibility", {
                        fontSize: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>

                {/* Contrast */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Contrast</h4>
                  <select
                    value={settings.accessibility.contrast}
                    onChange={(e) =>
                      handleSettingChange("accessibility", {
                        contrast: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Contrast</option>
                  </select>
                </div>

                {/* Screen Reader Support */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Screen Reader Support</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Optimize for screen readers
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.accessibility.screenReader}
                      onChange={(e) =>
                        handleSettingChange("accessibility", {
                          screenReader: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Keyboard Navigation</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enhanced keyboard support
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.accessibility.keyboardNavigation}
                      onChange={(e) =>
                        handleSettingChange("accessibility", {
                          keyboardNavigation: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Focus Indicators</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Show focus outlines
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.accessibility.focusIndicator}
                      onChange={(e) =>
                        handleSettingChange("accessibility", {
                          focusIndicator: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cache" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Cache Management</h3>

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
                      onClick={clearCache}
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
                        handleSettingChange("cache", {
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
                        handleSettingChange("cache", {
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
                        handleSettingChange("cache", {
                          retention: parseInt(e.target.value) || 7,
                        })
                      }
                      className="w-16 px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "backup" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Export & Import</h3>

                {/* Export Settings */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Export Settings</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Export your settings to share or backup
                  </p>
                  <button
                    onClick={exportSettings}
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
                    onChange={importSettings}
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
                        handleSettingChange("backup", {
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
                            handleSettingChange("backup", {
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
                            handleSettingChange("backup", {
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
                    This will reset all settings to their default values. This
                    action cannot be undone.
                  </p>
                  <button
                    onClick={resetSettings}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reset All Settings
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SettingsModal.displayName = "SettingsModal";
