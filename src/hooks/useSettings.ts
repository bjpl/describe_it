import { useState, useEffect, useCallback } from "react";
import {
  settingsManager,
  type AppSettings,
  DEFAULT_SETTINGS,
} from "@/lib/settings/settingsManager";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window !== "undefined") {
      // Load current settings
      setSettings(settingsManager.getSettings());

      // Listen for changes
      const unsubscribe = settingsManager.addListener(setSettings);
      return unsubscribe;
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    settingsManager.updateSettings(updates);
  }, []);

  const updateSection = useCallback(
    <K extends keyof AppSettings>(
      section: K,
      updates: Partial<AppSettings[K]>,
    ) => {
      settingsManager.updateSection(section, updates);
    },
    [],
  );

  const resetSettings = useCallback(() => {
    settingsManager.resetSettings();
  }, []);

  const exportSettings = useCallback((includeAPIKeys = false) => {
    return settingsManager.exportSettings(includeAPIKeys);
  }, []);

  const importSettings = useCallback((data: string) => {
    return settingsManager.importSettings(data);
  }, []);

  const getCacheSize = useCallback(() => {
    return settingsManager.getCacheSize();
  }, []);

  const clearCache = useCallback(() => {
    settingsManager.clearCache();
  }, []);

  const validateAPIKeys = useCallback(() => {
    return settingsManager.validateAPIKeys();
  }, []);

  return {
    settings,
    updateSettings,
    updateSection,
    resetSettings,
    exportSettings,
    importSettings,
    getCacheSize,
    clearCache,
    validateAPIKeys,
  };
}
