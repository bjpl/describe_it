import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { descriptionCache } from '@/lib/cache/tiered-cache';

// Input validation schemas
const userSettingsSchema = z.object({
  userId: z.string().optional().default('anonymous'),
  settings: z.object({
    // Learning preferences
    language: z.object({
      primary: z.string().min(2).max(10).default('es'),
      secondary: z.string().min(2).max(10).default('en'),
      learningDirection: z.enum(['primary_to_secondary', 'secondary_to_primary', 'bidirectional']).default('primary_to_secondary')
    }).optional(),
    
    // Difficulty and content preferences
    difficulty: z.object({
      preferred: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
      adaptive: z.boolean().default(true),
      autoAdjust: z.boolean().default(false)
    }).optional(),
    
    // Content generation preferences
    content: z.object({
      style: z.enum(['narrativo', 'poetico', 'academico', 'conversacional', 'infantil']).default('conversacional'),
      maxPhrases: z.number().int().min(1).max(20).default(10),
      maxQuestions: z.number().int().min(1).max(15).default(5),
      includeTranslations: z.boolean().default(false),
      includeExamples: z.boolean().default(true),
      includeContext: z.boolean().default(true),
      questionTypes: z.array(z.enum(['multiple_choice', 'open_ended', 'true_false', 'fill_blank', 'comprehension'])).default(['multiple_choice', 'open_ended'])
    }).optional(),
    
    // UI/UX preferences
    interface: z.object({
      theme: z.enum(['light', 'dark', 'system']).default('system'),
      fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
      animations: z.boolean().default(true),
      soundEffects: z.boolean().default(false),
      compactMode: z.boolean().default(false),
      showProgress: z.boolean().default(true)
    }).optional(),
    
    // Learning session preferences
    session: z.object({
      autoSave: z.boolean().default(true),
      sessionTimeout: z.number().int().min(5).max(120).default(30), // minutes
      reminderIntervals: z.array(z.number()).default([1, 7, 30]), // days
      goalTracking: z.boolean().default(true),
      streakTracking: z.boolean().default(true),
      achievementNotifications: z.boolean().default(true)
    }).optional(),
    
    // Privacy and data preferences
    privacy: z.object({
      saveProgress: z.boolean().default(true),
      saveVocabulary: z.boolean().default(true),
      analytics: z.boolean().default(false),
      shareProgress: z.boolean().default(false),
      dataRetention: z.number().int().min(1).max(365).default(90) // days
    }).optional(),
    
    // Export and integration preferences
    export: z.object({
      defaultFormat: z.enum(['json', 'csv', 'txt', 'pdf', 'anki', 'quizlet']).default('json'),
      includeMetadata: z.boolean().default(false),
      includeProgress: z.boolean().default(false),
      autoExportInterval: z.enum(['never', 'daily', 'weekly', 'monthly']).default('never')
    }).optional(),
    
    // Advanced preferences
    advanced: z.object({
      cacheEnabled: z.boolean().default(true),
      preloadContent: z.boolean().default(true),
      debugMode: z.boolean().default(false),
      experimentalFeatures: z.boolean().default(false),
      apiTimeout: z.number().int().min(5).max(60).default(30), // seconds
      maxRetries: z.number().int().min(0).max(5).default(3)
    }).optional()
  }),
  metadata: z.object({
    version: z.string().optional().default('1.0'),
    source: z.string().optional().default('web'),
    timestamp: z.string().optional(),
    migrated: z.boolean().optional().default(false)
  }).optional()
});

const settingsQuerySchema = z.object({
  userId: z.string().optional().default('anonymous'),
  section: z.enum(['language', 'difficulty', 'content', 'interface', 'session', 'privacy', 'export', 'advanced']).optional(),
  includeDefaults: z.boolean().optional().default(true)
});

export const runtime = 'nodejs';

// Settings service
class SettingsService {
  private cachePrefix = 'settings';
  private userPrefix = (userId: string) => `${this.cachePrefix}:user:${userId}`;

