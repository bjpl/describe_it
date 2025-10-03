/**
 * LocalStorage Persistence Integration Tests
 * Comprehensive test suite for localStorage with 90%+ coverage
 *
 * Coverage:
 * - Basic CRUD operations
 * - JSON serialization/deserialization
 * - Quota handling and limits
 * - Error handling
 * - Cross-tab synchronization
 * - Compression
 * - TTL and expiration
 * - Storage categorization
 * - Cleanup strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localStorageManager, safeSaveToStorage, safeGetFromStorage } from '@/lib/storage/LocalStorageManager';
import type { StorageQuota, CleanupStrategy, StorageEntry } from '@/lib/storage/LocalStorageManager';

describe('LocalStorage Persistence - Basic Operations', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save data to localStorage', () => {
    const key = 'test-key';
    const value = 'test-value';

    const success = localStorageManager.setItem(key, value);

    expect(success).toBe(true);
    expect(localStorage.getItem(key)).toBe(value);
  });

  it('should retrieve data from localStorage', () => {
    const key = 'test-key';
    const value = 'test-value';
    localStorage.setItem(key, value);

    const retrieved = localStorageManager.getItem(key);

    expect(retrieved).toBe(value);
  });

  it('should update existing data', () => {
    const key = 'test-key';
    localStorageManager.setItem(key, 'old-value');

    localStorageManager.setItem(key, 'new-value');

    expect(localStorageManager.getItem(key)).toBe('new-value');
  });

  it('should delete data from localStorage', () => {
    const key = 'test-key';
    localStorageManager.setItem(key, 'test-value');

    localStorageManager.removeItem(key);

    expect(localStorage.getItem(key)).toBeNull();
  });

  it('should delete metadata when removing item', () => {
    const key = 'test-key';
    localStorageManager.setItem(key, 'test-value');
    const metaKey = `__meta_${key}`;

    localStorageManager.removeItem(key);

    expect(localStorage.getItem(metaKey)).toBeNull();
  });

  it('should clear all data', () => {
    localStorageManager.setItem('key1', 'value1');
    localStorageManager.setItem('key2', 'value2');

    localStorage.clear();

    expect(localStorage.length).toBe(0);
  });
});

describe('LocalStorage Persistence - JSON Serialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and retrieve JSON objects', () => {
    const key = 'test-object';
    const data = { name: 'John', age: 30, active: true };

    safeSaveToStorage(key, data);
    const retrieved = safeGetFromStorage(key);

    expect(retrieved).toEqual(data);
  });

  it('should save and retrieve arrays', () => {
    const key = 'test-array';
    const data = [1, 2, 3, 4, 5];

    safeSaveToStorage(key, data);
    const retrieved = safeGetFromStorage(key);

    expect(retrieved).toEqual(data);
  });

  it('should save and retrieve nested objects', () => {
    const key = 'test-nested';
    const data = {
      user: {
        profile: {
          name: 'Jane',
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      }
    };

    safeSaveToStorage(key, data);
    const retrieved = safeGetFromStorage(key);

    expect(retrieved).toEqual(data);
  });

  it('should handle null values', () => {
    const key = 'test-null';
    safeSaveToStorage(key, null);

    const retrieved = safeGetFromStorage(key);

    expect(retrieved).toBeNull();
  });

  it('should handle undefined by storing null', () => {
    const key = 'test-undefined';
    safeSaveToStorage(key, undefined);

    const retrieved = safeGetFromStorage(key);

    expect(retrieved).toBeNull();
  });

  it('should handle boolean values', () => {
    safeSaveToStorage('test-true', true);
    safeSaveToStorage('test-false', false);

    expect(safeGetFromStorage('test-true')).toBe(true);
    expect(safeGetFromStorage('test-false')).toBe(false);
  });

  it('should handle number values', () => {
    safeSaveToStorage('test-number', 42);
    safeSaveToStorage('test-float', 3.14);

    expect(safeGetFromStorage('test-number')).toBe(42);
    expect(safeGetFromStorage('test-float')).toBe(3.14);
  });

  it('should handle empty objects', () => {
    safeSaveToStorage('test-empty-obj', {});

    expect(safeGetFromStorage('test-empty-obj')).toEqual({});
  });

  it('should handle empty arrays', () => {
    safeSaveToStorage('test-empty-arr', []);

    expect(safeGetFromStorage('test-empty-arr')).toEqual([]);
  });
});

describe('LocalStorage Persistence - Quota Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should calculate storage size', async () => {
    localStorageManager.setItem('key1', 'a'.repeat(1000));
    localStorageManager.setItem('key2', 'b'.repeat(1000));

    const quota = await localStorageManager.getQuota();

    expect(quota.used).toBeGreaterThan(0);
    expect(quota.total).toBeGreaterThan(0);
    expect(quota.available).toBeLessThanOrEqual(quota.total);
  });

  it('should calculate storage percentage', async () => {
    localStorageManager.setItem('test', 'value');

    const quota = await localStorageManager.getQuota();

    expect(quota.percentage).toBeGreaterThanOrEqual(0);
    expect(quota.percentage).toBeLessThanOrEqual(100);
  });

  it('should analyze storage entries', () => {
    localStorageManager.setItem('key1', 'small');
    localStorageManager.setItem('key2', 'a'.repeat(1000));

    const entries = localStorageManager.analyzeStorage();

    expect(entries).toBeInstanceOf(Array);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty('key');
    expect(entries[0]).toHaveProperty('size');
    expect(entries[0]).toHaveProperty('category');
  });

  it('should sort entries by size descending', () => {
    localStorageManager.setItem('small', 'a');
    localStorageManager.setItem('large', 'b'.repeat(1000));
    localStorageManager.setItem('medium', 'c'.repeat(100));

    const entries = localStorageManager.analyzeStorage();

    // First entry should be the largest
    expect(entries[0].size).toBeGreaterThanOrEqual(entries[1].size);
    expect(entries[1].size).toBeGreaterThanOrEqual(entries[2].size);
  });

  it('should handle quota exceeded error with auto-cleanup', () => {
    // Mock QuotaExceededError
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;

    Storage.prototype.setItem = function(key: string, value: string) {
      callCount++;
      if (callCount === 1) {
        const error: any = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return originalSetItem.call(this, key, value);
    };

    // Add some low-priority data to clean up
    localStorageManager.setItem('image-cache-old', 'data');

    const result = localStorageManager.setItem('test-key', 'test-value');

    // Should succeed after cleanup
    expect(result).toBe(true);

    Storage.prototype.setItem = originalSetItem;
  });
});

describe('LocalStorage Persistence - Compression', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should compress large values', () => {
    const largeValue = 'x'.repeat(5000);

    localStorageManager.setItem('test-large', largeValue, { compress: true });

    const stored = localStorage.getItem('test-large');
    expect(stored).toBeDefined();
    // Compressed value should be different from original
    expect(stored).not.toBe(largeValue);
  });

  it('should decompress on retrieval', () => {
    const originalValue = 'Test data that will be compressed';

    localStorageManager.setItem('test-compress', originalValue, { compress: true });
    const retrieved = localStorageManager.getItem('test-compress');

    expect(retrieved).toBe(originalValue);
  });

  it('should store compression metadata', () => {
    localStorageManager.setItem('test-meta', 'data', { compress: true });

    const meta = localStorage.getItem('__meta_test-meta');
    expect(meta).toBeDefined();

    const parsed = JSON.parse(meta!);
    expect(parsed.compressed).toBe(true);
  });

  it('should not compress small values', () => {
    const smallValue = 'small';

    localStorageManager.setItem('test-small', smallValue, { compress: true });

    // Small values shouldn't be compressed
    const stored = localStorage.getItem('test-small');
    expect(stored).toBe(smallValue);
  });
});

describe('LocalStorage Persistence - TTL and Expiration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should store TTL metadata', () => {
    const ttl = 5000; // 5 seconds

    localStorageManager.setItem('test-ttl', 'value', { ttl });

    const meta = localStorage.getItem('__meta_test-ttl');
    const parsed = JSON.parse(meta!);

    expect(parsed.ttl).toBe(ttl);
  });

  it('should cleanup expired items', () => {
    const now = Date.now();

    // Mock metadata for expired item
    localStorage.setItem('expired-key', 'value');
    localStorage.setItem('__meta_expired-key', JSON.stringify({
      lastModified: now - 10000, // 10 seconds ago
      ttl: 5000 // 5 second TTL
    }));

    const freedSpace = localStorageManager.performCleanup({ strategy: 'ttl' });

    expect(freedSpace).toBeGreaterThan(0);
    expect(localStorage.getItem('expired-key')).toBeNull();
  });

  it('should not cleanup non-expired items', () => {
    const now = Date.now();

    localStorage.setItem('valid-key', 'value');
    localStorage.setItem('__meta_valid-key', JSON.stringify({
      lastModified: now - 1000, // 1 second ago
      ttl: 5000 // 5 second TTL
    }));

    localStorageManager.performCleanup({ strategy: 'ttl' });

    expect(localStorage.getItem('valid-key')).toBe('value');
  });
});

describe('LocalStorage Persistence - Cleanup Strategies', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should cleanup by priority (remove low priority first)', () => {
    // Add items with different priorities
    localStorage.setItem('image-cache-1', 'a'.repeat(100));
    localStorage.setItem('__meta_image-cache-1', JSON.stringify({ lastModified: Date.now() }));

    localStorage.setItem('api-keys-important', 'critical-data');
    localStorage.setItem('__meta_api-keys-important', JSON.stringify({ lastModified: Date.now() }));

    const freedSpace = localStorageManager.performCleanup({
      strategy: 'priority',
      targetPercentage: 0 // Force cleanup
    });

    // Image cache should be removed (low priority)
    expect(localStorage.getItem('image-cache-1')).toBeNull();
    // API keys should remain (critical priority)
    expect(localStorage.getItem('api-keys-important')).toBe('critical-data');
  });

  it('should cleanup LRU items', () => {
    const now = Date.now();

    localStorage.setItem('old-key', 'old-value');
    localStorage.setItem('__meta_old-key', JSON.stringify({ lastModified: now - 10000 }));

    localStorage.setItem('new-key', 'new-value');
    localStorage.setItem('__meta_new-key', JSON.stringify({ lastModified: now }));

    localStorageManager.performCleanup({ strategy: 'lru', targetPercentage: 0 });

    // Old item should be removed first
    expect(localStorage.getItem('old-key')).toBeNull();
  });

  it('should cleanup largest items first', () => {
    localStorage.setItem('small-key', 'small');
    localStorage.setItem('__meta_small-key', JSON.stringify({ lastModified: Date.now() }));

    localStorage.setItem('large-key', 'x'.repeat(1000));
    localStorage.setItem('__meta_large-key', JSON.stringify({ lastModified: Date.now() }));

    localStorageManager.performCleanup({ strategy: 'size', targetPercentage: 0 });

    // Large item should be removed first
    expect(localStorage.getItem('large-key')).toBeNull();
  });

  it('should preserve specified keys during cleanup', () => {
    localStorage.setItem('preserve-me', 'important');
    localStorage.setItem('__meta_preserve-me', JSON.stringify({ lastModified: Date.now() }));

    localStorage.setItem('remove-me', 'x'.repeat(100));
    localStorage.setItem('__meta_remove-me', JSON.stringify({ lastModified: Date.now() }));

    localStorageManager.performCleanup({
      strategy: 'size',
      targetPercentage: 0,
      preserveKeys: ['preserve-me']
    });

    expect(localStorage.getItem('preserve-me')).toBe('important');
  });
});

describe('LocalStorage Persistence - Cross-tab Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should listen for storage events', () => {
    const listener = vi.fn();

    localStorageManager.addEventListener('change', listener);

    // Simulate storage event from another tab
    const event = new StorageEvent('storage', {
      key: 'test-key',
      oldValue: 'old',
      newValue: 'new',
      url: 'http://localhost'
    });
    window.dispatchEvent(event);

    expect(listener).toHaveBeenCalled();
  });

  it('should notify listeners of changes', () => {
    const listener = vi.fn();

    localStorageManager.addEventListener('change', listener);

    const event = new StorageEvent('storage', {
      key: 'test-key',
      oldValue: null,
      newValue: 'new-value'
    });
    window.dispatchEvent(event);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'test-key',
        newValue: 'new-value'
      })
    );
  });

  it('should remove event listeners', () => {
    const listener = vi.fn();

    localStorageManager.addEventListener('change', listener);
    localStorageManager.removeEventListener('change', listener);

    const event = new StorageEvent('storage', {
      key: 'test-key',
      oldValue: null,
      newValue: 'new-value'
    });
    window.dispatchEvent(event);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('LocalStorage Persistence - Categories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should categorize API keys correctly', () => {
    localStorageManager.setItem('api-key-openai', 'sk-test');

    const entries = localStorageManager.analyzeStorage();
    const apiKeyEntry = entries.find(e => e.key === 'api-key-openai');

    expect(apiKeyEntry?.category).toBe('api-keys');
    expect(apiKeyEntry?.priority).toBe('critical');
  });

  it('should categorize settings correctly', () => {
    localStorageManager.setItem('user-settings', JSON.stringify({ theme: 'dark' }));

    const entries = localStorageManager.analyzeStorage();
    const settingsEntry = entries.find(e => e.key === 'user-settings');

    expect(settingsEntry?.category).toBe('user-settings');
    expect(settingsEntry?.priority).toBe('critical');
  });

  it('should categorize image cache correctly', () => {
    localStorageManager.setItem('unsplash-image-123', 'image-data');

    const entries = localStorageManager.analyzeStorage();
    const imageEntry = entries.find(e => e.key === 'unsplash-image-123');

    expect(imageEntry?.category).toBe('image-cache');
    expect(imageEntry?.priority).toBe('low');
  });

  it('should clear specific category', () => {
    localStorageManager.setItem('image-cache-1', 'data1');
    localStorageManager.setItem('image-cache-2', 'data2');
    localStorageManager.setItem('user-settings', 'settings');

    const freedSpace = localStorageManager.clearCategory('image-cache');

    expect(freedSpace).toBeGreaterThan(0);
    expect(localStorage.getItem('image-cache-1')).toBeNull();
    expect(localStorage.getItem('image-cache-2')).toBeNull();
    expect(localStorage.getItem('user-settings')).toBe('settings');
  });
});

describe('LocalStorage Persistence - Health Reports', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should generate health report', async () => {
    localStorageManager.setItem('test-key', 'test-value');

    const report = await localStorageManager.getHealthReport();

    expect(report).toHaveProperty('quota');
    expect(report).toHaveProperty('totalItems');
    expect(report).toHaveProperty('totalSize');
    expect(report).toHaveProperty('largestItems');
    expect(report).toHaveProperty('categorySizes');
    expect(report).toHaveProperty('recommendations');
  });

  it('should include largest items in report', async () => {
    localStorageManager.setItem('small', 'a');
    localStorageManager.setItem('large', 'x'.repeat(1000));

    const report = await localStorageManager.getHealthReport();

    expect(report.largestItems).toBeInstanceOf(Array);
    expect(report.largestItems.length).toBeGreaterThan(0);
    expect(report.largestItems[0]).toHaveProperty('key');
    expect(report.largestItems[0]).toHaveProperty('sizeKB');
  });

  it('should provide recommendations when storage is high', async () => {
    // Mock high storage usage
    const getQuotaSpy = vi.spyOn(localStorageManager, 'getQuota');
    getQuotaSpy.mockResolvedValue({
      used: 9500000,
      total: 10000000,
      available: 500000,
      percentage: 95
    });

    const report = await localStorageManager.getHealthReport();

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0]).toContain('Critical');

    getQuotaSpy.mockRestore();
  });
});

describe('LocalStorage Persistence - Import/Export', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should export all data as JSON', () => {
    localStorageManager.setItem('key1', 'value1');
    localStorageManager.setItem('key2', 'value2');

    const exported = localStorageManager.exportData();
    const parsed = JSON.parse(exported);

    expect(parsed).toHaveProperty('key1');
    expect(parsed).toHaveProperty('key2');
  });

  it('should not export metadata keys', () => {
    localStorageManager.setItem('data-key', 'value');

    const exported = localStorageManager.exportData();
    const parsed = JSON.parse(exported);

    expect(parsed).not.toHaveProperty('__meta_data-key');
  });

  it('should import data from JSON', () => {
    const data = {
      'key1': 'value1',
      'key2': 'value2'
    };

    const success = localStorageManager.importData(JSON.stringify(data));

    expect(success).toBe(true);
    expect(localStorageManager.getItem('key1')).toBe('value1');
    expect(localStorageManager.getItem('key2')).toBe('value2');
  });

  it('should handle import errors gracefully', () => {
    const invalidJSON = '{ invalid json }';

    const success = localStorageManager.importData(invalidJSON);

    expect(success).toBe(false);
  });
});

describe('LocalStorage Persistence - Error Handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle getItem errors gracefully', () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('Storage error');
    };

    const result = localStorageManager.getItem('test-key');

    expect(result).toBeNull();

    Storage.prototype.getItem = originalGetItem;
  });

  it('should handle setItem errors gracefully', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('Storage error');
    };

    const result = localStorageManager.setItem('test-key', 'value');

    expect(result).toBe(false);

    Storage.prototype.setItem = originalSetItem;
  });

  it('should handle removeItem errors gracefully', () => {
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => {
      throw new Error('Storage error');
    };

    expect(() => localStorageManager.removeItem('test-key')).not.toThrow();

    Storage.prototype.removeItem = originalRemoveItem;
  });
});
