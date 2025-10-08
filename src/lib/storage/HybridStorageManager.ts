/**
 * Hybrid Storage Manager
 * Intelligently uses localStorage for temporary data and Supabase for persistent storage
 */

import { supabase, DatabaseService } from '../supabase';
import type { ImageInsert, Image as SupabaseImage } from '../supabase/types';
import { localStorageManager } from './LocalStorageManager';
import { logger } from '../logger';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface StorageStrategy {
  type: 'local' | 'supabase' | 'hybrid';
  localFields?: string[];
  supabaseFields?: string[];
  syncInterval?: number;
}

interface ImageHistoryEntry {
  id: string;
  user_id?: string;
  image_url: string;
  thumbnail_url?: string;
  description?: string;
  tags?: string[];
  source: 'unsplash' | 'upload' | 'generated';
  metadata?: Record<string, any>;
  viewed_at: string;
  is_favorite?: boolean;
}

interface StorageMetrics {
  localStorageUsed: number;
  supabaseRecords: number;
  syncPending: number;
  lastSyncTime?: Date;
}

class HybridStorageManager {
  private static instance: HybridStorageManager;
  private syncQueue: Map<string, any> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  // Define storage strategies for different data types
  private readonly STORAGE_STRATEGIES: Record<string, StorageStrategy> = {
    'api-keys': {
      type: 'local', // API keys stay local for security and speed
    },
    'ui-settings': {
      type: 'hybrid',
      localFields: ['theme', 'sidebar', 'layout'], // Quick access
      supabaseFields: ['preferences', 'customization'], // Sync across devices
    },
    'image-history': {
      type: 'local', // Store locally - Supabase images table doesn't have required fields
    },
    'vocabulary': {
      type: 'supabase', // Learning data needs persistence
    },
    'descriptions': {
      type: 'supabase', // User-generated content
    },
    'error-logs': {
      type: 'hybrid',
      localFields: ['recent'], // Keep last 10 errors locally
      supabaseFields: ['all'], // Store all in Supabase with cleanup
    },
    'search-cache': {
      type: 'local', // Temporary cache only
    },
  };

  private constructor() {
    this.setupOnlineListener();
    this.startSyncInterval();
  }

  static getInstance(): HybridStorageManager {
    if (!HybridStorageManager.instance) {
      HybridStorageManager.instance = new HybridStorageManager();
    }
    return HybridStorageManager.instance;
  }

  /**
   * Save data using appropriate storage strategy
   */
  async save(category: string, key: string, data: any): Promise<boolean> {
    const strategy = this.STORAGE_STRATEGIES[category] || { type: 'local' };

    try {
      switch (strategy.type) {
        case 'local':
          return this.saveToLocal(key, data);
        
        case 'supabase':
          return await this.saveToSupabase(category, key, data);
        
        case 'hybrid':
          return await this.saveHybrid(category, key, data, strategy);
        
        default:
          return this.saveToLocal(key, data);
      }
    } catch (error) {
      logger.error(`Failed to save ${category}/${key}`, error as Error);
      return false;
    }
  }

  /**
   * Load data using appropriate storage strategy
   */
  async load<T = any>(category: string, key: string): Promise<T | null> {
    const strategy = this.STORAGE_STRATEGIES[category] || { type: 'local' };

    try {
      switch (strategy.type) {
        case 'local':
          return this.loadFromLocal<T>(key);
        
        case 'supabase':
          return await this.loadFromSupabase<T>(category, key);
        
        case 'hybrid':
          return await this.loadHybrid<T>(category, key, strategy);
        
        default:
          return this.loadFromLocal<T>(key);
      }
    } catch (error) {
      logger.error(`Failed to load ${category}/${key}`, error as Error);
      return null;
    }
  }

  /**
   * Save to localStorage only
   */
  private saveToLocal(key: string, data: any): boolean {
    return localStorageManager.setItem(
      key,
      JSON.stringify(data),
      { compress: JSON.stringify(data).length > 5000 }
    );
  }

  /**
   * Load from localStorage only
   */
  private loadFromLocal<T>(key: string): T | null {
    const data = localStorageManager.getItem(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as any;
    }
  }

