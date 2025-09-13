/**
 * Comprehensive localStorage Management System
 * Handles quota issues, monitoring, cleanup, and optimization
 */

import { logger } from '../logger';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface StorageEntry {
  key: string;
  size: number;
  lastModified: number;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  ttl?: number; // Time to live in milliseconds
}

export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export interface CleanupStrategy {
  strategy: 'lru' | 'ttl' | 'size' | 'priority';
  targetPercentage?: number;
  maxAge?: number;
  preserveKeys?: string[];
}

export interface StorageConfig {
  quotaWarningThreshold: number; // Percentage (e.g., 80)
  quotaCriticalThreshold: number; // Percentage (e.g., 95)
  autoCleanup: boolean;
  cleanupStrategy: CleanupStrategy;
  monitoring: boolean;
  compressionEnabled: boolean;
}

class LocalStorageManager {
  private static instance: LocalStorageManager;
  private config: StorageConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(event: StorageEvent) => void>> = new Map();
  
  // Storage categories with priorities
  private readonly STORAGE_CATEGORIES = {
    'api-keys': { priority: 'critical', ttl: null },
    'user-settings': { priority: 'critical', ttl: null },
    'app-state': { priority: 'high', ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 days
    'image-cache': { priority: 'low', ttl: 24 * 60 * 60 * 1000 }, // 1 day
    'error-logs': { priority: 'low', ttl: 3 * 24 * 60 * 60 * 1000 }, // 3 days
    'search-history': { priority: 'medium', ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    'vocabulary': { priority: 'medium', ttl: null },
    'tab-sync': { priority: 'low', ttl: 60 * 60 * 1000 }, // 1 hour
  } as const;

  private constructor() {
    this.config = {
      quotaWarningThreshold: 80,
      quotaCriticalThreshold: 95,
      autoCleanup: true,
      cleanupStrategy: {
        strategy: 'priority',
        targetPercentage: 70,
        preserveKeys: ['describe-it-settings', 'app-settings']
      },
      monitoring: true,
      compressionEnabled: true
    };

    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
      this.setupStorageEventListener();
    }
  }

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  /**
   * Get current storage quota information
   */
  async getQuota(): Promise<StorageQuota> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 10 * 1024 * 1024; // Default 10MB
        
        return {
          used,
          total,
          available: total - used,
          percentage: (used / total) * 100
        };
      }
    } catch (error) {
      console.warn('Storage quota API not available:', error);
    }

    // Fallback: Calculate from localStorage
    const used = this.calculateLocalStorageSize();
    const total = 10 * 1024 * 1024; // Assume 10MB limit
    
    return {
      used,
      total,
      available: total - used,
      percentage: (used / total) * 100
    };
  }

  /**
   * Calculate total localStorage size
   */
  private calculateLocalStorageSize(): number {
    let totalSize = 0;
    
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
        }
      }
    } catch (error) {
      console.error('Error calculating localStorage size:', error);
    }
    
    return totalSize * 2; // Multiply by 2 for UTF-16 encoding
  }

  /**
   * Get detailed storage analysis
   */
  analyzeStorage(): StorageEntry[] {
    const entries: StorageEntry[] = [];
    
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key) || '';
          const size = (key.length + value.length) * 2;
          const category = this.categorizeKey(key);
          
          entries.push({
            key,
            size,
            lastModified: this.getKeyLastModified(key),
            category,
            priority: this.getKeyPriority(key),
            ttl: this.getKeyTTL(key)
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing storage:', error);
    }
    
    return entries.sort((a, b) => b.size - a.size);
  }

  /**
   * Categorize storage key
   */
  private categorizeKey(key: string): string {
    if (key.includes('api') || key.includes('key')) return 'api-keys';
    if (key.includes('settings') || key.includes('preferences')) return 'user-settings';
    if (key.includes('store') || key.includes('state')) return 'app-state';
    if (key.includes('image') || key.includes('unsplash')) return 'image-cache';
    if (key.includes('error') || key.includes('log')) return 'error-logs';
    if (key.includes('search') || key.includes('history')) return 'search-history';
    if (key.includes('vocabulary') || key.includes('learning')) return 'vocabulary';
    if (key.includes('tab') || key.includes('sync')) return 'tab-sync';
    return 'other';
  }

  /**
   * Get key priority based on category
   */
  private getKeyPriority(key: string): 'critical' | 'high' | 'medium' | 'low' {
    const category = this.categorizeKey(key);
    return (this.STORAGE_CATEGORIES as any)[category]?.priority || 'low';
  }

  /**
   * Get key TTL based on category
   */
  private getKeyTTL(key: string): number | undefined {
    const category = this.categorizeKey(key);
    return (this.STORAGE_CATEGORIES as any)[category]?.ttl;
  }

  /**
   * Get when key was last modified (approximation)
   */
  private getKeyLastModified(key: string): number {
    try {
      const metaKey = `__meta_${key}`;
      const meta = localStorage.getItem(metaKey);
      if (meta) {
        const parsed = safeParse(meta);
        return parsed.lastModified || Date.now();
      }
    } catch {}
    return Date.now();
  }

  /**
   * Safe localStorage.setItem with quota handling
   */
  setItem(key: string, value: string, options?: { compress?: boolean; ttl?: number }): boolean {
    try {
      // Try compression if enabled and value is large
      let finalValue = value;
      if (options?.compress && this.config.compressionEnabled && value.length > 1024) {
        finalValue = this.compress(value);
      }

      // Store metadata
      const metaKey = `__meta_${key}`;
      const metadata = {
        lastModified: Date.now(),
        compressed: options?.compress,
        ttl: options?.ttl,
        originalSize: value.length,
        compressedSize: finalValue.length
      };
      
      localStorage.setItem(key, finalValue);
      localStorage.setItem(metaKey, safeStringify(metadata));
      
      return true;
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup...');
        
        if (this.config.autoCleanup) {
          this.performCleanup();
          
          // Retry after cleanup
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (retryError) {
            console.error('Failed to store even after cleanup:', retryError);
            this.handleQuotaExceeded(key, value);
          }
        }
      }
      
      logger.error('localStorage setItem failed', error, { key, valueSize: value.length });
      return false;
    }
  }

  /**
   * Safe localStorage.getItem with decompression
   */
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      // Check if compressed
      const metaKey = `__meta_${key}`;
      const meta = localStorage.getItem(metaKey);
      if (meta) {
        const parsed = safeParse(meta);
        if (parsed.compressed) {
          return this.decompress(value);
        }
      }

      return value;
    } catch (error) {
      console.error('Error getting item from localStorage:', error);
      return null;
    }
  }

  /**
   * Remove item and its metadata
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`__meta_${key}`);
    } catch (error) {
      console.error('Error removing item from localStorage:', error);
    }
  }

  /**
   * Perform storage cleanup based on strategy
   */
  performCleanup(strategy?: CleanupStrategy): number {
    const cleanupStrategy = strategy || this.config.cleanupStrategy;
    const entries = this.analyzeStorage();
    let freedSpace = 0;

    console.log(`Performing cleanup with strategy: ${cleanupStrategy.strategy}`);

    switch (cleanupStrategy.strategy) {
      case 'lru':
        freedSpace = this.cleanupLRU(entries, cleanupStrategy);
        break;
      case 'ttl':
        freedSpace = this.cleanupExpired(entries);
        break;
      case 'size':
        freedSpace = this.cleanupLargest(entries, cleanupStrategy);
        break;
      case 'priority':
      default:
        freedSpace = this.cleanupByPriority(entries, cleanupStrategy);
        break;
    }

    console.log(`Cleanup freed ${(freedSpace / 1024).toFixed(2)} KB`);
    this.notifyListeners('cleanup', { freedSpace });
    
    return freedSpace;
  }

  /**
   * Cleanup by priority (remove low priority items first)
   */
  private cleanupByPriority(entries: StorageEntry[], strategy: CleanupStrategy): number {
    const preserveKeys = new Set(strategy.preserveKeys || []);
    const priorityOrder: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    let freedSpace = 0;

    for (const priority of priorityOrder) {
      const itemsToRemove = entries.filter(
        e => e.priority === priority && !preserveKeys.has(e.key)
      );

      for (const item of itemsToRemove) {
        // Check if we've freed enough space
        const quota = this.getQuotaSync();
        if (quota.percentage < (strategy.targetPercentage || 70)) {
          return freedSpace;
        }

        this.removeItem(item.key);
        freedSpace += item.size;
        console.log(`Removed ${item.key} (${priority} priority, ${(item.size / 1024).toFixed(2)} KB)`);
      }
    }

    return freedSpace;
  }

  /**
   * Cleanup expired items based on TTL
   */
  private cleanupExpired(entries: StorageEntry[]): number {
    const now = Date.now();
    let freedSpace = 0;

    for (const entry of entries) {
      if (entry.ttl) {
        const age = now - entry.lastModified;
        if (age > entry.ttl) {
          this.removeItem(entry.key);
          freedSpace += entry.size;
          console.log(`Removed expired ${entry.key} (age: ${(age / 1000 / 60).toFixed(0)} minutes)`);
        }
      }
    }

    return freedSpace;
  }

  /**
   * Cleanup least recently used items
   */
  private cleanupLRU(entries: StorageEntry[], strategy: CleanupStrategy): number {
    const preserveKeys = new Set(strategy.preserveKeys || []);
    const sortedByAge = entries
      .filter(e => !preserveKeys.has(e.key))
      .sort((a, b) => a.lastModified - b.lastModified);
    
    let freedSpace = 0;
    const targetSpace = (strategy.targetPercentage || 70) / 100;

    for (const entry of sortedByAge) {
      const quota = this.getQuotaSync();
      if (quota.percentage / 100 < targetSpace) {
        return freedSpace;
      }

      this.removeItem(entry.key);
      freedSpace += entry.size;
      console.log(`Removed LRU ${entry.key} (${(entry.size / 1024).toFixed(2)} KB)`);
    }

    return freedSpace;
  }

  /**
   * Cleanup largest items first
   */
  private cleanupLargest(entries: StorageEntry[], strategy: CleanupStrategy): number {
    const preserveKeys = new Set(strategy.preserveKeys || []);
    const sortedBySize = entries
      .filter(e => !preserveKeys.has(e.key))
      .sort((a, b) => b.size - a.size);
    
    let freedSpace = 0;
    const targetSpace = (strategy.targetPercentage || 70) / 100;

    for (const entry of sortedBySize) {
      const quota = this.getQuotaSync();
      if (quota.percentage / 100 < targetSpace) {
        return freedSpace;
      }

      this.removeItem(entry.key);
      freedSpace += entry.size;
      console.log(`Removed large item ${entry.key} (${(entry.size / 1024).toFixed(2)} KB)`);
    }

    return freedSpace;
  }

  /**
   * Get quota synchronously (less accurate)
   */
  private getQuotaSync(): StorageQuota {
    const used = this.calculateLocalStorageSize();
    const total = 10 * 1024 * 1024;
    
    return {
      used,
      total,
      available: total - used,
      percentage: (used / total) * 100
    };
  }

  /**
   * Handle quota exceeded error
   */
  private handleQuotaExceeded(key: string, value: string): void {
    // Notify user
    this.notifyListeners('quota-exceeded', { key, valueSize: value.length });
    
    // Log error
    logger.error('localStorage quota exceeded', new Error('QuotaExceededError'), {
      key,
      valueSize: value.length,
      currentUsage: this.calculateLocalStorageSize()
    });

    // Show user-friendly message
    if (typeof window !== 'undefined' && window.alert) {
      alert(
        'Storage space is full. Some data could not be saved. ' +
        'Please clear your browser cache or remove old data from settings.'
      );
    }
  }

  /**
   * Simple compression using LZ-string algorithm (basic implementation)
   */
  private compress(str: string): string {
    try {
      // Basic compression - in production, use a library like lz-string
      return btoa(encodeURIComponent(str));
    } catch {
      return str;
    }
  }

  /**
   * Decompress string
   */
  private decompress(str: string): string {
    try {
      return decodeURIComponent(atob(str));
    } catch {
      return str;
    }
  }

  /**
   * Initialize storage monitoring
   */
  private initializeMonitoring(): void {
    if (!this.config.monitoring) return;

    // Check storage every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      const quota = await this.getQuota();
      
      if (quota.percentage > this.config.quotaCriticalThreshold) {
        console.error(`Critical storage usage: ${quota.percentage.toFixed(1)}%`);
        this.notifyListeners('critical', quota);
        
        if (this.config.autoCleanup) {
          this.performCleanup();
        }
      } else if (quota.percentage > this.config.quotaWarningThreshold) {
        console.warn(`High storage usage: ${quota.percentage.toFixed(1)}%`);
        this.notifyListeners('warning', quota);
      }
    }, 30000);
  }

  /**
   * Setup storage event listener for cross-tab sync
   */
  private setupStorageEventListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key && event.newValue !== event.oldValue) {
        this.notifyListeners('change', {
          key: event.key,
          oldValue: event.oldValue,
          newValue: event.newValue,
          url: event.url
        });
      }
    });
  }

  /**
   * Add storage event listener
   */
  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove storage event listener
   */
  removeEventListener(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in storage event listener:`, error);
      }
    });
  }

  /**
   * Get storage health report
   */
  async getHealthReport() {
    const quota = await this.getQuota();
    const entries = this.analyzeStorage();
    
    const categorySizes: Record<string, number> = {};
    for (const entry of entries) {
      categorySizes[entry.category] = (categorySizes[entry.category] || 0) + entry.size;
    }

    return {
      quota,
      totalItems: entries.length,
      totalSize: entries.reduce((sum, e) => sum + e.size, 0),
      largestItems: entries.slice(0, 5).map(e => ({
        key: e.key,
        size: e.size,
        sizeKB: (e.size / 1024).toFixed(2)
      })),
      categorySizes: Object.entries(categorySizes).map(([category, size]) => ({
        category,
        size,
        sizeKB: (size / 1024).toFixed(2),
        percentage: ((size / quota.used) * 100).toFixed(1)
      })),
      recommendations: this.getRecommendations(quota, entries)
    };
  }

  /**
   * Get storage recommendations
   */
  private getRecommendations(quota: StorageQuota, entries: StorageEntry[]): string[] {
    const recommendations: string[] = [];

    if (quota.percentage > 90) {
      recommendations.push('Critical: Storage is almost full. Immediate cleanup required.');
    } else if (quota.percentage > 75) {
      recommendations.push('Warning: Storage usage is high. Consider cleanup soon.');
    }

    const imageEntries = entries.filter(e => e.category === 'image-cache');
    if (imageEntries.length > 100) {
      recommendations.push(`You have ${imageEntries.length} cached images. Consider clearing old ones.`);
    }

    const errorLogs = entries.filter(e => e.category === 'error-logs');
    if (errorLogs.length > 0) {
      const totalSize = errorLogs.reduce((sum, e) => sum + e.size, 0);
      if (totalSize > 100 * 1024) {
        recommendations.push('Error logs are taking significant space. Clear old logs.');
      }
    }

    const oldEntries = entries.filter(e => {
      const age = Date.now() - e.lastModified;
      return age > 30 * 24 * 60 * 60 * 1000; // 30 days
    });
    if (oldEntries.length > 0) {
      recommendations.push(`${oldEntries.length} items haven't been accessed in 30+ days.`);
    }

    return recommendations;
  }

  /**
   * Clear all data for a specific category
   */
  clearCategory(category: string): number {
    const entries = this.analyzeStorage();
    let freedSpace = 0;

    for (const entry of entries) {
      if (entry.category === category) {
        this.removeItem(entry.key);
        freedSpace += entry.size;
      }
    }

    console.log(`Cleared category '${category}': ${(freedSpace / 1024).toFixed(2)} KB freed`);
    return freedSpace;
  }

  /**
   * Export all localStorage data
   */
  exportData(): string {
    const data: Record<string, any> = {};
    
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && !key.startsWith('__meta_')) {
        data[key] = this.getItem(key);
      }
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import localStorage data
   */
  importData(jsonData: string): boolean {
    try {
      const data = safeParse(jsonData);
      
      for (const [key, value] of Object.entries(data)) {
        this.setItem(key, typeof value === 'string' ? value : safeStringify(value));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const localStorageManager = LocalStorageManager.getInstance();

// Export convenience functions
export const safeSaveToStorage = (key: string, value: any, options?: { compress?: boolean; ttl?: number }) => {
  const stringValue = typeof value === 'string' ? value : safeStringify(value);
  return localStorageManager.setItem(key, stringValue, options);
};

export const safeGetFromStorage = <T = any>(key: string): T | null => {
  const value = localStorageManager.getItem(key);
  if (!value) return null;
  
  try {
    return safeParse(value) as T;
  } catch {
    return value as any;
  }
};

export const analyzeStorageUsage = () => localStorageManager.analyzeStorage();
export const getStorageHealth = () => localStorageManager.getHealthReport();
export const performStorageCleanup = () => localStorageManager.performCleanup();
export const clearStorageCategory = (category: string) => localStorageManager.clearCategory(category);