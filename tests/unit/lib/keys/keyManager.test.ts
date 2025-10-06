/**
 * Comprehensive Unit Tests for KeyManager
 *
 * Test Coverage:
 * - Initialization and migration
 * - Key retrieval with priority (env > storage > default)
 * - Key storage and persistence
 * - Validation (format and API)
 * - Environment variable handling
 * - Error states and edge cases
 * - Listener/observer pattern
 * - Type safety
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ServiceType, ApiKeys, ValidationResult } from '@/lib/keys/keyManager';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/utils/json-safe', () => ({
  safeParse: vi.fn((str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }),
  safeStringify: vi.fn((obj: any) => JSON.stringify(obj)),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('KeyManager', () => {
  let keyManager: any;
  let localStorageMock: Record<string, string>;
  let sessionStorageMock: Record<string, string>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    vi.resetModules();

    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as any;

    // Mock sessionStorage
    sessionStorageMock = {};
    global.sessionStorage = {
      getItem: vi.fn((key: string) => sessionStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStorageMock[key];
      }),
      clear: vi.fn(() => {
        sessionStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as any;

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    // Mock window
    global.window = {} as any;

    // Import fresh instance (singleton)
    const module = await import('@/lib/keys/keyManager');
    keyManager = module.keyManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty keys', () => {
      expect(keyManager.getAll()).toEqual({
        anthropic: '',
        unsplash: '',
      });
    });

    it('should auto-initialize in browser environment', async () => {
      const module = await import('@/lib/keys/keyManager');
      expect(module.keyManager.getAll()).toBeDefined();
    });

    it('should load keys from storage on init', async () => {
      const storedKeys = {
        version: 1,
        anthropic: 'sk-ant-test123',
        unsplash: 'unsplash-test-key',
        updatedAt: new Date().toISOString(),
      };

      localStorageMock['api-keys'] = JSON.stringify(storedKeys);

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      const keys = km.getAll();
      expect(keys.anthropic).toBe('sk-ant-test123');
      expect(keys.unsplash).toBe('unsplash-test-key');
    });

    it('should not reinitialize if already initialized', async () => {
      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;

      const getItemSpy = vi.spyOn(global.localStorage, 'getItem');

      km.init(); // This happens in constructor, so we test subsequent calls
      const callsAfterFirst = getItemSpy.mock.calls.length;

      km.init(); // Second call should not load again

      // Should not increase call count
      expect(getItemSpy.mock.calls.length).toBe(callsAfterFirst);
    });

    it('should handle corrupted storage data gracefully', async () => {
      localStorageMock['api-keys'] = 'invalid-json{';

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      expect(km.getAll()).toEqual({
        anthropic: '',
        unsplash: '',
      });
    });
  });

  describe('Migration', () => {
    it('should migrate from app-settings', async () => {
      const appSettings = {
        settings: {
          apiKeys: {
            anthropic: 'sk-ant-migrated',
            unsplash: 'unsplash-migrated',
          },
        },
      };

      localStorageMock['app-settings'] = JSON.stringify(appSettings);

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      const keys = km.getAll();
      expect(keys.anthropic).toBe('sk-ant-migrated');
      expect(keys.unsplash).toBe('unsplash-migrated');
    });

    it('should migrate OpenAI key to Anthropic', async () => {
      const appSettings = {
        settings: {
          apiKeys: {
            openai: 'sk-openai-key',
          },
        },
      };

      localStorageMock['app-settings'] = JSON.stringify(appSettings);

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      expect(km.get('anthropic')).toBe('sk-openai-key');
    });

    it('should migrate from sessionStorage backup', async () => {
      const backup = {
        anthropic: 'sk-ant-session',
        unsplash: 'unsplash-session',
      };

      sessionStorageMock['api-keys-backup'] = JSON.stringify(backup);

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      const keys = km.getAll();
      expect(keys.anthropic).toBe('sk-ant-session');
      expect(keys.unsplash).toBe('unsplash-session');
    });

    it('should migrate from cookies', async () => {
      document.cookie = 'anthropic_key=sk-ant-cookie; unsplash_key=unsplash-cookie';

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      const keys = km.getAll();
      expect(keys.anthropic).toBe('sk-ant-cookie');
      expect(keys.unsplash).toBe('unsplash-cookie');
    });

    it('should prioritize localStorage over sessionStorage', async () => {
      localStorageMock['app-settings'] = JSON.stringify({
        settings: { apiKeys: { anthropic: 'local-key' } },
      });

      sessionStorageMock['api-keys-backup'] = JSON.stringify({
        anthropic: 'session-key',
      });

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      expect(km.get('anthropic')).toBe('local-key');
    });

    it('should save migrated keys to storage', async () => {
      const appSettings = {
        settings: {
          apiKeys: { anthropic: 'sk-ant-migrate' },
        },
      };

      localStorageMock['app-settings'] = JSON.stringify(appSettings);

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      expect(localStorageMock['api-keys']).toBeDefined();
      const saved = JSON.parse(localStorageMock['api-keys']);
      expect(saved.anthropic).toBe('sk-ant-migrate');
    });
  });

  describe('Key Retrieval (get)', () => {
    it('should return stored key', () => {
      keyManager.set('anthropic', 'sk-ant-stored');
      expect(keyManager.get('anthropic')).toBe('sk-ant-stored');
    });

    it('should return empty string if no key set', () => {
      expect(keyManager.get('anthropic')).toBe('');
      expect(keyManager.get('unsplash')).toBe('');
    });

    it('should fallback to environment variable on server', async () => {
      // Mock server environment
      delete (global as any).window;
      process.env.ANTHROPIC_API_KEY = 'sk-ant-env';

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      expect(km.get('anthropic')).toBe('sk-ant-env');

      // Restore
      global.window = {} as any;
    });

    it('should prefer OpenAI env if Anthropic not set', async () => {
      delete (global as any).window;
      process.env.OPENAI_API_KEY = 'sk-openai-env';
      delete process.env.ANTHROPIC_API_KEY;

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      expect(km.get('anthropic')).toBe('sk-openai-env');

      global.window = {} as any;
    });

    it('should get Unsplash key from environment', async () => {
      delete (global as any).window;
      process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY = 'unsplash-env';

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      expect(km.get('unsplash')).toBe('unsplash-env');

      global.window = {} as any;
    });
  });

  describe('Key Storage (set)', () => {
    it('should set and store key successfully', () => {
      const result = keyManager.set('anthropic', 'sk-ant-new');

      expect(result).toBe(true);
      expect(keyManager.get('anthropic')).toBe('sk-ant-new');
      expect(localStorageMock['api-keys']).toBeDefined();
    });

    it('should update existing key', () => {
      keyManager.set('anthropic', 'sk-ant-old');
      keyManager.set('anthropic', 'sk-ant-new');

      expect(keyManager.get('anthropic')).toBe('sk-ant-new');
    });

    it('should persist to localStorage with version', () => {
      keyManager.set('anthropic', 'sk-ant-test');

      const stored = JSON.parse(localStorageMock['api-keys']);
      expect(stored.version).toBe(1);
      expect(stored.anthropic).toBe('sk-ant-test');
      expect(stored.updatedAt).toBeDefined();
    });

    it('should handle storage errors gracefully', () => {
      vi.spyOn(global.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = keyManager.set('anthropic', 'sk-ant-test');
      expect(result).toBe(false);
    });

    it('should return false in server environment', async () => {
      delete (global as any).window;

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      const result = km.set('anthropic', 'sk-ant-test');

      expect(result).toBe(false);

      global.window = {} as any;
    });
  });

  describe('Key Removal', () => {
    it('should remove key successfully', () => {
      keyManager.set('anthropic', 'sk-ant-test');
      const result = keyManager.remove('anthropic');

      expect(result).toBe(true);
      expect(keyManager.get('anthropic')).toBe('');
    });

    it('should persist removal to storage', () => {
      keyManager.set('anthropic', 'sk-ant-test');
      keyManager.remove('anthropic');

      const stored = JSON.parse(localStorageMock['api-keys']);
      expect(stored.anthropic).toBe('');
    });
  });

  describe('Get All Keys', () => {
    it('should return copy of all keys', () => {
      keyManager.set('anthropic', 'sk-ant-test');
      keyManager.set('unsplash', 'unsplash-test');

      const keys = keyManager.getAll();

      expect(keys).toEqual({
        anthropic: 'sk-ant-test',
        unsplash: 'unsplash-test',
      });
    });

    it('should return immutable copy', () => {
      keyManager.set('anthropic', 'sk-ant-test');

      const keys = keyManager.getAll();
      keys.anthropic = 'modified';

      expect(keyManager.get('anthropic')).toBe('sk-ant-test');
    });
  });

  describe('Set All Keys', () => {
    it('should set multiple keys at once', () => {
      const result = keyManager.setAll({
        anthropic: 'sk-ant-batch',
        unsplash: 'unsplash-batch',
      });

      expect(result).toBe(true);
      expect(keyManager.get('anthropic')).toBe('sk-ant-batch');
      expect(keyManager.get('unsplash')).toBe('unsplash-batch');
    });

    it('should merge with existing keys', () => {
      keyManager.set('anthropic', 'sk-ant-existing');

      keyManager.setAll({ unsplash: 'unsplash-new' });

      expect(keyManager.get('anthropic')).toBe('sk-ant-existing');
      expect(keyManager.get('unsplash')).toBe('unsplash-new');
    });

    it('should handle partial updates', () => {
      keyManager.setAll({ anthropic: 'sk-ant-partial' });

      expect(keyManager.get('anthropic')).toBe('sk-ant-partial');
      expect(keyManager.get('unsplash')).toBe('');
    });
  });

  describe('Clear All Keys', () => {
    it('should clear all keys', () => {
      keyManager.set('anthropic', 'sk-ant-test');
      keyManager.set('unsplash', 'unsplash-test');

      const result = keyManager.clear();

      expect(result).toBe(true);
      expect(keyManager.get('anthropic')).toBe('');
      expect(keyManager.get('unsplash')).toBe('');
    });

    it('should persist clear to storage', () => {
      keyManager.set('anthropic', 'sk-ant-test');
      keyManager.clear();

      const stored = JSON.parse(localStorageMock['api-keys']);
      expect(stored.anthropic).toBe('');
      expect(stored.unsplash).toBe('');
    });
  });

  describe('Format Validation', () => {
    describe('Anthropic keys', () => {
      it('should validate correct Anthropic key format', () => {
        const validKeys = [
          'sk-ant-' + 'a'.repeat(20), // Minimum 20 chars after prefix
          'sk-ant-' + 'a'.repeat(50), // Longer key
          'sk-ant-ABC123def456ghi789jklmno',  // Mixed case and numbers
        ];

        validKeys.forEach(key => {
          const result = keyManager.validateFormat('anthropic', key);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid Anthropic key formats', () => {
        const invalidKeys = [
          'sk-ant-short',
          'sk-invalid-format',
          'not-a-key',
          'sk-ant-',
          '',
          'sk-ant-has spaces',
        ];

        invalidKeys.forEach(key => {
          expect(keyManager.validateFormat('anthropic', key)).toBe(false);
        });
      });
    });

    describe('Unsplash keys', () => {
      it('should validate correct Unsplash key format', () => {
        const validKeys = [
          'a'.repeat(20),
          'ABC123def456GHI789jkl',
          'key_with-underscores',
        ];

        validKeys.forEach(key => {
          expect(keyManager.validateFormat('unsplash', key)).toBe(true);
        });
      });

      it('should reject invalid Unsplash key formats', () => {
        const invalidKeys = [
          'short',
          '',
          'has spaces here',
          'has@special',
        ];

        invalidKeys.forEach(key => {
          expect(keyManager.validateFormat('unsplash', key)).toBe(false);
        });
      });
    });

    it('should handle null/undefined gracefully', () => {
      expect(keyManager.validateFormat('anthropic', null as any)).toBe(false);
      expect(keyManager.validateFormat('anthropic', undefined as any)).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      const key = '  sk-ant-' + 'a'.repeat(20) + '  ';
      expect(keyManager.validateFormat('anthropic', key)).toBe(true);
    });
  });

  describe('API Validation', () => {
    describe('Anthropic API validation', () => {
      it('should validate correct Anthropic API key', async () => {
        const validKey = 'sk-ant-validkey123456789012';

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

        const result = await keyManager.validate('anthropic', validKey);

        expect(result.isValid).toBe(true);
        expect(result.message).toBe('Anthropic API key is valid');
        expect(result.provider).toBe('anthropic');
      });

      it('should reject invalid API key (401)', async () => {
        const invalidKey = 'sk-ant-' + 'x'.repeat(30); // Valid format but invalid key

        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await keyManager.validate('anthropic', invalidKey);

        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Invalid API key');
      });

      it('should handle network errors', async () => {
        const key = 'sk-ant-networkfail123456789';

        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const result = await keyManager.validate('anthropic', key);

        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Network error during validation');
      });

      it('should handle other HTTP errors', async () => {
        const key = 'sk-ant-servererror123456789';

        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        const result = await keyManager.validate('anthropic', key);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('500');
      });

      it('should use stored key if none provided', async () => {
        const validKey = 'sk-ant-' + 'x'.repeat(25); // Valid format
        keyManager.set('anthropic', validKey);

        (global.fetch as any).mockResolvedValueOnce({ ok: true });

        const result = await keyManager.validate('anthropic');

        expect(result.isValid).toBe(true);
      });

      it('should make correct API call', async () => {
        const key = 'sk-ant-' + 'y'.repeat(25); // Valid format

        (global.fetch as any).mockResolvedValueOnce({ ok: true });

        await keyManager.validate('anthropic', key);

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.anthropic.com/v1/messages',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
            }),
          })
        );
      });
    });

    describe('Unsplash API validation', () => {
      it('should validate correct Unsplash API key', async () => {
        const validKey = 'unsplash-valid-key-12345';

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

        const result = await keyManager.validate('unsplash', validKey);

        expect(result.isValid).toBe(true);
        expect(result.message).toBe('Unsplash API key is valid');
      });

      it('should reject invalid Unsplash key', async () => {
        const invalidKey = 'unsplash-invalid-key-123';

        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await keyManager.validate('unsplash', invalidKey);

        expect(result.isValid).toBe(false);
      });

      it('should make correct Unsplash API call', async () => {
        const key = 'unsplash-test-key-12345';

        (global.fetch as any).mockResolvedValueOnce({ ok: true });

        await keyManager.validate('unsplash', key);

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.unsplash.com/photos/random',
          expect.objectContaining({
            headers: {
              'Authorization': `Client-ID ${key}`,
            },
          })
        );
      });
    });

    it('should return error if no key provided', async () => {
      const result = await keyManager.validate('anthropic');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('No API key provided');
    });

    it('should fail format validation first', async () => {
      const result = await keyManager.validate('anthropic', 'invalid-format');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Invalid');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Observer Pattern (Listeners)', () => {
    it('should notify listeners on key change', () => {
      const listener = vi.fn();
      keyManager.subscribe(listener);

      keyManager.set('anthropic', 'sk-ant-test');

      expect(listener).toHaveBeenCalledWith({
        anthropic: 'sk-ant-test',
        unsplash: '',
      });
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      keyManager.subscribe(listener1);
      keyManager.subscribe(listener2);

      keyManager.set('anthropic', 'sk-ant-test');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should allow unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = keyManager.subscribe(listener);

      unsubscribe();
      keyManager.set('anthropic', 'sk-ant-test');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on setAll', () => {
      const listener = vi.fn();
      keyManager.subscribe(listener);

      keyManager.setAll({ anthropic: 'sk-ant-all' });

      expect(listener).toHaveBeenCalled();
    });

    it('should notify on remove', () => {
      const listener = vi.fn();
      keyManager.set('anthropic', 'sk-ant-test');

      keyManager.subscribe(listener);
      keyManager.remove('anthropic');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify on clear', () => {
      const listener = vi.fn();
      keyManager.subscribe(listener);

      keyManager.clear();

      expect(listener).toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      keyManager.subscribe(errorListener);
      keyManager.subscribe(goodListener);

      keyManager.set('anthropic', 'sk-ant-test');

      // Should not throw and should call other listeners
      expect(goodListener).toHaveBeenCalled();
    });

    it('should pass immutable key copy to listeners', () => {
      const listener = vi.fn();
      keyManager.subscribe(listener);

      keyManager.set('anthropic', 'sk-ant-test');

      const receivedKeys = listener.mock.calls[0][0];
      receivedKeys.anthropic = 'modified';

      expect(keyManager.get('anthropic')).toBe('sk-ant-test');
    });
  });

  describe('Server-side utilities', () => {
    it('getServerKey should throw in browser', async () => {
      const module = await import('@/lib/keys/keyManager');

      expect(() => module.getServerKey('anthropic')).toThrow(
        'getServerKey can only be called server-side'
      );
    });

    it('getServerKey should return env key on server', async () => {
      delete (global as any).window;
      process.env.ANTHROPIC_API_KEY = 'sk-ant-server';

      // Re-import to get fresh module
      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');

      const key = module.getServerKey('anthropic');
      expect(key).toBe('sk-ant-server');

      global.window = {} as any;
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long keys', () => {
      const longKey = 'sk-ant-' + 'a'.repeat(1000);

      const result = keyManager.set('anthropic', longKey);
      expect(result).toBe(true);
      expect(keyManager.get('anthropic')).toBe(longKey);
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'sk-ant-ABC_123-def_456-GHI_789'; // Valid: 28 chars after prefix

      const isValid = keyManager.validateFormat('anthropic', specialKey);
      expect(isValid).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        keyManager.set('anthropic', 'sk-ant-1'),
        keyManager.set('unsplash', 'unsplash-1'),
        keyManager.get('anthropic'),
        keyManager.getAll(),
      ];

      await Promise.all(promises);

      // Should complete without errors
      expect(keyManager.getAll()).toBeDefined();
    });

    it('should handle rapid listener updates', () => {
      const listener = vi.fn();
      keyManager.subscribe(listener);

      for (let i = 0; i < 100; i++) {
        keyManager.set('anthropic', `sk-ant-${i}`);
      }

      expect(listener).toHaveBeenCalledTimes(100);
    });

    it('should handle storage version mismatch', async () => {
      const futureVersion = {
        version: 999,
        anthropic: 'sk-ant-future',
        unsplash: 'unsplash-future',
      };

      localStorageMock['api-keys'] = JSON.stringify(futureVersion);

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      // Should still load keys
      expect(km.get('anthropic')).toBe('sk-ant-future');
    });
  });

  describe('Type Safety', () => {
    it('should only accept valid service types', () => {
      const validServices: ServiceType[] = ['anthropic', 'unsplash'];

      validServices.forEach(service => {
        expect(() => keyManager.get(service)).not.toThrow();
        expect(() => keyManager.set(service, 'test-key')).not.toThrow();
      });
    });

    it('should return proper ValidationResult structure', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const result = await keyManager.validate('anthropic', 'sk-ant-' + 'a'.repeat(20));

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('provider');

      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.provider).toBe('string');
    });

    it('should return proper ApiKeys structure', () => {
      const keys = keyManager.getAll();

      expect(keys).toHaveProperty('anthropic');
      expect(keys).toHaveProperty('unsplash');

      expect(typeof keys.anthropic).toBe('string');
      expect(typeof keys.unsplash).toBe('string');
    });
  });

  describe('Performance', () => {
    it('should complete initialization quickly', async () => {
      const start = performance.now();

      vi.resetModules();
      const module = await import('@/lib/keys/keyManager');
      const km = module.keyManager;
      km.init();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should complete get operations quickly', () => {
      keyManager.set('anthropic', 'sk-ant-test');

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        keyManager.get('anthropic');
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should handle large listener count efficiently', () => {
      const listeners = Array(100).fill(null).map(() => vi.fn());
      listeners.forEach(l => keyManager.subscribe(l));

      const start = performance.now();
      keyManager.set('anthropic', 'sk-ant-test');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(listeners.every(l => l.mock.calls.length === 1)).toBe(true);
    });
  });
});