  /**
   * Save to Supabase only
   */
  private async saveToSupabase(category: string, key: string, data: any): Promise<boolean> {
    if (!this.isOnline) {
      // Queue for later sync
      this.syncQueue.set(`${category}:${key}`, data);
      return this.saveToLocal(`__sync_${category}_${key}`, data);
    }

    try {
      switch (category) {
        case 'image-history':
          return await this.saveImageHistory(data);
        
        case 'vocabulary':
          return await this.saveVocabulary(data);
        
        case 'descriptions':
          return await this.saveDescription(data);
        
        default:
          // For unrecognized categories, fall back to localStorage only
          logger.warn(`Unknown category "${category}", saving to localStorage only`);
          return this.saveToLocal(`${category}_${key}`, data);
      }
    } catch (error) {
      logger.error('Supabase save error:', error);
      // Fallback to localStorage
      this.syncQueue.set(`${category}:${key}`, data);
      return this.saveToLocal(`__sync_${category}_${key}`, data);
    }
  }

  /**
   * Load from Supabase only
   */
  private async loadFromSupabase<T>(category: string, key: string): Promise<T | null> {
    if (!this.isOnline) {
      // Try to load from sync cache
      return this.loadFromLocal<T>(`__sync_${category}_${key}`);
    }

    try {
      switch (category) {
        case 'image-history':
          return await this.loadImageHistory() as any;
        
        case 'vocabulary':
          return await this.loadVocabulary() as any;
        
        case 'descriptions':
          return await this.loadDescriptions() as any;
        
        default:
          // For unrecognized categories, try localStorage only
          logger.warn(`Unknown category "${category}", loading from localStorage only`);
          return this.loadFromLocal<T>(`${category}_${key}`);
      }
    } catch (error) {
      logger.error('Supabase load error:', error);
      // Fallback to localStorage cache
      return this.loadFromLocal<T>(`__sync_${category}_${key}`);
    }
  }

  /**
   * Hybrid save - split between local and Supabase
   */
  private async saveHybrid(
    category: string,
    key: string,
    data: any,
    strategy: StorageStrategy
  ): Promise<boolean> {
    const localData: any = {};
    const supabaseData: any = {};

    // Split data based on strategy
    if (strategy.localFields) {
      strategy.localFields.forEach(field => {
        if (data[field] !== undefined) {
          localData[field] = data[field];
        }
      });
    }

    if (strategy.supabaseFields) {
      strategy.supabaseFields.forEach(field => {
        if (data[field] !== undefined) {
          supabaseData[field] = data[field];
        }
      });
    }

    // Save to both storages
    const localSuccess = Object.keys(localData).length > 0
      ? this.saveToLocal(`${category}_${key}`, localData)
      : true;
    
    const supabaseSuccess = Object.keys(supabaseData).length > 0
      ? await this.saveToSupabase(category, key, supabaseData)
      : true;

    return localSuccess && supabaseSuccess;
  }

  /**
   * Hybrid load - merge from local and Supabase
   */
  private async loadHybrid<T>(
    category: string,
    key: string,
    strategy: StorageStrategy
  ): Promise<T | null> {
    const localData = this.loadFromLocal<any>(`${category}_${key}`) || {};
    const supabaseData = await this.loadFromSupabase<any>(category, key) || {};

    // Merge data with Supabase taking precedence for shared fields
    return { ...localData, ...supabaseData } as T;
  }

  /**
   * Save image history to localStorage
   * Note: Supabase images table doesn't have required fields (user_id, tags, source, etc.)
   * so we store this data locally only
   */
  private async saveImageHistory(entry: ImageHistoryEntry): Promise<boolean> {
    try {
      // Store in localStorage
      const recentKey = 'recent_images';
      const recent = this.loadFromLocal<ImageHistoryEntry[]>(recentKey) || [];
      recent.unshift(entry);
      return this.saveToLocal(recentKey, recent.slice(0, 50)); // Keep last 50
    } catch (error) {
      logger.error('Failed to save image history:', error);
      return false;
    }
  }

  /**
   * Load image history from localStorage
   * Note: Supabase images table doesn't have required fields for history tracking
   */
  private async loadImageHistory(limit: number = 50): Promise<ImageHistoryEntry[]> {
    try {
      const recent = this.loadFromLocal<ImageHistoryEntry[]>('recent_images') || [];
      return recent.slice(0, limit);
    } catch (error) {
      logger.error('Failed to load image history:', error);
      return [];
    }
  }

