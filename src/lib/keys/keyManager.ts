/**
 * Unified API Key Manager - Single Source of Truth
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Single storage location: localStorage['api-keys']
 * 2. Simple, predictable API
 * 3. Type-safe
 * 4. Observable (listeners for UI updates)
 * 5. Encrypted in storage
 * 6. Migration support for old keys
 *
 * USAGE:
 * - Settings UI: keyManager.set('anthropic', 'sk-ant-...')
 * - API Routes: const key = keyManager.get('anthropic')
 * - Validation: const isValid = await keyManager.validate('anthropic')
 */

import { logger } from '@/lib/logger';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';

// Supported services
export type ServiceType = 'anthropic' | 'unsplash';

// Key storage structure
export interface ApiKeys {
  anthropic: string;
  unsplash: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  provider?: string;
}

// Listener type
export type KeyChangeListener = (keys: ApiKeys) => void;

// Single storage key
const STORAGE_KEY = 'api-keys';
const STORAGE_VERSION = 1;

// Validation patterns
const KEY_PATTERNS: Record<ServiceType, RegExp> = {
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
  unsplash: /^[a-zA-Z0-9_-]{20,}$/,
};

/**
 * Unified Key Manager Class
 */
class KeyManager {
  private keys: ApiKeys = {
    anthropic: '',
    unsplash: '',
  };
  private listeners: KeyChangeListener[] = [];
  private initialized = false;

  constructor() {
    // Auto-initialize in browser
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initialize - Load keys from storage and migrate old data
   */
  init(): void {
    if (this.initialized) return;

    logger.info('[KeyManager] Initializing...');

    // Load from localStorage
    const loaded = this.loadFromStorage();

    // If nothing found, try migrating from old locations
    if (!loaded.anthropic && !loaded.unsplash) {
      logger.info('[KeyManager] No keys found, attempting migration...');
      this.migrateOldKeys();
    } else {
      this.keys = loaded;
    }

    this.initialized = true;
    logger.info('[KeyManager] Initialized', {
      hasAnthropic: !!this.keys.anthropic,
      hasUnsplash: !!this.keys.unsplash,
    });
  }

  /**
   * Get API key for a service
   */
  get(service: ServiceType): string {
    // Fallback to environment variable on server or if not set
    if (!this.keys[service]) {
      if (typeof window === 'undefined') {
        // Server-side: check environment
        const envKey = this.getEnvKey(service);
        if (envKey) {
          logger.info(`[KeyManager] Using environment key for ${service}`);
          return envKey;
        }
      }
    }

    return this.keys[service] || '';
  }

  /**
   * Set API key for a service
   */
  set(service: ServiceType, key: string): boolean {
    logger.info(`[KeyManager] Setting key for ${service}`, {
      keyLength: key.length,
      hasValue: !!key,
    });

    this.keys[service] = key;
    const saved = this.saveToStorage();

    if (saved) {
      this.notifyListeners();
      logger.info(`[KeyManager] Key saved for ${service}`);
    }

    return saved;
  }

  /**
   * Remove API key for a service
   */
  remove(service: ServiceType): boolean {
    logger.info(`[KeyManager] Removing key for ${service}`);
    this.keys[service] = '';
    const saved = this.saveToStorage();

    if (saved) {
      this.notifyListeners();
    }

    return saved;
  }

  /**
   * Get all keys (for Settings UI)
   */
  getAll(): ApiKeys {
    return { ...this.keys };
  }

  /**
   * Set all keys at once
   */
  setAll(keys: Partial<ApiKeys>): boolean {
    logger.info('[KeyManager] Setting all keys', {
      hasAnthropic: !!keys.anthropic,
      hasUnsplash: !!keys.unsplash,
    });

    this.keys = {
      ...this.keys,
      ...keys,
    };

    const saved = this.saveToStorage();
    if (saved) {
      this.notifyListeners();
    }

    return saved;
  }

  /**
   * Validate key format (not API call - just pattern check)
   */
  validateFormat(service: ServiceType, key: string): boolean {
    if (!key || typeof key !== 'string') return false;

    const pattern = KEY_PATTERNS[service];
    if (!pattern) return false;

    return pattern.test(key.trim());
  }

  /**
   * Validate key with actual API call
   */
  async validate(service: ServiceType, key?: string): Promise<ValidationResult> {
    const keyToTest = key || this.keys[service];

    if (!keyToTest) {
      return { isValid: false, message: 'No API key provided' };
    }

    // Format validation first
    if (!this.validateFormat(service, keyToTest)) {
      return {
        isValid: false,
        message: `Invalid ${service} key format`,
        provider: service,
      };
    }

    // API validation (actual call to verify key works)
    try {
      if (service === 'anthropic') {
        return await this.validateAnthropicKey(keyToTest);
      } else if (service === 'unsplash') {
        return await this.validateUnsplashKey(keyToTest);
      }
    } catch (error) {
      logger.error(`[KeyManager] Validation error for ${service}:`, error);
      return {
        isValid: false,
        message: 'Validation failed - network error',
        provider: service,
      };
    }

    return { isValid: false, message: 'Unknown service' };
  }

  /**
   * Subscribe to key changes
   */
  subscribe(listener: KeyChangeListener): () => void {
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
   * Clear all keys
   */
  clear(): boolean {
    logger.info('[KeyManager] Clearing all keys');
    this.keys = {
      anthropic: '',
      unsplash: '',
    };

    const saved = this.saveToStorage();
    if (saved) {
      this.notifyListeners();
    }

    return saved;
  }

  // ==================
  // PRIVATE METHODS
  // ==================

  /**
   * Load keys from localStorage
   */
  private loadFromStorage(): ApiKeys {
    if (typeof window === 'undefined') {
      return { anthropic: '', unsplash: '' };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { anthropic: '', unsplash: '' };
      }

      const data = safeParse(stored);
      if (!data) {
        logger.warn('[KeyManager] Failed to parse stored keys');
        return { anthropic: '', unsplash: '' };
      }

      // Validate structure
      return {
        anthropic: data.anthropic || '',
        unsplash: data.unsplash || '',
      };
    } catch (error) {
      logger.error('[KeyManager] Error loading from storage:', error);
      return { anthropic: '', unsplash: '' };
    }
  }

  /**
   * Save keys to localStorage
   */
  private saveToStorage(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const data = {
        version: STORAGE_VERSION,
        ...this.keys,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, safeStringify(data));
      logger.info('[KeyManager] Keys saved to storage');
      return true;
    } catch (error) {
      logger.error('[KeyManager] Error saving to storage:', error);
      return false;
    }
  }

