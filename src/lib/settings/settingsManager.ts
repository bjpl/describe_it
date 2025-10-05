import { logger } from '@/lib/logger';

export interface AppSettings {
  // API Configuration
  // MIGRATED TO CLAUDE: Added anthropic as primary AI provider
  apiKeys: {
    anthropic: string; // Claude Sonnet 4.5 (Primary)
    openai: string;    // Legacy/fallback
    unsplash: string;  // Image search
  };

  // Language Settings
  language: {
    ui: "en" | "es" | "fr" | "de" | "it" | "pt";
    target:
      | "spanish"
      | "french"
      | "german"
      | "italian"
      | "portuguese"
      | "english";
  };

  // Study Preferences
  study: {
    dailyGoal: number; // number of images/sessions
    reminderTimes: string[]; // array of "HH:MM" format
    enableReminders: boolean;
    difficulty: "beginner" | "intermediate" | "advanced";
    autoAdvance: boolean;
  };

  // Theme and Appearance
  theme: {
    mode: "light" | "dark" | "system";
    customColors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    animations: boolean;
    reducedMotion: boolean;
  };

  // Accessibility
  accessibility: {
    fontSize: "small" | "medium" | "large" | "xl";
    contrast: "normal" | "high";
    screenReader: boolean;
    keyboardNavigation: boolean;
    focusIndicator: boolean;
  };

  // Cache Settings
  cache: {
    maxSize: number; // in MB
    autoClean: boolean;
    retention: number; // days
  };

  // Export/Import
  backup: {
    autoBackup: boolean;
    backupFrequency: "daily" | "weekly" | "monthly";
    includeAPIKeys: boolean;
  };

  // Performance
  performance: {
    imageQuality: "low" | "medium" | "high";
    preloadImages: boolean;
    analyticsEnabled: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: {
    anthropic: "", // Claude Sonnet 4.5 (Primary AI)
    openai: "",    // Legacy fallback
    unsplash: "",  // Image search
  },
  language: {
    ui: "en",
    target: "spanish",
  },
  study: {
    dailyGoal: 10,
    reminderTimes: ["09:00", "15:00", "20:00"],
    enableReminders: true,
    difficulty: "intermediate",
    autoAdvance: false,
  },
  theme: {
    mode: "system",
    customColors: {
      primary: "#3B82F6",
      secondary: "#64748B",
      accent: "#8B5CF6",
    },
    animations: true,
    reducedMotion: false,
  },
  accessibility: {
    fontSize: "medium",
    contrast: "normal",
    screenReader: false,
    keyboardNavigation: true,
    focusIndicator: true,
  },
  cache: {
    maxSize: 50, // 50MB
    autoClean: true,
    retention: 7, // 7 days
  },
  backup: {
    autoBackup: false,
    backupFrequency: "weekly",
    includeAPIKeys: false,
  },
  performance: {
    imageQuality: "medium",
    preloadImages: true,
    analyticsEnabled: true,
  },
};

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: AppSettings;
  private listeners: ((settings: AppSettings) => void)[] = [];
  private readonly STORAGE_KEY = "describe-it-settings";
  private readonly STORAGE_VERSION = "1.0.0";

