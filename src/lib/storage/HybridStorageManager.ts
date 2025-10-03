/**
 * Hybrid Storage Manager
 * Intelligently uses localStorage for temporary data and Supabase for persistent storage
 */

import { supabase, DatabaseService } from '../supabase';
import { localStorageManager } from './LocalStorageManager';
import { logger } from '../logger';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

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
      type: 'supabase', // Heavy data goes to Supabase
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
          // Generic save to a catch-all table
          const { error } = await supabase
            .from('user_data')
            .upsert({
              category,
              key,
              data: data,
              updated_at: new Date().toISOString()
            });
          
          return !error;
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
          // Generic load from catch-all table
          const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('category', category)
            .eq('key', key)
            .single();
          
          return error ? null : data?.data as T;
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
   * Save image history to Supabase
   */
  private async saveImageHistory(entry: ImageHistoryEntry): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('image_history')
        .insert({
          ...entry,
          viewed_at: entry.viewed_at || new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Keep only last 10 in localStorage for quick access
      const recentKey = 'recent_images';
      const recent = this.loadFromLocal<ImageHistoryEntry[]>(recentKey) || [];
      recent.unshift(entry);
      this.saveToLocal(recentKey, recent.slice(0, 10));
      
      return true;
    } catch (error) {
      logger.error('Failed to save image history:', error);
      return false;
    }
  }

  /**
   * Load image history from Supabase
   */
  private async loadImageHistory(limit: number = 50): Promise<ImageHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('image_history')
        .select('*')
        .order('viewed_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to load image history:', error);
      // Fallback to localStorage recent items
      return this.loadFromLocal<ImageHistoryEntry[]>('recent_images') || [];
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
      const { count: imageCount } = await supabase
        .from('image_history')
        .select('*', { count: 'exact', head: true });
      
      const { count: descCount } = await supabase
        .from('saved_descriptions')
        .select('*', { count: 'exact', head: true });
      
      supabaseCount = (imageCount || 0) + (descCount || 0);
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
            const { error: imgError } = await supabase
              .from('image_history')
              .delete()
              .match({ user_id: (await supabase.auth.getUser()).data.user?.id });
            if (imgError) throw imgError;
            break;
          
          case 'error-logs':
            // Keep only last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { error: logError } = await supabase
              .from('error_logs')
              .delete()
              .lt('created_at', sevenDaysAgo.toISOString());
            if (logError) throw logError;
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
    
    // Clean old Supabase data
    if (this.isOnline) {
      // Clean old image history (> 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      try {
        await supabase
          .from('image_history')
          .delete()
          .lt('viewed_at', thirtyDaysAgo.toISOString())
          .eq('is_favorite', false);
        
        logger.info('Cleaned old Supabase data');
      } catch (error) {
        logger.error('Supabase cleanup failed:', error);
      }
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