  // Default settings structure
  private defaultSettings = {
    language: {
      primary: 'es',
      secondary: 'en',
      learningDirection: 'primary_to_secondary'
    },
    difficulty: {
      preferred: 'intermediate',
      adaptive: true,
      autoAdjust: false
    },
    content: {
      style: 'conversacional',
      maxPhrases: 10,
      maxQuestions: 5,
      includeTranslations: false,
      includeExamples: true,
      includeContext: true,
      questionTypes: ['multiple_choice', 'open_ended']
    },
    interface: {
      theme: 'system',
      fontSize: 'medium',
      animations: true,
      soundEffects: false,
      compactMode: false,
      showProgress: true
    },
    session: {
      autoSave: true,
      sessionTimeout: 30,
      reminderIntervals: [1, 7, 30],
      goalTracking: true,
      streakTracking: true,
      achievementNotifications: true
    },
    privacy: {
      saveProgress: true,
      saveVocabulary: true,
      analytics: false,
      shareProgress: false,
      dataRetention: 90
    },
    export: {
      defaultFormat: 'json',
      includeMetadata: false,
      includeProgress: false,
      autoExportInterval: 'never'
    },
    advanced: {
      cacheEnabled: true,
      preloadContent: true,
      debugMode: false,
      experimentalFeatures: false,
      apiTimeout: 30,
      maxRetries: 3
    }
  };

  async saveSettings(userId: string, settings: any, metadata?: any) {
    const timestamp = new Date().toISOString();
    
    // Get existing settings to merge
    const existingSettings = await this.getSettings(userId) || {};
    
    // Deep merge settings
    const mergedSettings = this.deepMerge(existingSettings.settings || this.defaultSettings, settings);
    
    const settingsData = {
      userId,
      settings: mergedSettings,
      metadata: {
        ...metadata,
        version: '1.0',
        timestamp,
        lastUpdated: timestamp,
        source: metadata?.source || 'web'
      },
      createdAt: existingSettings.createdAt || timestamp,
      updatedAt: timestamp
    };

    // Save settings
    const settingsKey = `${this.userPrefix(userId)}:config`;
    await descriptionsCache.set(settingsKey, settingsData, {
      kvTTL: 86400 * 365, // 1 year
      memoryTTL: 7200,    // 2 hours
      sessionTTL: 3600    // 1 hour
    });

    // Save settings backup (for recovery)
    const backupKey = `${this.userPrefix(userId)}:backup:${Date.now()}`;
    await descriptionsCache.set(backupKey, settingsData, {
      kvTTL: 86400 * 30,  // 30 days
      memoryTTL: 0,       // Don't cache in memory
      sessionTTL: 0       // Don't cache in session
    });

    // Update user profile with settings summary
    await this.updateUserProfile(userId, mergedSettings, timestamp);

    return settingsData;
  }

  async getSettings(userId: string, section?: string, includeDefaults: boolean = true) {
    const settingsKey = `${this.userPrefix(userId)}:config`;
    
    try {
      const settings = await descriptionsCache.get(settingsKey);
      
      if (!settings) {
        if (includeDefaults) {
          return {
            userId,
            settings: this.defaultSettings,
            metadata: {
              version: '1.0',
              timestamp: new Date().toISOString(),
              source: 'defaults',
              isDefault: true
            }
          };
        }
        return null;
      }

      // Merge with defaults to ensure all properties exist
      if (includeDefaults) {
        settings.settings = this.deepMerge(this.defaultSettings, settings.settings || {});
      }

      // Return specific section if requested
      if (section && settings.settings[section]) {
        return {
          ...settings,
          settings: { [section]: settings.settings[section] }
        };
      }

      return settings;
      
    } catch (error) {
      console.warn('Failed to get settings:', error);
      
      if (includeDefaults) {
        return {
          userId,
          settings: this.defaultSettings,
          metadata: {
            version: '1.0',
            timestamp: new Date().toISOString(),
            source: 'defaults_fallback',
            isDefault: true,
            error: error.message
          }
        };
      }
      
      return null;
    }
  }

