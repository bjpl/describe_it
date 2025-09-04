"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Palette,
  Accessibility,
  Shield,
  Database,
  Key,
  Bell,
  Languages,
  Clock,
  Target,
  Zap,
  HelpCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

interface ValidationError {
  field: string;
  message: string;
}

const EnhancedSettingsPanel: React.FC<{
  onClose?: () => void;
  className?: string;
}> = ({ onClose, className = "" }) => {
  const {
    settings,
    updateSettings,
    updateSection,
    resetSettings,
    exportSettings,
    importSettings,
    getCacheSize,
    clearCache,
    validateAPIKeys,
  } = useSettings();

  const [activeSection, setActiveSection] = useState("general");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [previewMode, setPreviewMode] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>("0 MB");

  // Load cache size on mount
  useEffect(() => {
    const sizeInBytes = getCacheSize();
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    setCacheSize(`${sizeInMB} MB`);
  }, [getCacheSize]);

  const sections: SettingsSection[] = [
    {
      id: "general",
      title: "General",
      icon: <Settings className="h-5 w-5" />,
      description: "Basic app preferences and language settings",
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: <Palette className="h-5 w-5" />,
      description: "Theme, colors, and visual preferences",
    },
    {
      id: "learning",
      title: "Learning",
      icon: <Target className="h-5 w-5" />,
      description: "Study preferences and difficulty settings",
    },
    {
      id: "accessibility",
      title: "Accessibility",
      icon: <Accessibility className="h-5 w-5" />,
      description: "Accessibility and usability options",
    },
    {
      id: "api",
      title: "API & Services",
      icon: <Key className="h-5 w-5" />,
      description: "API keys and external service configuration",
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: <Bell className="h-5 w-5" />,
      description: "Alert preferences and reminder settings",
    },
    {
      id: "privacy",
      title: "Privacy & Data",
      icon: <Shield className="h-5 w-5" />,
      description: "Data storage and privacy preferences",
    },
    {
      id: "advanced",
      title: "Advanced",
      icon: <Zap className="h-5 w-5" />,
      description: "Performance and developer options",
    },
  ];

  const validateField = useCallback(
    (field: string, value: any): string | null => {
      switch (field) {
        case "openaiApiKey":
          if (value && !value.startsWith("sk-")) {
            return 'OpenAI API key should start with "sk-"';
          }
          break;
        case "unsplashApiKey":
          if (value && value.length < 40) {
            return "Unsplash API key seems too short";
          }
          break;
        case "sessionTimeout":
          if (value < 5 || value > 120) {
            return "Session timeout must be between 5 and 120 minutes";
          }
          break;
        case "maxCacheSize":
          if (value < 10 || value > 1000) {
            return "Cache size must be between 10 and 1000 MB";
          }
          break;
      }
      return null;
    },
    [],
  );

  const handleSettingChange = useCallback(
    (section: string, field: string, value: any) => {
      const error = validateField(field, value);

      setValidationErrors((prev) => prev.filter((e) => e.field !== field));

      if (error) {
        setValidationErrors((prev) => [...prev, { field, message: error }]);
        return;
      }

      updateSection(section as any, { [field]: value });
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    [updateSection, validateField],
  );

  const togglePasswordVisibility = useCallback((field: string) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleExportSettings = useCallback(() => {
    try {
      const exported = exportSettings(false);
      const blob = new Blob([exported], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `describe-it-settings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setSaveStatus("error");
    }
  }, [exportSettings]);

  const handleImportSettings = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const success = importSettings(content);
          if (success) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          } else {
            setSaveStatus("error");
          }
        } catch {
          setSaveStatus("error");
        }
      };
      reader.readAsText(file);
    },
    [importSettings],
  );

  const handleResetSettings = useCallback(() => {
    if (
      confirm("Are you sure you want to reset all settings to default values?")
    ) {
      resetSettings();
      setValidationErrors([]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [resetSettings]);

  const handleClearCache = useCallback(() => {
    if (confirm("Are you sure you want to clear the application cache?")) {
      clearCache();
      setCacheSize("0 MB");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [clearCache]);

  const getFieldError = useCallback(
    (field: string) => {
      return validationErrors.find((e) => e.field === field)?.message;
    },
    [validationErrors],
  );

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Language / Idioma
        </label>
        <select
          value={settings.language.ui}
          onChange={(e) =>
            handleSettingChange("language", "ui", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Region
        </label>
        <select
          value="US" // Default region since not in AppSettings
          onChange={(e) => {
            // Region setting not implemented in current AppSettings
            console.log('Region setting not implemented:', e.target.value);
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
        >
          <option value="US">United States</option>
          <option value="ES">España</option>
          <option value="MX">México</option>
          <option value="AR">Argentina</option>
        </select>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.backup.autoBackup}
            onChange={(e) =>
              handleSettingChange("backup", "autoBackup", e.target.checked)
            }
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Auto-save progress
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Automatically save your learning progress
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Session Timeout (minutes)
        </label>
        <input
          type="number"
          min="5"
          max="120"
          value={30} // Default session timeout since not in AppSettings
          onChange={(e) => {
            // Session timeout setting not implemented in current AppSettings
            console.log('Session timeout setting not implemented:', e.target.value);
          }
          }
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 ${
            getFieldError("sessionTimeout")
              ? "border-red-300 dark:border-red-600"
              : "border-gray-300 dark:border-gray-600"
          }`}
        />
        {getFieldError("sessionTimeout") && (
          <p className="text-red-500 text-xs mt-1">
            {getFieldError("sessionTimeout")}
          </p>
        )}
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Theme
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(["light", "dark", "system"] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => handleSettingChange("theme", "mode", theme)}
              className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                settings.theme.mode === theme
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
              }`}
            >
              {theme === "light" && <Sun className="h-8 w-8 mb-2" />}
              {theme === "dark" && <Moon className="h-8 w-8 mb-2" />}
              {theme === "system" && <Monitor className="h-8 w-8 mb-2" />}
              <span className="text-sm font-medium capitalize">{theme}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color Scheme
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: "blue", color: "bg-blue-500" },
            { name: "green", color: "bg-green-500" },
            { name: "purple", color: "bg-purple-500" },
            { name: "orange", color: "bg-orange-500" },
          ].map((color) => (
            <button
              key={color.name}
              onClick={() =>
                handleSettingChange("theme", "customColors", { ...settings.theme.customColors, primary: color.name })
              }
              className={`aspect-square rounded-lg ${color.color} ${
                settings.theme.customColors.primary === color.name
                  ? "ring-2 ring-offset-2 ring-gray-400"
                  : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Font Size
        </label>
        <select
          value={settings.accessibility.fontSize}
          onChange={(e) =>
            handleSettingChange("accessibility", "fontSize", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="xl">Extra Large</option>
        </select>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.theme.animations}
            onChange={(e) =>
              handleSettingChange("theme", "animations", e.target.checked)
            }
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable animations
          </span>
        </label>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.theme.reducedMotion}
            onChange={(e) =>
              handleSettingChange(
                "appearance",
                "reducedMotion",
                e.target.checked,
              )
            }
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Reduce motion
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Reduces animations for accessibility
        </p>
      </div>
    </div>
  );

  const renderAPISettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              Security Notice
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              API keys are stored locally and never sent to our servers. Keep
              them secure.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          OpenAI API Key
        </label>
        <div className="relative">
          <input
            type={showPasswords.openaiApiKey ? "text" : "password"}
            value={settings.apiKeys.openai || ""}
            onChange={(e) =>
              handleSettingChange("apiKeys", "openai", e.target.value)
            }
            placeholder="sk-..."
            className={`w-full px-3 py-2 pr-10 border rounded-md bg-white dark:bg-gray-700 ${
              getFieldError("openaiApiKey")
                ? "border-red-300 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("openaiApiKey")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPasswords.openaiApiKey ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
        {getFieldError("openaiApiKey") && (
          <p className="text-red-500 text-xs mt-1">
            {getFieldError("openaiApiKey")}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Required for AI-powered descriptions and translations
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Unsplash API Key
        </label>
        <div className="relative">
          <input
            type={showPasswords.unsplashApiKey ? "text" : "password"}
            value={settings.apiKeys.unsplash || ""}
            onChange={(e) =>
              handleSettingChange("apiKeys", "unsplash", e.target.value)
            }
            className={`w-full px-3 py-2 pr-10 border rounded-md bg-white dark:bg-gray-700 ${
              getFieldError("unsplashApiKey")
                ? "border-red-300 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("unsplashApiKey")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPasswords.unsplashApiKey ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
        {getFieldError("unsplashApiKey") && (
          <p className="text-red-500 text-xs mt-1">
            {getFieldError("unsplashApiKey")}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Required for high-quality image search
        </p>
      </div>

      <div>
        <button
          onClick={() => validateAPIKeys()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Key className="h-4 w-4" />
          Test API Keys
        </button>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Performance Mode
        </label>
        <select
          value={settings.performance.imageQuality || "medium"}
          onChange={(e) =>
            handleSettingChange("performance", "imageQuality", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
        >
          <option value="performance">High Performance</option>
          <option value="balanced">Balanced</option>
          <option value="battery">Battery Saver</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cache Settings
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium">Current cache size</span>
              <p className="text-xs text-gray-500">{cacheSize}</p>
            </div>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Trash2 className="h-3 w-3" />
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.performance.analyticsEnabled || false}
            onChange={(e) =>
              handleSettingChange("performance", "analyticsEnabled", e.target.checked)
            }
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable debug logging
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Helps with troubleshooting issues
        </p>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.performance.analyticsEnabled || true}
            onChange={(e) =>
              handleSettingChange(
                "performance",
                "analyticsEnabled",
                e.target.checked,
              )
            }
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable anonymous analytics
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Helps us improve the application
        </p>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings();
      case "appearance":
        return renderAppearanceSettings();
      case "api":
        return renderAPISettings();
      case "advanced":
        return renderAdvancedSettings();
      default:
        return (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              This section is coming soon!
            </p>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`bg-white dark:bg-gray-900 ${className}`}
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Settings
              </h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Save Status */}
            <AnimatePresence>
              {saveStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                    saveStatus === "saved"
                      ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      : saveStatus === "error"
                        ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                  }`}
                >
                  {saveStatus === "saved" && <Check className="h-4 w-4" />}
                  {saveStatus === "error" && <X className="h-4 w-4" />}
                  {saveStatus === "saving" && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  <span className="text-sm font-medium">
                    {saveStatus === "saved" && "Settings saved!"}
                    {saveStatus === "error" && "Error saving settings"}
                    {saveStatus === "saving" && "Saving..."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section Navigation */}
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {section.icon}
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {section.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Quick Actions */}
            <div className="border-t border-gray-200 dark:border-gray-600 mt-6 pt-6 space-y-2">
              <button
                onClick={handleExportSettings}
                className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Settings
              </button>

              <label className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                Import Settings
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleResetSettings}
                className="w-full flex items-center gap-2 p-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="max-w-2xl">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {sections.find((s) => s.id === activeSection)?.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {sections.find((s) => s.id === activeSection)?.description}
                </p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderSectionContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedSettingsPanel;
