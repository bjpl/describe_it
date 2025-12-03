import { settingsManager } from '../settings/settingsManager';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { securityLogger, createLogger } from "@/lib/logger";

const keyProviderLogger = createLogger('KeyProvider');

/**
 * Supported API service types
 * MIGRATED: Added 'anthropic' as primary AI provider
 */
export type ServiceType = 'anthropic' | 'openai' | 'unsplash';

/**
 * Key source information
 */
export type KeySource = 'settings' | 'environment' | 'none';

/**
 * Configuration object for API services
 */
export interface ApiKeyConfig {
  apiKey: string;
  isValid: boolean;
  source: KeySource;
  isDemo: boolean;
}

/**
 * Listener function for key updates
 */
export type KeyUpdateListener = (keys: Record<ServiceType, string>) => void;

/**
 * Environment variable mapping for API keys
 * MIGRATED: Added Anthropic as primary, OpenAI as fallback
 */
const ENV_KEY_MAP: Record<ServiceType, string[]> = {
  anthropic: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'], // Fallback to OpenAI if Anthropic not set
  openai: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'], // Fallback to Anthropic (preferred)
  unsplash: ['NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 'UNSPLASH_ACCESS_KEY'],
};

/**
 * API Key validation patterns
 * MIGRATED: Added Anthropic key pattern (sk-ant-)
 */
const KEY_PATTERNS: Record<ServiceType, RegExp> = {
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
  openai: /^sk-(proj-)?[a-zA-Z0-9_-]{20,}$/,
  unsplash: /^[a-zA-Z0-9_-]{20,}$/,
};

/**
 * Centralized API Key Provider with priority system
 * Priority: Settings > Environment Variables > Demo Mode
 */
export class ApiKeyProvider {
  private listeners: KeyUpdateListener[] = [];
  private cachedKeys: Record<ServiceType, string> = {
    anthropic: '',
    openai: '',
    unsplash: '',
  };

  constructor() {
    this.initializeKeys();
    this.setupSettingsListener();
  }

  /**
   * Initialize keys from all sources with enhanced error handling
   */
  private initializeKeys(): void {
    keyProviderLogger.debug('Initializing API keys from all sources', {
      step: 'key_init_start',
      environment: typeof window === 'undefined' ? 'server' : 'client'
    });
    
    let settings = null;
    try {
      // Try to get settings with timeout to prevent blocking
      settings = this.getSettingsWithTimeout();
      keyProviderLogger.debug('Settings retrieved during initialization', {
        step: 'settings_retrieved',
        hasSettings: !!settings,
        hasApiKeys: !!settings?.apiKeys,
        hasOpenAIKey: !!settings?.apiKeys?.openai
      });
    } catch (error) {
      keyProviderLogger.warn('Failed to get settings during initialization', error as Record<string, any>);
    }

    try {
      keyProviderLogger.debug('Resolving keys from all sources', {
        step: 'key_resolution_start',
        hasSettingsOpenAIKey: !!settings?.apiKeys?.openai
      });
      
      this.cachedKeys = {
        anthropic: this.resolveKey('anthropic', settings?.apiKeys?.anthropic || settings?.apiKeys?.openai || ''),
        openai: this.resolveKey('openai', settings?.apiKeys?.anthropic || settings?.apiKeys?.openai || ''),
        unsplash: this.resolveKey('unsplash', settings?.apiKeys?.unsplash || ''),
      };
      
      securityLogger.info('Keys initialized successfully', {
        step: 'keys_initialized',
        openai: {
          hasKey: !!this.cachedKeys.openai,
          source: this.getKeySource('openai'),
          isValid: this.validateKey('openai', this.cachedKeys.openai),
          keyType: this.cachedKeys.openai?.startsWith('sk-proj-') ? 'project' : this.cachedKeys.openai?.startsWith('sk-') ? 'standard' : 'unknown'
        },
        unsplash: {
          hasKey: !!this.cachedKeys.unsplash,
          source: this.getKeySource('unsplash')
        }
      });
    } catch (error) {
      keyProviderLogger.error('Critical error during key initialization', error);
      // Fallback to environment-only keys
      try {
        this.cachedKeys = {
          anthropic: this.getEnvironmentKey('anthropic'),
          openai: this.getEnvironmentKey('openai'),
          unsplash: this.getEnvironmentKey('unsplash'),
        };
        keyProviderLogger.info('Fallback to environment-only keys completed');
      } catch (fallbackError) {
        keyProviderLogger.error('Fallback initialization also failed', fallbackError);
        // Ultimate fallback to empty keys
        this.cachedKeys = {
          anthropic: '',
          openai: '',
          unsplash: '',
        };
      }
    }
  }

  /**
   * Get settings with enhanced error handling and backup retrieval
   */
  private getSettingsWithTimeout(timeoutMs = 50): any {
    keyProviderLogger.debug('Getting settings with timeout', {
      step: 'get_settings_start',
      environment: typeof window === 'undefined' ? 'server' : 'client',
      timeoutMs: timeoutMs
    });
    
    try {
      // Server-side check
      if (typeof window === 'undefined') {
        keyProviderLogger.debug('Skipping settings retrieval on server-side', {
          step: 'server_side_skip',
          environment: 'server'
        });
        return null;
      }
      
      // Check if settingsManager is available
      if (!settingsManager) {
        keyProviderLogger.debug('SettingsManager not available, checking localStorage backup');
        return this.getLocalStorageBackup();
      }
      
      let settings = null;
      try {
        settings = settingsManager.getSettings();
      } catch (settingsError) {
        keyProviderLogger.warn('Failed to get settings from settingsManager', settingsError as Record<string, any>);
        return this.getLocalStorageBackup();
      }
      
      // Merge with localStorage backup if available
      const backupSettings = this.getLocalStorageBackup();
      if (backupSettings && backupSettings.apiKeys) {
        if (!settings) {
          settings = backupSettings;
        } else {
          // Merge backup keys for any missing settings
          settings.apiKeys = {
            ...backupSettings.apiKeys,
            ...settings.apiKeys
          };
        }
      }
      
      return settings;
    } catch (error) {
      keyProviderLogger.warn('Error getting settings with timeout', error as Record<string, any>);
      return this.getLocalStorageBackup();
    }
  }

  /**
   * Get API keys from localStorage backup
   */
  private getLocalStorageBackup(): any {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    
    try {
      const apiKeysBackup = sessionStorage.getItem('api-keys-backup');
      if (!apiKeysBackup) {
        return null;
      }
      
      const backupKeys = safeParse(apiKeysBackup);
      if (process.env.NODE_ENV !== 'production') {
        keyProviderLogger.debug('Retrieved keys from localStorage backup', {
          hasOpenAI: !!backupKeys.openai,
          hasUnsplash: !!backupKeys.unsplash
        });
      }
      
      return { apiKeys: backupKeys };
    } catch (error) {
      keyProviderLogger.warn('Failed to parse localStorage backup', error as Record<string, any>);
      return null;
    }
  }

  /**
   * Setup listener for settings changes
   */
  private setupSettingsListener(): void {
    try {
      // Only setup listener in browser environment
      if (typeof window === 'undefined' || !settingsManager) {
        keyProviderLogger.debug('Skipping settings listener setup in server environment');
        return;
      }
      
      settingsManager.addListener((settings) => {
        const newKeys = {
          anthropic: this.resolveKey('anthropic', settings?.apiKeys?.anthropic || settings?.apiKeys?.openai || ''),
          openai: this.resolveKey('openai', settings?.apiKeys?.anthropic || settings?.apiKeys?.openai || ''),
          unsplash: this.resolveKey('unsplash', settings?.apiKeys?.unsplash || ''),
        };

        // Check if keys actually changed
        const hasChanged = Object.keys(newKeys).some(
          (key) => newKeys[key as ServiceType] !== this.cachedKeys[key as ServiceType]
        );

        if (hasChanged) {
          this.cachedKeys = newKeys;
          this.notifyListeners(newKeys);
        }
      });
    } catch (error) {
      keyProviderLogger.warn('Failed to setup settings listener', error as Record<string, any>);
    }
  }

  /**
   * Resolve key with priority system: Settings > Environment > Empty
   */
  private resolveKey(service: ServiceType, settingsKey: string): string {
    // Priority 1: Settings key (if valid and not empty)
    if (settingsKey && settingsKey.trim()) {
      return settingsKey.trim();
    }

    // Priority 2: Environment variables
    return this.getEnvironmentKey(service);
  }

  /**
   * Get API key from environment variables with enhanced error handling
   */
  private getEnvironmentKey(service: ServiceType): string {
    // Check if we're in a server environment
    if (typeof process === 'undefined' || !process.env) {
      keyProviderLogger.debug('Environment variables not available (client-side or unsupported runtime)');
      return '';
    }

    const envKeys = ENV_KEY_MAP[service];
    if (!envKeys || envKeys.length === 0) {
      keyProviderLogger.warn(`No environment key mapping found for service: ${service}`);
      return '';
    }

    for (const envKey of envKeys) {
      try {
        const value = process.env[envKey];
        if (value && typeof value === 'string' && value.trim()) {
          const trimmedValue = value.trim();
          if (process.env.NODE_ENV !== 'production') {
            securityLogger.debug(`Found environment key for ${service}`, {
              envKey,
              hasKey: true
            });
          }
          return trimmedValue;
        }
      } catch (error) {
        keyProviderLogger.warn(`Error reading environment variable ${envKey}`, error as Record<string, any>);
      }
    }
    
    keyProviderLogger.debug(`No valid environment keys found for ${service}`, {
      checkedKeys: envKeys,
      processEnvAvailable: !!process.env
    });
    return '';
  }

  /**
   * Validate API key format
   */
  public validateKey(service: ServiceType, key: string): boolean {
    if (!key || typeof key !== 'string') {
      keyProviderLogger.warn(`Key validation failed for ${service}: missing or invalid type`, {
        hasKey: !!key,
        type: typeof key
      });
      return false;
    }

    if (!KEY_PATTERNS[service]) {
      throw new Error(`Unknown service type: ${service}`);
    }

    // Special validation for OpenAI keys
    if (service === 'openai') {
      return this.validateOpenAIKey(key);
    }

    const pattern = KEY_PATTERNS[service];
    
    // Basic format validation
    if (!pattern.test(key)) {
      if (process.env.NODE_ENV !== 'production') {
        keyProviderLogger.warn(`Key validation failed for ${service}: pattern mismatch`, {
          hasKey: !!key
        });
      }
      return false;
    }

    // Check for placeholder keys
    const placeholders = [
      'example', 'placeholder', 'demo', 'test', 'your-key-here'
    ];

    const lowerKey = key.toLowerCase();
    if (placeholders.some(placeholder => lowerKey.includes(placeholder))) {
      keyProviderLogger.warn(`Key validation failed for ${service}: placeholder detected`);
      return false;
    }

    // Additional security checks
    if (/[<>"'`\\]/.test(key)) {
      securityLogger.warn(`Key validation failed for ${service}: suspicious characters detected`);
      return false;
    }

    return true;
  }

  /**
   * Specialized validation for OpenAI API keys with enhanced error handling
   */
  private validateOpenAIKey(key: string): boolean {
    try {
      // Basic type check
      if (!key || typeof key !== 'string') {
        keyProviderLogger.warn('OpenAI key validation failed: invalid type', {
          hasKey: !!key,
          type: typeof key
        });
        return false;
      }

      const trimmedKey = key.trim();
      if (!trimmedKey) {
        keyProviderLogger.warn('OpenAI key validation failed: empty after trim');
        return false;
      }

      // Check if key starts with correct prefix
      if (!trimmedKey.startsWith('sk-')) {
        keyProviderLogger.warn('OpenAI key validation failed: invalid prefix', {
          expectedPrefix: 'sk-'
        });
        return false;
      }

      // Modern OpenAI keys can be VERY long (150-200+ characters)
      // We only check for minimum reasonable length
      const minLength = 20;
      
      if (trimmedKey.length < minLength) {
        keyProviderLogger.warn('OpenAI key validation failed: too short', {
          expectedMinLength: minLength
        });
        return false;
      }
      
      // Check for placeholder keys specific to OpenAI
      const placeholders = [
        'sk-your-openai-api-key-here',
        'sk-example',
        'sk-placeholder', 
        'sk-demo',
        'sk-test',
        'sk-proj-example',
        'sk-proj-demo',
        'sk-proj-test'
      ];

      const lowerKey = trimmedKey.toLowerCase();
      const foundPlaceholder = placeholders.find(placeholder => 
        lowerKey.includes(placeholder.toLowerCase())
      );
      
      if (foundPlaceholder) {
        if (process.env.NODE_ENV !== 'production') {
          keyProviderLogger.warn('OpenAI key validation failed: placeholder detected', {
            foundPlaceholder
          });
        }
        return false;
      }

      // Additional character validation for security
      const suspiciousChars = /[<>"'`\\]/;
      if (suspiciousChars.test(trimmedKey)) {
        securityLogger.warn('OpenAI key validation failed: suspicious characters detected');
        return false;
      }

      // Determine key type
      const keyType = trimmedKey.startsWith('sk-proj-') ? 'project' : 'standard';
      
      if (process.env.NODE_ENV !== 'production') {
        securityLogger.debug('OpenAI key validation passed', {
          keyType,
          isModernKey: trimmedKey.length > 51
        });
      }

      return true;
    } catch (error) {
      keyProviderLogger.error('Error during OpenAI key validation', error);
      return false;
    }
  }

  /**
   * Get API key for a service
   */
  public getKey(service: ServiceType): string {
    if (!this.cachedKeys.hasOwnProperty(service)) {
      throw new Error(`Unknown service type: ${service}`);
    }

    return this.cachedKeys[service];
  }

  /**
   * Get complete configuration for a service with enhanced validation
   */
  public getServiceConfig(service: ServiceType): ApiKeyConfig {
    keyProviderLogger.debug(`Getting service config for ${service}`, {
      step: 'get_service_config_start',
      service: service,
      cachedKeyExists: !!this.cachedKeys[service]
    });
    
    let apiKey = '';
    let isValid = false;
    let source: KeySource = 'none';
    
    try {
      apiKey = this.getKey(service);
      keyProviderLogger.debug(`Retrieved key for ${service}`, {
        step: 'key_retrieved',
        hasApiKey: !!apiKey,
        keyType: service === 'openai' && apiKey ? 
          (apiKey.startsWith('sk-proj-') ? 'project' : 
           apiKey.startsWith('sk-') ? 'standard' : 'unknown') : 'n/a'
      });
      
      source = this.getKeySource(service);
      keyProviderLogger.debug(`Key source determined for ${service}`, {
        step: 'source_determined',
        source: source
      });
      
      if (apiKey) {
        try {
          isValid = this.validateKey(service, apiKey);
          keyProviderLogger.debug(`Key validation result for ${service}`, {
            step: 'key_validated',
            isValid: isValid
          });
        } catch (validationError) {
          keyProviderLogger.error(`Key validation error for ${service}`, validationError, {
            step: 'validation_error'
          });
          isValid = false;
        }
      } else {
        keyProviderLogger.warn(`No API key available for ${service}`, {
          step: 'no_key_available',
          cachedKeyExists: !!this.cachedKeys[service]
        });
      }
    } catch (configError) {
      keyProviderLogger.error(`Critical error getting service config for ${service}`, configError, {
        step: 'config_error'
      });
    }
    
    const isDemo = !isValid || !apiKey;

    securityLogger.debug(`Final service config for ${service}`, {
      step: 'final_config',
      hasApiKey: !!apiKey,
      isValid: isValid,
      source: source,
      isDemo: isDemo,
      keyType: service === 'openai' && apiKey ? 
        (apiKey.startsWith('sk-proj-') ? 'project' : 
         apiKey.startsWith('sk-') ? 'standard' : 'unknown') : 'n/a',
      environment: typeof window === 'undefined' ? 'server' : 'client'
    });

    return {
      apiKey,
      isValid,
      source,
      isDemo,
    };
  }

  /**
   * Determine the source of a key
   */
  private getKeySource(service: ServiceType): KeySource {
    const key = this.cachedKeys[service];
    
    if (!key) {
      return 'none';
    }

    try {
      const settings = this.getSettingsWithTimeout();
      const settingsKey = service === 'anthropic'
        ? (settings?.apiKeys?.anthropic || settings?.apiKeys?.openai)
        : service === 'openai'
        ? (settings?.apiKeys?.anthropic || settings?.apiKeys?.openai)
        : settings?.apiKeys?.unsplash;

      if (settingsKey && settingsKey.trim() === key) {
        return 'settings';
      }
    } catch (error) {
      // If settings are unavailable, check environment
    }

    const envKey = this.getEnvironmentKey(service);
    if (envKey === key) {
      return 'environment';
    }

    return 'none';
  }

  /**
   * Check if service is in demo mode
   */
  public isInDemoMode(service: ServiceType): boolean {
    const key = this.getKey(service);
    return !this.validateKey(service, key);
  }

  /**
   * Add listener for key updates
   */
  public addListener(listener: KeyUpdateListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of key changes
   */
  private notifyListeners(keys: Record<ServiceType, string>): void {
    this.listeners.forEach(listener => {
      try {
        listener(keys);
      } catch (error) {
        keyProviderLogger.error('Listener error', error);
      }
    });
  }

  /**
   * Force refresh keys from settings
   */
  public refreshKeys(): void {
    this.initializeKeys();
  }

  /**
   * Get all keys at once
   */
  public getAllKeys(): Record<ServiceType, string> {
    return { ...this.cachedKeys };
  }

  /**
   * Get validation status for all services
   */
  public getValidationStatus(): Record<ServiceType, boolean> {
    return {
      anthropic: this.validateKey('anthropic', this.cachedKeys.anthropic),
      openai: this.validateKey('openai', this.cachedKeys.openai),
      unsplash: this.validateKey('unsplash', this.cachedKeys.unsplash),
    };
  }
}

// Export singleton instance
export const apiKeyProvider = new ApiKeyProvider();