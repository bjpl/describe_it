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
 */
const KEY_PATTERNS: Record<ServiceType, RegExp> = {
  openai: /^sk-[a-zA-Z0-9]{20,}$/,
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
   * Initialize keys from all sources
   */
  private initializeKeys(): void {
    try {
      // Try to get settings with timeout to prevent blocking
      const settings = this.getSettingsWithTimeout();
      this.cachedKeys = {
        openai: this.resolveKey('openai', settings?.apiKeys?.openai || ''),
        unsplash: this.resolveKey('unsplash', settings?.apiKeys?.unsplash || ''),
      };
    } catch (error) {
      console.warn('[ApiKeyProvider] Failed to initialize from settings, using environment only:', error);
      this.cachedKeys = {
        openai: this.getEnvironmentKey('openai'),
        unsplash: this.getEnvironmentKey('unsplash'),
      };
    }
  }

  /**
   * Get settings with timeout to prevent blocking
   */
  private getSettingsWithTimeout(timeoutMs = 50): any {
    try {
      // Quick synchronous check - if settingsManager is not ready, return null
      if (typeof window === 'undefined' || !settingsManager) {
        return null;
      }
      return settingsManager.getSettings();
    } catch (error) {
      console.warn('[ApiKeyProvider] Settings not available:', error);
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
   * Get API key from environment variables
   */
  private getEnvironmentKey(service: ServiceType): string {
    if (typeof process === 'undefined' || !process.env) {
      return '';
    }

    const envKeys = ENV_KEY_MAP[service];
    for (const envKey of envKeys) {
      const value = process.env[envKey];
      if (value && value.trim()) {
        return value.trim();
      }
    }
    
    return '';
  }

  /**
   * Validate API key format
   */
  public validateKey(service: ServiceType, key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    if (!KEY_PATTERNS[service]) {
      throw new Error(`Unknown service type: ${service}`);
    }

    const pattern = KEY_PATTERNS[service];
    
    // Basic format validation
    if (!pattern.test(key)) {
      return false;
    }

    // Check for placeholder keys
    const placeholders = [
      'example', 'placeholder', 'demo', 'test', 'your-key-here',
      'sk-your-openai-api-key-here', 'sk-example', 'sk-demo'
    ];

    const lowerKey = key.toLowerCase();
    if (placeholders.some(placeholder => lowerKey.includes(placeholder))) {
      return false;
    }

    // Additional security checks
    if (/[<>"'`\\]/.test(key)) {
      return false;
    }

    return true;
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
   * Get complete configuration for a service
   */
  public getServiceConfig(service: ServiceType): ApiKeyConfig {
    const apiKey = this.getKey(service);
    const isValid = this.validateKey(service, apiKey);
    const source = this.getKeySource(service);
    const isDemo = !isValid || !apiKey;

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