  async updateUserProfile(userId: string, settings: any, timestamp: string) {
    const profileKey = `profile:user:${userId}:settings_summary`;
    
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
          analytics: settings.privacy?.analytics || false
        }
      };

      await descriptionsCache.set(profileKey, summary, {
        kvTTL: 86400 * 365, // 1 year
        memoryTTL: 7200,    // 2 hours
        sessionTTL: 3600    // 1 hour
      });
      
    } catch (error) {
      console.warn('Failed to update user profile:', error);
    }
  }

  async resetSettings(userId: string, sections?: string[]) {
    const timestamp = new Date().toISOString();
    
    if (sections && sections.length > 0) {
      // Reset specific sections
      const currentSettings = await this.getSettings(userId, undefined, false);
      if (currentSettings) {
        const resetSettings = { ...currentSettings.settings };
        sections.forEach(section => {
          if (this.defaultSettings[section as keyof typeof this.defaultSettings]) {
            resetSettings[section as keyof typeof resetSettings] = this.defaultSettings[section as keyof typeof this.defaultSettings];
          }
        });
        return await this.saveSettings(userId, resetSettings, { source: 'reset_partial', timestamp });
      }
    }
    
    // Reset all settings to defaults
    return await this.saveSettings(userId, this.defaultSettings, { source: 'reset_all', timestamp });
  }

  async getSettingsHistory(userId: string, limit: number = 10) {
    // Get backup entries
    const pattern = `${this.userPrefix(userId)}:backup:*`;
    const backups: any[] = [];
    
    // This would typically use a pattern scan in a real cache implementation
    // For now, we'll return the current settings as history
    const current = await this.getSettings(userId);
    if (current) {
      backups.push({
        timestamp: current.updatedAt || current.metadata?.timestamp,
        settings: current.settings,
        version: current.metadata?.version,
        source: current.metadata?.source
      });
    }
    
    return backups.slice(0, limit);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  validateSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Language validation
    if (settings.language) {
      if (settings.language.primary === settings.language.secondary) {
        errors.push('Primary and secondary languages cannot be the same');
      }
    }

    // Content validation
    if (settings.content) {
      if (settings.content.maxPhrases > 20) {
        errors.push('Maximum phrases cannot exceed 20');
      }
      if (settings.content.maxQuestions > 15) {
        errors.push('Maximum questions cannot exceed 15');
      }
    }

    // Session validation
    if (settings.session) {
      if (settings.session.sessionTimeout < 5 || settings.session.sessionTimeout > 120) {
        errors.push('Session timeout must be between 5 and 120 minutes');
      }
    }

    // Privacy validation
    if (settings.privacy) {
      if (settings.privacy.dataRetention < 1 || settings.privacy.dataRetention > 365) {
        errors.push('Data retention must be between 1 and 365 days');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

const settingsService = new SettingsService();

// POST endpoint - Save settings
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    const { userId, settings, metadata } = userSettingsSchema.parse(body);
    
    // Validate settings
    const validation = settingsService.validateSettings(settings);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid settings', 
          details: validation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    const result = await settingsService.saveSettings(userId, settings, metadata);
    
    const responseTime = performance.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        userId,
        sectionsUpdated: Object.keys(settings),
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, {
      status: 200,
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'X-Settings-Version': result.metadata.version
      }
    });
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { 
          status: 400,
          headers: {
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }
    
    console.error('Settings save error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save settings',
        message: 'An error occurred while saving your settings. Please try again.',
        timestamp: new Date().toISOString(),
        retry: true
      },
      { 
        status: 500,
        headers: {
          'Retry-After': '30',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  }
}

// GET endpoint - Retrieve settings
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const { userId, section, includeDefaults } = settingsQuerySchema.parse({
      userId: searchParams.get('userId') || undefined,
      section: searchParams.get('section') || undefined,
      includeDefaults: searchParams.get('includeDefaults') !== 'false'
    });
    
    const settings = await settingsService.getSettings(userId, section, includeDefaults);
    
    const responseTime = performance.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: settings,
      metadata: {
        userId,
        section: section || 'all',
        includeDefaults,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'private, max-age=3600',
        'X-Settings-Source': settings?.metadata?.source || 'unknown'
      }
    });
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { 
          status: 400,
          headers: {
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }
    
    console.error('Settings retrieval error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve settings',
        message: 'An error occurred while retrieving your settings. Please try again.',
        timestamp: new Date().toISOString(),
        retry: true
      },
      { 
        status: 500,
        headers: {
          'Retry-After': '30',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  }
}

// DELETE endpoint - Reset settings
export async function DELETE(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const sections = searchParams.getAll('section');
    
    const result = await settingsService.resetSettings(userId, sections.length > 0 ? sections : undefined);
    
    const responseTime = performance.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        userId,
        sectionsReset: sections.length > 0 ? sections : 'all',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'X-Response-Time': `${responseTime}ms`
      }
    });
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    console.error('Settings reset error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to reset settings',
        message: 'An error occurred while resetting your settings. Please try again.',
        timestamp: new Date().toISOString(),
        retry: true
      },
      { 
        status: 500,
        headers: {
          'Retry-After': '30',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  }
}