  /**
   * Save vocabulary to Supabase
   */
  private async saveVocabulary(item: any): Promise<boolean> {
    const result = await DatabaseService.addVocabularyItem(item);
    return result !== null;
  }

  /**
   * Load vocabulary from Supabase
   */
  private async loadVocabulary(): Promise<any[]> {
    return await DatabaseService.getVocabularyItems('default');
  }

  /**
   * Save description to Supabase
   */
  private async saveDescription(description: any): Promise<boolean> {
    const result = await DatabaseService.saveDescription(description);
    return result !== null;
  }

  /**
   * Load descriptions from Supabase
   */
  private async loadDescriptions(): Promise<any[]> {
    return await DatabaseService.getSavedDescriptions();
  }

  /**
   * Setup online/offline listener
   */
  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;
  }

  /**
   * Start sync interval for pending data
   */
  private startSyncInterval(): void {
    if (typeof window === 'undefined') return;

    // Sync every 30 seconds if online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.size > 0) {
        this.syncPendingData();
      }
    }, 30000);
  }

  /**
   * Sync pending data to Supabase
   */
  private async syncPendingData(): Promise<void> {
    if (this.syncQueue.size === 0) return;

    logger.info(`Syncing ${this.syncQueue.size} pending items to Supabase...`);

    for (const [fullKey, data] of this.syncQueue.entries()) {
      const [category, key] = fullKey.split(':');
      
      try {
        const success = await this.saveToSupabase(category, key, data);
        if (success) {
          this.syncQueue.delete(fullKey);
          // Remove from localStorage sync cache
          localStorageManager.removeItem(`__sync_${category}_${key}`);
        }
      } catch (error) {
        logger.error(`Failed to sync ${fullKey}:`, error);
      }
    }
  }

  /**
   * Get storage metrics
   */
  async getMetrics(): Promise<StorageMetrics> {
    const localUsage = await localStorageManager.getQuota();
    
    // Count Supabase records (simplified)
    let supabaseCount = 0;
    try {
      const { count: descCount } = await supabase
        .from('descriptions')
        .select('*', { count: 'exact', head: true });

      supabaseCount = descCount || 0;
    } catch (error) {
      logger.error('Failed to get Supabase metrics:', error);
    }

    return {
      localStorageUsed: localUsage.used,
      supabaseRecords: supabaseCount,
      syncPending: this.syncQueue.size,
      lastSyncTime: new Date()
    };
  }

  /**
   * Clear data by category
   */
  async clearCategory(category: string): Promise<boolean> {
    const strategy = this.STORAGE_STRATEGIES[category];
    
    try {
      // Clear from localStorage
      localStorageManager.clearCategory(category);
      
      // Clear from Supabase if needed
      if (strategy?.type === 'supabase' || strategy?.type === 'hybrid') {
        switch (category) {
          case 'image-history':
            // Clear from localStorage
            localStorageManager.removeItem('recent_images');
            break;
          
          case 'error-logs':
            // Error logs table does not exist in current schema
            // Just clear from localStorage
            logger.warn('error_logs table does not exist in current schema');
            break;
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to clear category ${category}:`, error);
      return false;
    }
  }

  /**
   * Cleanup old data
   */
  async performCleanup(): Promise<void> {
    // Clean localStorage
    localStorageManager.performCleanup();

    // Clean old image history from localStorage (> 30 days)
    try {
      const recent = this.loadFromLocal<ImageHistoryEntry[]>('recent_images') || [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const filtered = recent.filter(entry => {
        const viewedDate = new Date(entry.viewed_at);
        return viewedDate > thirtyDaysAgo || entry.is_favorite;
      });

      if (filtered.length !== recent.length) {
        this.saveToLocal('recent_images', filtered);
        logger.info(`Cleaned ${recent.length - filtered.length} old image history entries`);
      }
    } catch (error) {
      logger.error('Image history cleanup failed:', error);
    }
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    localStorageManager.destroy();
  }
}

// Export singleton instance
export const hybridStorage = HybridStorageManager.getInstance();

// Export convenience functions
export const saveData = (category: string, key: string, data: any) => 
  hybridStorage.save(category, key, data);

export const loadData = <T = any>(category: string, key: string) => 
  hybridStorage.load<T>(category, key);

export const getStorageMetrics = () => hybridStorage.getMetrics();
export const clearStorageCategory = (category: string) => hybridStorage.clearCategory(category);
export const performCleanup = () => hybridStorage.performCleanup();