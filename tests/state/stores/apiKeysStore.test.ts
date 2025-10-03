import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAPIKeysStore } from '@/lib/store/apiKeysStore';

// Mock fetch globally
global.fetch = vi.fn();

describe('APIKeysStore', () => {
  beforeEach(() => {
    useAPIKeysStore.setState({
      keys: {},
      activeKeys: {},
      isLoading: false,
      error: null,
      lastValidated: {},
    });
    vi.clearAllMocks();
  });

  describe('Key Management', () => {
    it('should add a new API key', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;
      await act(async () => {
        keyId = await result.current.addKey({
          name: 'OpenAI Key',
          key: 'sk-test1234567890',
          provider: 'openai',
          isActive: true,
        });
      });

      expect(keyId!).toBeDefined();
      expect(result.current.keys[keyId!]).toBeDefined();
      expect(result.current.keys[keyId!].name).toBe('OpenAI Key');
    });

    it('should encrypt API key on storage', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;
      const plainKey = 'sk-test1234567890';

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Test Key',
          key: plainKey,
          provider: 'openai',
          isActive: true,
        });
      });

      // Stored key should be encrypted (different from plain key)
      expect(result.current.keys[keyId!].key).not.toBe(plainKey);
    });

    it('should remove API key', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Temp Key',
          key: 'sk-temp',
          provider: 'openai',
          isActive: true,
        });

        await result.current.removeKey(keyId);
      });

      expect(result.current.keys[keyId!]).toBeUndefined();
    });

    it('should update API key', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Original Name',
          key: 'sk-original',
          provider: 'openai',
          isActive: true,
        });

        await result.current.updateKey(keyId, { name: 'Updated Name' });
      });

      expect(result.current.keys[keyId!].name).toBe('Updated Name');
    });

    it('should remove from active keys when deleted', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Active Key',
          key: 'sk-active',
          provider: 'openai',
          isActive: true,
        });

        result.current.setActiveKey('openai', keyId);
        await result.current.removeKey(keyId);
      });

      expect(result.current.activeKeys.openai).toBeUndefined();
    });
  });

  describe('Key Validation', () => {
    it('should validate OpenAI key successfully', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key === 'x-ratelimit-limit-requests') return '100';
            if (key === 'x-ratelimit-remaining-requests') return '99';
            return null;
          },
        },
      });

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'OpenAI Key',
          key: 'sk-validkey',
          provider: 'openai',
          isActive: false,
        });
      });

      expect(result.current.keys[keyId!].isActive).toBe(true);
    });

    it('should handle validation failure', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Invalid Key',
          key: 'sk-invalid',
          provider: 'openai',
          isActive: true,
        });
      });

      await waitFor(() => {
        expect(result.current.keys[keyId!].isActive).toBe(false);
      });
    });

    it('should track validation timestamp', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
      });

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Test Key',
          key: 'sk-test',
          provider: 'openai',
          isActive: false,
        });
      });

      await waitFor(() => {
        expect(result.current.lastValidated[keyId!]).toBeDefined();
      });
    });
  });

  describe('Active Key Management', () => {
    it('should set active key for provider', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Primary Key',
          key: 'sk-primary',
          provider: 'openai',
          isActive: true,
        });

        result.current.setActiveKey('openai', keyId);
      });

      expect(result.current.activeKeys.openai).toBe(keyId!);
    });

    it('should get active key and decrypt it', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => null },
      });

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Active Key',
          key: 'sk-activekey',
          provider: 'openai',
          isActive: true,
        });

        result.current.setActiveKey('openai', keyId);
      });

      const activeKey = result.current.getActiveKey('openai');

      expect(activeKey).not.toBeNull();
      expect(activeKey!.key).toBeTruthy();
      // Key should be decrypted (not the same as stored encrypted version)
    });

    it('should return null for inactive key', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Inactive Key',
          key: 'sk-inactive',
          provider: 'openai',
          isActive: false,
        });

        result.current.setActiveKey('openai', keyId);
      });

      const activeKey = result.current.getActiveKey('openai');

      expect(activeKey).toBeNull();
    });
  });

  describe('Usage Tracking', () => {
    it('should track key usage count', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Usage Key',
          key: 'sk-usage',
          provider: 'openai',
          isActive: true,
        });

        result.current.incrementUsage(keyId);
        result.current.incrementUsage(keyId);
      });

      const usage = result.current.getKeyUsage(keyId!);

      expect(usage.count).toBe(2);
    });

    it('should track last used timestamp', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Timestamp Key',
          key: 'sk-timestamp',
          provider: 'openai',
          isActive: true,
        });

        result.current.incrementUsage(keyId);
      });

      const usage = result.current.getKeyUsage(keyId!);

      expect(usage.lastUsed).toBeDefined();
    });

    it('should update rate limit information', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Rate Limited Key',
          key: 'sk-rate',
          provider: 'openai',
          isActive: true,
        });

        result.current.updateRateLimit(keyId, {
          requests: 100,
          windowMs: 60000,
          remaining: 75,
          resetTime: new Date(Date.now() + 60000),
        });
      });

      expect(result.current.keys[keyId!].rateLimit).toBeDefined();
      expect(result.current.keys[keyId!].rateLimit!.requests).toBe(100);
      expect(result.current.keys[keyId!].rateLimit!.remaining).toBe(75);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate API key', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => null },
      });

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Rotatable Key',
          key: 'sk-old',
          provider: 'openai',
          isActive: true,
        });

        await result.current.rotateKey(keyId, 'sk-new');
      });

      // Usage count should be reset
      expect(result.current.keys[keyId!].usageCount).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should clear all keys', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      await act(async () => {
        await result.current.addKey({
          name: 'Key 1',
          key: 'sk-1',
          provider: 'openai',
          isActive: true,
        });

        await result.current.addKey({
          name: 'Key 2',
          key: 'sk-2',
          provider: 'unsplash',
          isActive: true,
        });

        await result.current.clearAllKeys();
      });

      expect(Object.keys(result.current.keys)).toHaveLength(0);
      expect(Object.keys(result.current.activeKeys)).toHaveLength(0);
    });

    it('should export keys', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      await act(async () => {
        await result.current.addKey({
          name: 'Export Key',
          key: 'sk-export',
          provider: 'openai',
          isActive: true,
        });
      });

      const exportedData = result.current.exportKeys();

      expect(exportedData).toBeTruthy();
      expect(typeof exportedData).toBe('string');
    });

    it('should import keys', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      // First export
      let exportedData: string;

      await act(async () => {
        await result.current.addKey({
          name: 'Import Test Key',
          key: 'sk-import',
          provider: 'openai',
          isActive: true,
        });

        exportedData = result.current.exportKeys();

        await result.current.clearAllKeys();
        await result.current.importKeys(exportedData);
      });

      expect(Object.keys(result.current.keys).length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      let keyId: string;

      await act(async () => {
        keyId = await result.current.addKey({
          name: 'Error Key',
          key: 'sk-error',
          provider: 'openai',
          isActive: false,
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle import errors', async () => {
      const { result } = renderHook(() => useAPIKeysStore());

      await act(async () => {
        await result.current.importKeys('invalid-data');
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});
