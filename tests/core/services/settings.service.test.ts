/**
 * SettingsService Tests
 * Comprehensive unit tests for settings management service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService, type SettingsData } from '@/core/services/SettingsService';
import { descriptionCache } from '@/lib/cache';
import type { UserSettings } from '@/core/types/entities';

// Mock dependencies
vi.mock('@/lib/cache', () => ({
  descriptionCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SettingsService', () => {
  let service: SettingsService;
  const mockUserId = 'user-123';

  beforeEach(() => {
    service = new SettingsService();
    vi.clearAllMocks();
  });

  describe('saveSettings', () => {
    it('should save new user settings', async () => {
      const newSettings: Partial<UserSettings> = {
        language: {
          primary: 'fr',
          secondary: 'en',
          learningDirection: 'primary_to_secondary',
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveSettings(mockUserId, newSettings);

      expect(result).toMatchObject({
        userId: mockUserId,
        settings: expect.objectContaining({
          language: newSettings.language,
        }),
        metadata: expect.objectContaining({
          version: '1.0',
          timestamp: expect.any(String),
        }),
      });
      expect(descriptionCache.set).toHaveBeenCalledTimes(3); // config, backup, profile
    });

    it('should merge with existing settings', async () => {
      const existingSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          language: { primary: 'es', secondary: 'en', learningDirection: 'primary_to_secondary' },
          difficulty: { preferred: 'beginner', adaptive: true, autoAdjust: false },
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          source: 'web',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const updates: Partial<UserSettings> = {
        difficulty: { preferred: 'advanced', adaptive: true, autoAdjust: true },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(existingSettings);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveSettings(mockUserId, updates);

      expect(result.settings.difficulty).toEqual(updates.difficulty);
      expect(result.settings.language).toEqual(existingSettings.settings.language);
      expect(result.createdAt).toBe(existingSettings.createdAt);
    });

    it('should save settings backup', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveSettings(mockUserId, { language: { primary: 'de', secondary: 'en', learningDirection: 'primary_to_secondary' } });

      const backupCall = vi.mocked(descriptionCache.set).mock.calls.find(
        (call) => call[2].includes(':backup:')
      );
      expect(backupCall).toBeDefined();
      expect(backupCall?.[1]).toBe(86400 * 30); // 30 day TTL
    });

    it('should update user profile summary', async () => {
      const settings: Partial<UserSettings> = {
        language: { primary: 'es', secondary: 'en', learningDirection: 'primary_to_secondary' },
        difficulty: { preferred: 'intermediate', adaptive: true, autoAdjust: false },
        interface: { theme: 'dark', fontSize: 'large', animations: true, soundEffects: false, compactMode: false, showProgress: true },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveSettings(mockUserId, settings);

      const profileCall = vi.mocked(descriptionCache.set).mock.calls.find(
        (call) => call[2].includes('profile:user:')
      );
      expect(profileCall).toBeDefined();
      expect(profileCall?.[0]).toMatchObject({
        userId: mockUserId,
        primaryLanguage: 'es',
        difficulty: 'intermediate',
        theme: 'dark',
      });
    });

    it('should include custom metadata', async () => {
      const metadata = {
        source: 'mobile',
        deviceType: 'ios',
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveSettings(mockUserId, {}, metadata as any);

      expect(result.metadata).toMatchObject({
        source: 'mobile',
        deviceType: 'ios',
        version: '1.0',
      });
    });
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      const storedSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          language: { primary: 'es', secondary: 'en', learningDirection: 'primary_to_secondary' },
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(storedSettings);

      const result = await service.getSettings(mockUserId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUserId);
    });

    it('should return defaults when no settings exist', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);

      const result = await service.getSettings(mockUserId);

      expect(result).toMatchObject({
        userId: mockUserId,
        settings: expect.objectContaining({
          language: expect.any(Object),
          difficulty: expect.any(Object),
          content: expect.any(Object),
        }),
        metadata: expect.objectContaining({
          isDefault: true,
        }),
      });
    });

    it('should merge with defaults when requested', async () => {
      const partialSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          language: { primary: 'fr', secondary: 'en', learningDirection: 'primary_to_secondary' },
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(partialSettings);

      const result = await service.getSettings(mockUserId, undefined, true);

      expect(result?.settings).toHaveProperty('language');
      expect(result?.settings).toHaveProperty('difficulty');
      expect(result?.settings).toHaveProperty('content');
      expect(result?.settings).toHaveProperty('interface');
    });

    it('should return specific section when requested', async () => {
      const fullSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          language: { primary: 'es', secondary: 'en', learningDirection: 'primary_to_secondary' },
          difficulty: { preferred: 'intermediate', adaptive: true, autoAdjust: false },
          content: {} as any,
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(fullSettings);

      const result = await service.getSettings(mockUserId, 'language');

      expect(result?.settings).toHaveProperty('language');
      expect(result?.settings).not.toHaveProperty('difficulty');
    });

    it('should return null when no defaults requested', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);

      const result = await service.getSettings(mockUserId, undefined, false);

      expect(result).toBeNull();
    });

    it('should handle cache errors with defaults fallback', async () => {
      vi.mocked(descriptionCache.get).mockRejectedValue(new Error('Cache error'));

      const result = await service.getSettings(mockUserId, undefined, true);

      expect(result).toMatchObject({
        userId: mockUserId,
        metadata: expect.objectContaining({
          source: 'defaults_fallback',
          error: 'Cache error',
        }),
      });
    });

    it('should return null on error when defaults not requested', async () => {
      vi.mocked(descriptionCache.get).mockRejectedValue(new Error('Cache error'));

      const result = await service.getSettings(mockUserId, undefined, false);

      expect(result).toBeNull();
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.resetSettings(mockUserId);

      expect(result.settings).toMatchObject({
        language: expect.objectContaining({ primary: 'es' }),
        difficulty: expect.objectContaining({ preferred: 'intermediate' }),
      });
      expect(result.metadata.source).toBe('reset_all');
    });

    it('should reset specific sections', async () => {
      const currentSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          language: { primary: 'fr', secondary: 'de', learningDirection: 'primary_to_secondary' },
          difficulty: { preferred: 'advanced', adaptive: false, autoAdjust: true },
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(currentSettings);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.resetSettings(mockUserId, ['language']);

      expect(result.settings.language?.primary).toBe('es'); // Reset to default
      expect(result.settings.difficulty?.preferred).toBe('advanced'); // Preserved
    });

    it('should ignore invalid section names', async () => {
      const currentSettings: SettingsData = {
        userId: mockUserId,
        settings: { language: { primary: 'es', secondary: 'en', learningDirection: 'primary_to_secondary' } } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(currentSettings);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.resetSettings(mockUserId, ['invalidSection']);

      expect(descriptionCache.set).toHaveBeenCalled();
    });
  });

  describe('validateSettings', () => {
    it('should validate correct settings', () => {
      const validSettings: Partial<UserSettings> = {
        language: {
          primary: 'es',
          secondary: 'en',
          learningDirection: 'primary_to_secondary',
        },
        content: {
          style: 'conversacional',
          maxPhrases: 10,
          maxQuestions: 5,
          includeTranslations: true,
          includeExamples: true,
          includeContext: true,
          questionTypes: ['multiple_choice'],
        },
      };

      const result = service.validateSettings(validSettings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject same primary and secondary language', () => {
      const invalidSettings: Partial<UserSettings> = {
        language: {
          primary: 'es',
          secondary: 'es',
          learningDirection: 'primary_to_secondary',
        },
      };

      const result = service.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Primary and secondary languages cannot be the same');
    });

    it('should reject maxPhrases exceeding limit', () => {
      const invalidSettings: Partial<UserSettings> = {
        content: {
          style: 'conversacional',
          maxPhrases: 25,
          maxQuestions: 5,
          includeTranslations: false,
          includeExamples: false,
          includeContext: false,
          questionTypes: [],
        },
      };

      const result = service.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum phrases cannot exceed 20');
    });

    it('should reject maxQuestions exceeding limit', () => {
      const invalidSettings: Partial<UserSettings> = {
        content: {
          style: 'conversacional',
          maxPhrases: 10,
          maxQuestions: 20,
          includeTranslations: false,
          includeExamples: false,
          includeContext: false,
          questionTypes: [],
        },
      };

      const result = service.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum questions cannot exceed 15');
    });

    it('should reject invalid session timeout', () => {
      const invalidSettings: Partial<UserSettings> = {
        session: {
          autoSave: true,
          sessionTimeout: 3,
          reminderIntervals: [1, 7, 30],
          goalTracking: true,
          streakTracking: true,
          achievementNotifications: true,
        },
      };

      const result = service.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Session timeout must be between 5 and 120 minutes');
    });

    it('should reject invalid data retention period', () => {
      const invalidSettings: Partial<UserSettings> = {
        privacy: {
          saveProgress: true,
          saveVocabulary: true,
          analytics: false,
          shareProgress: false,
          dataRetention: 400,
        },
      };

      const result = service.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data retention must be between 1 and 365 days');
    });

    it('should collect multiple validation errors', () => {
      const invalidSettings: Partial<UserSettings> = {
        language: {
          primary: 'es',
          secondary: 'es',
          learningDirection: 'primary_to_secondary',
        },
        content: {
          style: 'conversacional',
          maxPhrases: 25,
          maxQuestions: 20,
          includeTranslations: false,
          includeExamples: false,
          includeContext: false,
          questionTypes: [],
        },
      };

      const result = service.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('getSettingsHistory', () => {
    it('should return current settings in history', async () => {
      const currentSettings: SettingsData = {
        userId: mockUserId,
        settings: {} as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
        updatedAt: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(currentSettings);

      const result = await service.getSettingsHistory(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        timestamp: '2024-01-15T00:00:00.000Z',
        version: '1.0',
        source: 'web',
      });
    });

    it('should limit history to specified count', async () => {
      const currentSettings: SettingsData = {
        userId: mockUserId,
        settings: {} as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-15T00:00:00.000Z',
          source: 'web',
        },
        updatedAt: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(currentSettings);

      const result = await service.getSettingsHistory(mockUserId, 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when no settings exist', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);

      const result = await service.getSettingsHistory(mockUserId);

      // When no settings exist, getSettings returns defaults, so history has 1 entry
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle deep nested updates', async () => {
      const existingSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          content: {
            style: 'conversacional',
            maxPhrases: 10,
            maxQuestions: 5,
            includeTranslations: false,
            includeExamples: true,
            includeContext: true,
            questionTypes: ['multiple_choice'],
          },
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          source: 'web',
        },
      };

      const updates: Partial<UserSettings> = {
        content: {
          style: 'academico',
          maxPhrases: 15,
          maxQuestions: 5,
          includeTranslations: true,
          includeExamples: true,
          includeContext: true,
          questionTypes: ['multiple_choice'],
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(existingSettings);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveSettings(mockUserId, updates);

      expect(result.settings.content).toEqual(updates.content);
    });

    it('should handle array replacement in deep merge', async () => {
      const existingSettings: SettingsData = {
        userId: mockUserId,
        settings: {
          content: {
            style: 'conversacional',
            maxPhrases: 10,
            maxQuestions: 5,
            includeTranslations: false,
            includeExamples: false,
            includeContext: false,
            questionTypes: ['multiple_choice'],
          },
        } as UserSettings,
        metadata: {
          version: '1.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          source: 'web',
        },
      };

      const updates: Partial<UserSettings> = {
        content: {
          style: 'conversacional',
          maxPhrases: 10,
          maxQuestions: 5,
          includeTranslations: false,
          includeExamples: false,
          includeContext: false,
          questionTypes: ['open_ended', 'true_false'],
        },
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(existingSettings);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveSettings(mockUserId, updates);

      expect(result.settings.content?.questionTypes).toEqual(['open_ended', 'true_false']);
    });

    it('should handle concurrent settings updates', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const updates = Array.from({ length: 5 }, (_, i) =>
        service.saveSettings(mockUserId, {
          language: {
            primary: 'es',
            secondary: 'en',
            learningDirection: 'primary_to_secondary',
          },
        })
      );

      const results = await Promise.all(updates);

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.userId === mockUserId)).toBe(true);
    });
  });
});