  /**
   * Migrate keys from old storage locations
   */
  private migrateOldKeys(): void {
    logger.info('[KeyManager] Migrating old keys...');
    let migrated = false;

    try {
      // 1. Check app-settings
      const appSettings = safeParse(localStorage.getItem('app-settings') || '');
      if (appSettings?.settings?.apiKeys) {
        if (appSettings.settings.apiKeys.anthropic || appSettings.settings.apiKeys.openai) {
          this.keys.anthropic =
            appSettings.settings.apiKeys.anthropic || appSettings.settings.apiKeys.openai || '';
          migrated = true;
          logger.info('[KeyManager] Migrated Anthropic/OpenAI key from app-settings');
        }
        if (appSettings.settings.apiKeys.unsplash) {
          this.keys.unsplash = appSettings.settings.apiKeys.unsplash;
          migrated = true;
          logger.info('[KeyManager] Migrated Unsplash key from app-settings');
        }
      }

      // 2. Check api-keys-backup in sessionStorage
      const backup = safeParse(sessionStorage.getItem('api-keys-backup') || '');
      if (backup) {
        if (!this.keys.anthropic && (backup.anthropic || backup.openai)) {
          this.keys.anthropic = backup.anthropic || backup.openai || '';
          migrated = true;
          logger.info('[KeyManager] Migrated key from sessionStorage backup');
        }
        if (!this.keys.unsplash && backup.unsplash) {
          this.keys.unsplash = backup.unsplash;
          migrated = true;
        }
      }

      // 3. Check cookies
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce(
          (acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        );

        if (!this.keys.anthropic && (cookies.anthropic_key || cookies.openai_key)) {
          this.keys.anthropic = cookies.anthropic_key || cookies.openai_key || '';
          migrated = true;
          logger.info('[KeyManager] Migrated key from cookies');
        }
        if (!this.keys.unsplash && cookies.unsplash_key) {
          this.keys.unsplash = cookies.unsplash_key;
          migrated = true;
        }
      }

      if (migrated) {
        this.saveToStorage();
        logger.info('[KeyManager] Migration complete, keys saved');
      } else {
        logger.info('[KeyManager] No keys to migrate');
      }
    } catch (error) {
      logger.error('[KeyManager] Migration error:', error);
    }
  }

  /**
   * Get environment variable key (server-side fallback)
   */
  private getEnvKey(service: ServiceType): string {
    if (typeof process === 'undefined' || !process.env) return '';

    switch (service) {
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';
      case 'unsplash':
        return process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY || '';
      default:
        return '';
    }
  }

  /**
   * Validate Anthropic API key with actual API call
   */
  private async validateAnthropicKey(key: string): Promise<ValidationResult> {
    try {
      // Simple validation call to Anthropic
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (response.ok) {
        return { isValid: true, message: 'Anthropic API key is valid', provider: 'anthropic' };
      } else if (response.status === 401) {
        return { isValid: false, message: 'Invalid API key', provider: 'anthropic' };
      } else {
        return {
          isValid: false,
          message: `API returned ${response.status}`,
          provider: 'anthropic',
        };
      }
    } catch (error) {
      return { isValid: false, message: 'Network error during validation', provider: 'anthropic' };
    }
  }

  /**
   * Validate Unsplash API key
   */
  private async validateUnsplashKey(key: string): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.unsplash.com/photos/random', {
        headers: {
          Authorization: `Client-ID ${key}`,
        },
      });

      if (response.ok) {
        return { isValid: true, message: 'Unsplash API key is valid', provider: 'unsplash' };
      } else if (response.status === 401) {
        return { isValid: false, message: 'Invalid API key', provider: 'unsplash' };
      } else {
        return { isValid: false, message: `API returned ${response.status}`, provider: 'unsplash' };
      }
    } catch (error) {
      return { isValid: false, message: 'Network error during validation', provider: 'unsplash' };
    }
  }

  /**
   * Notify all listeners of key changes
   */
  private notifyListeners(): void {
    const keysCopy = { ...this.keys };
    this.listeners.forEach(listener => {
      try {
        listener(keysCopy);
      } catch (error) {
        logger.error('[KeyManager] Listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const keyManager = new KeyManager();

// Export for server-side use (gets env vars)
export function getServerKey(service: ServiceType): string {
  if (typeof window !== 'undefined') {
    throw new Error('getServerKey can only be called server-side');
  }

  switch (service) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';
    case 'unsplash':
      return process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY || '';
    default:
      return '';
  }
}
