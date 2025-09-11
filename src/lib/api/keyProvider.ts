import { settingsManager } from '../settings/settingsManager';

/**
 * Supported API service types
 */
export type ServiceType = 'openai' | 'unsplash';

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
 */
const ENV_KEY_MAP: Record<ServiceType, string[]> = {
  openai: ['OPENAI_API_KEY'],
  unsplash: ['NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 'UNSPLASH_ACCESS_KEY'],
};

/**
 * API Key validation patterns
 * Updated to support modern OpenAI key formats (sk- and sk-proj-)
 */
const KEY_PATTERNS: Record<ServiceType, RegExp> = {
  openai: /^sk-([a-zA-Z0-9]{48,}|proj-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,})$/,
  unsplash: /^[a-zA-Z0-9_-]{20,}$/,
};

/**
 * Centralized API Key Provider with priority system
 * Priority: Settings > Environment Variables > Demo Mode
 */
export class ApiKeyProvider {
  private listeners: KeyUpdateListener[] = [];
  private cachedKeys: Record<ServiceType, string> = {
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
    console.log('[ApiKeyProvider] Initializing API keys from all sources...');
    
    let settings = null;
    try {
      // Try to get settings with timeout to prevent blocking
      settings = this.getSettingsWithTimeout();
    } catch (error) {
      console.warn('[ApiKeyProvider] Failed to get settings during initialization:', error);
    }

    try {
      this.cachedKeys = {
        openai: this.resolveKey('openai', settings?.apiKeys?.openai || ''),
        unsplash: this.resolveKey('unsplash', settings?.apiKeys?.unsplash || ''),
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ApiKeyProvider] Keys initialized successfully:', {
          openai: {
            hasKey: !!this.cachedKeys.openai,
            keyLength: this.cachedKeys.openai?.length || 0,
            source: this.getKeySource('openai')
          },
          unsplash: {
            hasKey: !!this.cachedKeys.unsplash,
            keyLength: this.cachedKeys.unsplash?.length || 0,
            source: this.getKeySource('unsplash')
          }
        });
      }
    } catch (error) {
      console.error('[ApiKeyProvider] Critical error during key initialization:', error);
      // Fallback to environment-only keys
      try {
        this.cachedKeys = {
          openai: this.getEnvironmentKey('openai'),
          unsplash: this.getEnvironmentKey('unsplash'),
        };
        console.log('[ApiKeyProvider] Fallback to environment-only keys completed');
      } catch (fallbackError) {
        console.error('[ApiKeyProvider] Fallback initialization also failed:', fallbackError);
        // Ultimate fallback to empty keys
        this.cachedKeys = {
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
    try {
      // Server-side check
      if (typeof window === 'undefined') {
        console.log('[ApiKeyProvider] Skipping settings retrieval on server-side');
        return null;
      }
      
      // Check if settingsManager is available
      if (!settingsManager) {
        console.log('[ApiKeyProvider] SettingsManager not available, checking localStorage backup');
        return this.getLocalStorageBackup();
      }
      
      let settings = null;
      try {
        settings = settingsManager.getSettings();
      } catch (settingsError) {
        console.warn('[ApiKeyProvider] Failed to get settings from settingsManager:', settingsError);
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
      console.warn('[ApiKeyProvider] Error getting settings with timeout:', error);
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
      
      const backupKeys = JSON.parse(apiKeysBackup);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ApiKeyProvider] Retrieved keys from localStorage backup:', {
          hasOpenAI: !!backupKeys.openai,
          hasUnsplash: !!backupKeys.unsplash,
          openaiKeyLength: backupKeys.openai?.length || 0
        });
      }
      
      return { apiKeys: backupKeys };
    } catch (error) {
      console.warn('[ApiKeyProvider] Failed to parse localStorage backup:', error);
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
        console.log('[ApiKeyProvider] Skipping settings listener setup in server environment');
        return;
      }
      
      settingsManager.addListener((settings) => {
        const newKeys = {
          openai: this.resolveKey('openai', settings?.apiKeys?.openai || ''),
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
      console.warn('[ApiKeyProvider] Failed to setup settings listener:', error);
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
      console.log('[ApiKeyProvider] Environment variables not available (client-side or unsupported runtime)');
      return '';
    }

    const envKeys = ENV_KEY_MAP[service];
    if (!envKeys || envKeys.length === 0) {
      console.warn(`[ApiKeyProvider] No environment key mapping found for service: ${service}`);
      return '';
    }

    for (const envKey of envKeys) {
      try {
        const value = process.env[envKey];
        if (value && typeof value === 'string' && value.trim()) {
          const trimmedValue = value.trim();
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[ApiKeyProvider] Found environment key for ${service}:`, {
              envKey,
              keyLength: trimmedValue.length,
              keyPrefix: 'sk-***' // Never log actual key prefix
            });
          }
          return trimmedValue;
        }
      } catch (error) {
        console.warn(`[ApiKeyProvider] Error reading environment variable ${envKey}:`, error);
      }
    }
    
    console.log(`[ApiKeyProvider] No valid environment keys found for ${service}`, {
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
      console.warn(`[ApiKeyProvider] Key validation failed for ${service}: missing or invalid type`, {
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
        console.warn(`[ApiKeyProvider] Key validation failed for ${service}: pattern mismatch`, {
          keyLength: key.length,
          keyPrefix: 'sk-***' // Never log actual key prefix
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
      console.warn(`[ApiKeyProvider] Key validation failed for ${service}: placeholder detected`);
      return false;
    }

    // Additional security checks
    if (/[<>"'`\\]/.test(key)) {
      console.warn(`[ApiKeyProvider] Key validation failed for ${service}: suspicious characters`);
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
        console.warn('[ApiKeyProvider] OpenAI key validation failed: invalid type', {
          hasKey: !!key,
          type: typeof key
        });
        return false;
      }

      const trimmedKey = key.trim();
      if (!trimmedKey) {
        console.warn('[ApiKeyProvider] OpenAI key validation failed: empty after trim');
        return false;
      }

      // Check if key starts with correct prefix
      if (!trimmedKey.startsWith('sk-')) {
        console.warn('[ApiKeyProvider] OpenAI key validation failed: invalid prefix', {
          actualPrefix: trimmedKey.substring(0, 5),
          expectedPrefix: 'sk-',
          keyLength: trimmedKey.length
        });
        return false;
      }

      // Modern OpenAI keys can be VERY long (150-200+ characters)
      // We only check for minimum reasonable length
      const minLength = 20;
      
      if (trimmedKey.length < minLength) {
        console.warn('[ApiKeyProvider] OpenAI key validation failed: too short', {
          keyLength: trimmedKey.length,
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
          console.warn('[ApiKeyProvider] OpenAI key validation failed: placeholder detected', {
            foundPlaceholder,
            keyPrefix: 'sk-***' // Never log actual key prefix
          });
        }
        return false;
      }

      // Additional character validation for security
      const suspiciousChars = /[<>"'`\\]/;
      if (suspiciousChars.test(trimmedKey)) {
        console.warn('[ApiKeyProvider] OpenAI key validation failed: suspicious characters detected');
        return false;
      }

      // Determine key type
      const keyType = trimmedKey.startsWith('sk-proj-') ? 'project' : 'standard';
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ApiKeyProvider] OpenAI key validation passed', {
          keyType,
          keyLength: trimmedKey.length,
          keyPrefix: keyType === 'project' ? 'sk-proj-***' : 'sk-***', // Never log actual key prefix
          isModernKey: trimmedKey.length > 51
        });
      }

      return true;
    } catch (error) {
      console.error('[ApiKeyProvider] Error during OpenAI key validation:', error);
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
    let apiKey = '';
    let isValid = false;
    let source: KeySource = 'none';
    
    try {
      apiKey = this.getKey(service);
      source = this.getKeySource(service);
      
      if (apiKey) {
        try {
          isValid = this.validateKey(service, apiKey);
        } catch (validationError) {
          console.error(`[ApiKeyProvider] Key validation error for ${service}:`, validationError);
          isValid = false;
        }
      }
    } catch (configError) {
      console.error(`[ApiKeyProvider] Error getting service config for ${service}:`, configError);
    }
    
    const isDemo = !isValid || !apiKey;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ApiKeyProvider] Service config for ${service}:`, {
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        isValid,
        source,
        isDemo,
        keyPrefix: apiKey ? (apiKey.startsWith('sk-proj-') ? 'sk-proj-***' : 'sk-***') : 'none', // Never log actual key
        keyType: service === 'openai' && apiKey ? 
          (apiKey.startsWith('sk-proj-') ? 'project' : 
           apiKey.startsWith('sk-') ? 'standard' : 'unknown') : 'n/a'
      });
    }

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
      const settingsKey = service === 'openai' 
        ? settings?.apiKeys?.openai 
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
        console.error('[ApiKeyProvider] Listener error:', error);
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
      openai: this.validateKey('openai', this.cachedKeys.openai),
      unsplash: this.validateKey('unsplash', this.cachedKeys.unsplash),
    };
  }
}

// Export singleton instance
export const apiKeyProvider = new ApiKeyProvider();