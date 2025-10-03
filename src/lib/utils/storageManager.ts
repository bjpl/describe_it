import { logger } from '@/lib/logger';

/**
 * Storage management utilities to handle localStorage quota issues
 */

export class StorageManager {
  /**
   * Clean up old or unnecessary data from localStorage
   */
  static cleanupStorage(): void {
    try {
      const keysToCheck = [
        'describe-it-settings',
        'app-settings',
        'debug-logs',
        'performance-metrics',
        'cache-'
      ];

      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Remove old cache entries
      allKeys.forEach(key => {
        if (key.startsWith('cache-')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              // Remove cache entries older than 24 hours
              if (parsed.timestamp && Date.now() - parsed.timestamp > 86400000) {
                localStorage.removeItem(key);
                logger.info(`[StorageManager] Removed old cache: ${key}`);
              }
            }
          } catch (e) {
            // If we can't parse it, remove it
            localStorage.removeItem(key);
          }
        }
      });

      // Compact large settings objects
      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data && data.length > 10000) { // If larger than 10KB
            const parsed = JSON.parse(data);
            // Remove unnecessary data
            if (parsed.debugLogs) delete parsed.debugLogs;
            if (parsed.tempData) delete parsed.tempData;
            if (parsed.cache) delete parsed.cache;
            
            localStorage.setItem(key, safeStringify(parsed));
            logger.info(`[StorageManager] Compacted ${key}`);
          }
        } catch (e) {
          logger.warn(`[StorageManager] Could not compact ${key}:`, e);
        }
      });
    } catch (error) {
      logger.error('[StorageManager] Cleanup failed:', error);
    }
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): { used: number; keys: string[]; largest: string } {
    let totalSize = 0;
    let largestKey = '';
    let largestSize = 0;
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      const size = (localStorage.getItem(key) || '').length;
      totalSize += size;
      if (size > largestSize) {
        largestSize = size;
        largestKey = key;
      }
    });

    return {
      used: totalSize,
      keys,
      largest: largestKey
    };
  }

  /**
   * Safely save to localStorage with quota handling
   */
  static safeSave(key: string, value: any): boolean {
    try {
      const stringValue = typeof value === 'string' ? value : safeStringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        logger.warn('[StorageManager] Quota exceeded, attempting cleanup...');
        this.cleanupStorage();
        
        // Try again after cleanup
        try {
          const stringValue = typeof value === 'string' ? value : safeStringify(value);
          localStorage.setItem(key, stringValue);
          return true;
        } catch (e2) {
          logger.error('[StorageManager] Save failed even after cleanup:', e2);
          return false;
        }
      }
      logger.error('[StorageManager] Save error:', e);
      return false;
    }
  }
}

// Auto-cleanup on load if storage is nearly full
if (typeof window !== 'undefined') {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
  } catch (e) {
    // Storage is full or nearly full
    logger.info('[StorageManager] Storage appears full, running cleanup...');
    StorageManager.cleanupStorage();
  }
}