/**
 * SettingsService - Business Logic for User Settings Management
 *
 * Handles user settings persistence, validation, and defaults.
 */

import { descriptionCache } from '@/lib/cache';
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';
import type { UserSettings, SettingsMetadata } from '../types/entities';

export interface SettingsData {
  userId: string;
  settings: UserSettings;
  metadata: SettingsMetadata & {
    timestamp: string;
    lastUpdated?: string;
    isDefault?: boolean;
    error?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Service for managing user settings
 */
export class SettingsService {
  private cachePrefix = 'settings';

  private userPrefix(userId: string): string {
    return `${this.cachePrefix}:user:${userId}`;
  }

  // Default settings structure
  private defaultSettings: UserSettings = {
    language: {
      primary: 'es',
      secondary: 'en',
      learningDirection: 'primary_to_secondary',
    },
    difficulty: {
      preferred: 'intermediate',
      adaptive: true,
      autoAdjust: false,
    },
    content: {
      style: 'conversacional',
      maxPhrases: 10,
      maxQuestions: 5,
      includeTranslations: false,
      includeExamples: true,
      includeContext: true,
      questionTypes: ['multiple_choice', 'open_ended'],
    },
    interface: {
      theme: 'system',
      fontSize: 'medium',
      animations: true,
      soundEffects: false,
      compactMode: false,
      showProgress: true,
    },
    session: {
      autoSave: true,
      sessionTimeout: 30,
      reminderIntervals: [1, 7, 30],
      goalTracking: true,
      streakTracking: true,
      achievementNotifications: true,
    },
    privacy: {
      saveProgress: true,
      saveVocabulary: true,
      analytics: false,
      shareProgress: false,
      dataRetention: 90,
    },
    export: {
      defaultFormat: 'json',
      includeMetadata: false,
      includeProgress: false,
      autoExportInterval: 'never',
    },
    advanced: {
      cacheEnabled: true,
      preloadContent: true,
      debugMode: false,
      experimentalFeatures: false,
      apiTimeout: 30,
      maxRetries: 3,
    },
  };

  /**
   * Save user settings
   */
  async saveSettings(
    userId: string,
    settings: Partial<UserSettings>,
    metadata?: Partial<SettingsMetadata>
  ): Promise<SettingsData> {
    const timestamp = new Date().toISOString();

    // Get existing settings to merge
    const existingSettings = (await this.getSettings(userId)) || {};

    // Deep merge settings
    const mergedSettings = this.deepMerge(
      existingSettings.settings || this.defaultSettings,
      settings
    );

    const settingsData: SettingsData = {
      userId,
      settings: mergedSettings,
      metadata: {
        ...metadata,
        version: '1.0',
        timestamp,
        lastUpdated: timestamp,
        source: metadata?.source || 'web',
      },
      createdAt: existingSettings.createdAt || timestamp,
      updatedAt: timestamp,
    };

    // Save settings
    const settingsKey = `${this.userPrefix(userId)}:config`;
    await descriptionCache.set(settingsData, 86400 * 365, settingsKey);

    // Save settings backup (for recovery)
    const backupKey = `${this.userPrefix(userId)}:backup:${Date.now()}`;
    await descriptionCache.set(settingsData, 86400 * 30, backupKey);

    // Update user profile with settings summary
    await this.updateUserProfile(userId, mergedSettings, timestamp);

    return settingsData;
  }

  /**
   * Get user settings
   */
  async getSettings(
    userId: string,
    section?: string,
    includeDefaults: boolean = true
  ): Promise<SettingsData | null> {
    const settingsKey = `${this.userPrefix(userId)}:config`;

    try {
      const settings = await descriptionCache.get<SettingsData>(settingsKey);

      if (!settings) {
        if (includeDefaults) {
          return {
            userId,
            settings: this.defaultSettings,
            metadata: {
              version: '1.0',
              timestamp: new Date().toISOString(),
              source: 'defaults',
              isDefault: true,
            },
          };
        }
        return null;
      }

      // Merge with defaults to ensure all properties exist
      if (includeDefaults) {
        settings.settings = this.deepMerge(
          this.defaultSettings,
          settings.settings || {}
        );
      }

      // Return specific section if requested
      if (section && settings.settings[section as keyof UserSettings]) {
        return {
          ...settings,
          settings: {
            [section]: settings.settings[section as keyof UserSettings],
          } as UserSettings,
        };
      }

      return settings;
    } catch (error) {
      apiLogger.warn('Failed to get settings:', asLogContext(error));

      if (includeDefaults) {
        return {
          userId,
          settings: this.defaultSettings,
          metadata: {
            version: '1.0',
            timestamp: new Date().toISOString(),
            source: 'defaults_fallback',
            isDefault: true,
            error: (error as Error).message,
          },
        };
      }

      return null;
    }
  }

  /**
   * Update user profile with settings summary
   */
  private async updateUserProfile(
    userId: string,
    settings: UserSettings,
    timestamp: string
  ): Promise<void> {
    try {
      const summary = {
        userId,
        primaryLanguage: settings.language?.primary || 'es',
        difficulty: settings.difficulty?.preferred || 'intermediate',
        theme: settings.interface?.theme || 'system',
        lastUpdated: timestamp,
        features: {
          adaptiveDifficulty: settings.difficulty?.adaptive || false,
          autoSave: settings.session?.autoSave || true,
          goalTracking: settings.session?.goalTracking || true,
          analytics: settings.privacy?.analytics || false,
        },
      };

      await descriptionCache.set(
        summary,
        86400 * 365,
        `profile:user:${userId}:settings_summary`
      );
    } catch (error) {
      apiLogger.warn('Failed to update user profile:', asLogContext(error));
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(
    userId: string,
    sections?: string[]
  ): Promise<SettingsData> {
    const timestamp = new Date().toISOString();

    if (sections && sections.length > 0) {
      // Reset specific sections
      const currentSettings = await this.getSettings(userId, undefined, false);
      if (currentSettings) {
        const resetSettings = { ...currentSettings.settings };
        sections.forEach(section => {
          if (this.defaultSettings[section as keyof UserSettings]) {
            (resetSettings as any)[section] =
              this.defaultSettings[section as keyof UserSettings];
          }
        });
        return await this.saveSettings(userId, resetSettings, {
          source: 'reset_partial',
          timestamp,
        });
      }
    }

    // Reset all settings to defaults
    return await this.saveSettings(userId, this.defaultSettings, {
      source: 'reset_all',
      timestamp,
    });
  }

  /**
   * Get settings history
   */
  async getSettingsHistory(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    timestamp: string;
    settings: UserSettings;
    version: string;
    source: string;
  }>> {
    const current = await this.getSettings(userId);
    const backups: any[] = [];

    if (current) {
      backups.push({
        timestamp: current.updatedAt || current.metadata?.timestamp,
        settings: current.settings,
        version: current.metadata?.version,
        source: current.metadata?.source,
      });
    }

    return backups.slice(0, limit);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate settings
   */
  validateSettings(settings: Partial<UserSettings>): ValidationResult {
    const errors: string[] = [];

    // Language validation
    if (settings.language) {
      if (settings.language.primary === settings.language.secondary) {
        errors.push('Primary and secondary languages cannot be the same');
      }
    }

    // Content validation
    if (settings.content) {
      if (settings.content.maxPhrases && settings.content.maxPhrases > 20) {
        errors.push('Maximum phrases cannot exceed 20');
      }
      if (settings.content.maxQuestions && settings.content.maxQuestions > 15) {
        errors.push('Maximum questions cannot exceed 15');
      }
    }

    // Session validation
    if (settings.session) {
      if (
        settings.session.sessionTimeout &&
        (settings.session.sessionTimeout < 5 ||
          settings.session.sessionTimeout > 120)
      ) {
        errors.push('Session timeout must be between 5 and 120 minutes');
      }
    }

    // Privacy validation
    if (settings.privacy) {
      if (
        settings.privacy.dataRetention &&
        (settings.privacy.dataRetention < 1 ||
          settings.privacy.dataRetention > 365)
      ) {
        errors.push('Data retention must be between 1 and 365 days');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