  private constructor() {
    this.settings = this.loadSettings();

    // Only apply settings and setup listeners on client side
    if (typeof window !== "undefined") {
      this.applySettings();
      this.setupSystemListeners();
    }
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  // Load settings from localStorage
  private loadSettings(): AppSettings {
    // SSR safety check
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Validate version and merge with defaults
        if (data.version === this.STORAGE_VERSION) {
          return { ...DEFAULT_SETTINGS, ...data.settings };
        }
      }
    } catch (error) {
      logger.warn("Failed to load settings from localStorage:", error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  // Save settings to localStorage (made public and async for external use)
  async saveSettings(): Promise<boolean> {
    // SSR safety check
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return false;
    }

    try {
      const data = {
        version: this.STORAGE_VERSION,
        settings: this.settings,
        timestamp: new Date().toISOString(),
      };
      
      // Use a Promise to make it properly async
      return await new Promise<boolean>((resolve) => {
        try {
          localStorage.setItem(this.STORAGE_KEY, safeStringify(data));
          logger.info('[SettingsManager] Settings saved successfully');
          resolve(true);
        } catch (error) {
          logger.error("Failed to save settings to localStorage:", error);
          resolve(false);
        }
      });
    } catch (error) {
      logger.error("Failed to save settings:", error);
      return false;
    }
  }
  
  // Private synchronous version for internal use
  private saveSettingsSync(): void {
    // SSR safety check
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      const data = {
        version: this.STORAGE_VERSION,
        settings: this.settings,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(this.STORAGE_KEY, safeStringify(data));
    } catch (error) {
      logger.error("Failed to save settings to localStorage:", error);
    }
  }

  // Apply settings to the application
  private applySettings(): void {
    this.applyTheme();
    this.applyAccessibility();
    this.applyLanguage();
    this.setupReminders();
  }

  // Apply theme settings
  private applyTheme(): void {
    // SSR safety check
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const { theme } = this.settings;
    const isDark =
      theme.mode === "dark" ||
      (theme.mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", isDark);

    // Apply custom colors
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.customColors.primary);
    root.style.setProperty("--color-secondary", theme.customColors.secondary);
    root.style.setProperty("--color-accent", theme.customColors.accent);

    // Apply animation preferences
    if (!theme.animations || theme.reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }

  // Apply accessibility settings
  private applyAccessibility(): void {
    // SSR safety check
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const { accessibility } = this.settings;
    const root = document.documentElement;

    // Font size
    root.classList.remove("text-small", "text-medium", "text-large", "text-xl");
    root.classList.add(`text-${accessibility.fontSize}`);

    // High contrast
    root.classList.toggle("high-contrast", accessibility.contrast === "high");

    // Focus indicators
    root.classList.toggle("focus-visible", accessibility.focusIndicator);
  }

  // Apply language settings
  private applyLanguage(): void {
    // SSR safety check
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const { language } = this.settings;
    document.documentElement.lang = language.ui;
    // Additional language application logic would go here
  }

  // Setup reminder notifications
  private setupReminders(): void {
    // SSR safety check
    if (typeof window === "undefined") {
      return;
    }

    if (!this.settings.study.enableReminders) return;

    // Request notification permission if not already granted
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Setup scheduled reminders (simplified version)
    this.settings.study.reminderTimes.forEach((time) => {
      // In a real implementation, you'd use a service worker or similar
      // to schedule notifications
      logger.info(`Reminder scheduled for ${time}`);
    });
  }

  // Setup system preference listeners
  private setupSystemListeners(): void {
    // SSR safety check
    if (typeof window === "undefined") {
      return;
    }

    // Listen for system theme changes
    if (this.settings.theme.mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        this.applyTheme();
        this.notifyListeners();
      });
    }

    // Listen for reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", (e) => {
      this.updateSettings({
        theme: {
          ...this.settings.theme,
          reducedMotion: e.matches,
        },
      });
    });
  }

  // Get current settings
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  // Update settings (partial update)
  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettingsSync();
    this.applySettings();
    this.notifyListeners();
  }

  // Update a specific section of settings
  updateSection<K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>,
  ): void {
    this.settings[section] = { ...this.settings[section], ...updates };
    this.saveSettingsSync();
    this.applySettings();
    this.notifyListeners();
  }

  // Reset settings to defaults
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettingsSync();
    this.applySettings();
    this.notifyListeners();
  }

  // Export settings
  exportSettings(includeAPIKeys = false): string {
    const exportData = {
      ...this.settings,
      apiKeys: includeAPIKeys
        ? this.settings.apiKeys
        : { unsplash: "", openai: "" },
    };

    return safeStringify(
      {
        version: this.STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        settings: exportData,
      },
      null,
      2,
    );
  }

  // Import settings
  importSettings(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version && parsed.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        this.saveSettingsSync();
        this.applySettings();
        this.notifyListeners();
        return true;
      }
    } catch (error) {
      logger.error("Failed to import settings:", error);
    }
    return false;
  }

  // Cache management
  getCacheSize(): number {
    // SSR safety check
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return 0;
    }

    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length;
        }
      }
      return Math.round((total / 1024 / 1024) * 100) / 100; // MB
    } catch {
      return 0;
    }
  }

  clearCache(): void {
    // SSR safety check
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      const keysToKeep = [this.STORAGE_KEY];
      const allKeys = Object.keys(localStorage);

      allKeys.forEach((key) => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear any caches managed by the app
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    } catch (error) {
      logger.error("Failed to clear cache:", error);
    }
  }

  // Settings change listener
  addListener(callback: (settings: AppSettings) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.settings));
  }

  // Validate API keys
  async validateAPIKeys(): Promise<{ unsplash: boolean; openai: boolean }> {
    const results = { unsplash: false, openai: false };

    // Validate Unsplash API key
    if (this.settings.apiKeys.unsplash) {
      // Check if it's a valid format (Unsplash keys are typically 40+ characters)
      const key = this.settings.apiKeys.unsplash.trim();
      if (key.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(key)) {
        // For now, just validate the format since direct API calls cause CORS issues
        // The actual validation happens when making search requests
        results.unsplash = true;
      } else {
        results.unsplash = false;
      }
    }

    // Validate OpenAI API key
    if (this.settings.apiKeys.openai) {
      try {
        const response = await fetch("/api/health?check=openai", {
          headers: {
            Authorization: `Bearer ${this.settings.apiKeys.openai}`,
          },
        });
        results.openai = response.ok;
      } catch {
        results.openai = false;
      }
    }

    return results;
  }
}

export const settingsManager = SettingsManager.getInstance();
