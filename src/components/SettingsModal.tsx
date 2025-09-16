"use client";

import { memo, useCallback, useState, useEffect, useRef } from "react";
import {
  settingsManager,
  type AppSettings,
} from "@/lib/settings/settingsManager";
import {
  GeneralSettings,
  AppearanceSettings,
  PrivacySettings,
  ExportSettings,
  NotificationSettings,
  type TabType,
  type Tab,
} from "./Settings";
import { ApiKeysSection } from "./Settings/ApiKeysSection";

interface SettingsModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  onToggleDarkMode: () => void;
}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const tabs: Tab[] = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "apikeys", label: "API Keys", icon: "🔑" },
    { id: "theme", label: "Appearance", icon: "🎨" },
    { id: "study", label: "Study & Notifications", icon: "📚" },
    { id: "privacy", label: "Privacy", icon: "🔒" },
    { id: "cache", label: "Data & Export", icon: "💾" },
  ];

  // Map legacy tab names to new component structure
  const getTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralSettings
            settings={settings}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            onSettingChange={handleSettingChange}
          />
        );
      case "apikeys":
        return <ApiKeysSection />;
      case "privacy":
      case "api": // Legacy support
      case "language": // Legacy support
        return (
          <PrivacySettings
            settings={settings}
            apiKeyValidation={apiKeyValidation}
            validating={validating}
            onSettingChange={handleSettingChange}
            onValidateAPIKeys={validateAPIKeys}
          />
        );
      case "theme":
      case "accessibility": // Legacy support - combined into appearance
        return (
          <AppearanceSettings
            settings={settings}
            onSettingChange={handleSettingChange}
          />
        );
      case "study":
        return (
          <NotificationSettings
            settings={settings}
            onSettingChange={handleSettingChange}
          />
        );
      case "cache":
      case "backup": // Legacy support - combined into export
        return (
          <ExportSettings
            settings={settings}
            cacheSize={cacheSize}
            onSettingChange={handleSettingChange}
            onClearCache={clearCache}
            onExportSettings={exportSettings}
            onImportSettings={importSettings}
            onResetSettings={resetSettings}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto flex-shrink-0">
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
            {getTabContent()}

            {/* Footer */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-600 mt-6">
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