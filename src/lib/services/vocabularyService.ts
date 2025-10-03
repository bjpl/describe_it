/**
 * VocabularyService - Complete Supabase Database Integration
 *
 * Provides full CRUD operations for vocabulary items and lists with:
 * - Database integration using Supabase client
 * - Caching for improved performance
 * - Comprehensive error handling
 * - Analytics and statistics methods
 * - Batch operations support
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/types';
import type {
  VocabularyFilters,
  VocabularyStats
} from '@/types/comprehensive';

// Type aliases from generated database schema
type VocabularyItem = Database['public']['Tables']['vocabulary_items']['Row'];
type VocabularyItemInsert = Database['public']['Tables']['vocabulary_items']['Insert'];
type VocabularyItemUpdate = Database['public']['Tables']['vocabulary_items']['Update'];
type VocabularyList = Database['public']['Tables']['vocabulary_lists']['Row'];
type VocabularyListInsert = Database['public']['Tables']['vocabulary_lists']['Insert'];
type LearningProgress = Database['public']['Tables']['learning_progress']['Row'];

// Service error types
class VocabularyServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'VocabularyServiceError';
  }
}

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

/**
 * VocabularyService - Main service class
 */
class VocabularyService {
  private cache = new CacheManager();

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('vocabulary_items')
        .select('id')
        .limit(1);

      if (error) throw error;
      logger.info('[VocabularyService] Database connection successful');
      return true;
    } catch (error) {
      logger.error('[VocabularyService] Database connection failed:', error);
      return false;
    }
  }

  /**
   * Get all vocabulary items with optional filters
   */
  async getAllVocabulary(
    filters?: VocabularyFilters,
    options?: { useCache?: boolean }
  ): Promise<VocabularyItem[]> {
    try {
      const cacheKey = `vocab:all:${JSON.stringify(filters || {})}`;

      // Check cache
      if (options?.useCache) {
        const cached = this.cache.get<VocabularyItem[]>(cacheKey);
        if (cached) {
          logger.info('[VocabularyService] Returning cached vocabulary items');
          return cached;
        }
      }

      // Build query
      let query = supabase.from('vocabulary_items').select('*');

      // Apply filters
      if (filters) {
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.difficulty_level) {
          query = query.eq('difficulty_level', filters.difficulty_level);
        }
        if (filters.part_of_speech) {
          query = query.eq('part_of_speech', filters.part_of_speech);
        }
        if (filters.frequency_min !== undefined) {
          query = query.gte('frequency_score', filters.frequency_min);
        }
        if (filters.frequency_max !== undefined) {
          query = query.lte('frequency_score', filters.frequency_max);
        }
      }

      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new VocabularyServiceError(
          'Failed to fetch vocabulary items',
          'FETCH_ERROR',
          error
        );
      }

      // Cache results
      if (options?.useCache && data) {
        this.cache.set(cacheKey, data);
      }

      logger.info(`[VocabularyService] Fetched ${data?.length || 0} vocabulary items`);
      return data || [];
    } catch (error) {
      logger.error('[VocabularyService] Error in getAllVocabulary:', error);
      throw error;
    }
  }

  /**
   * Get vocabulary items by category
   */
  async getVocabularyByCategory(category: string): Promise<VocabularyItem[]> {
    try {
      const { data, error } = await supabase
        .from('vocabulary_items')
        .select('*')
        .eq('category', category)
        .order('frequency_score', { ascending: false });

      if (error) {
        throw new VocabularyServiceError(
          `Failed to fetch vocabulary for category: ${category}`,
          'CATEGORY_FETCH_ERROR',
          error
        );
      }

      logger.info(`[VocabularyService] Fetched ${data?.length || 0} items for category: ${category}`);
      return data || [];
    } catch (error) {
      logger.error('[VocabularyService] Error in getVocabularyByCategory:', error);
      throw error;
    }
  }

  /**
   * Search vocabulary with full-text search
   */
  async searchVocabulary(query: string): Promise<VocabularyItem[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = `%${query.toLowerCase()}%`;

      const { data, error } = await supabase
        .from('vocabulary_items')
        .select('*')
        .or(`spanish_text.ilike.${searchTerm},english_translation.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .order('frequency_score', { ascending: false })
        .limit(50);

      if (error) {
        throw new VocabularyServiceError(
          'Search failed',
          'SEARCH_ERROR',
          error
        );
      }

      logger.info(`[VocabularyService] Search for "${query}" returned ${data?.length || 0} results`);
      return data || [];
    } catch (error) {
      logger.error('[VocabularyService] Error in searchVocabulary:', error);
      throw error;
    }
  }

  /**
   * Add a single vocabulary item
   */
  async addVocabulary(
    itemData: VocabularyItemInsert
  ): Promise<VocabularyItem> {
    try {
      // Validate required fields
      if (!itemData.spanish_text || !itemData.english_translation) {
        throw new VocabularyServiceError(
          'Spanish text and English translation are required',
          'VALIDATION_ERROR'
        );
      }

      const { data, error } = await supabase
        .from('vocabulary_items')
        .insert([itemData])
        .select()
        .single();

      if (error) {
        throw new VocabularyServiceError(
          'Failed to add vocabulary item',
          'INSERT_ERROR',
          error
        );
      }

      // Invalidate cache
      this.cache.invalidate('vocab:');

      logger.info(`[VocabularyService] Added vocabulary item: ${data.spanish_text}`);
      return data;
    } catch (error) {
      logger.error('[VocabularyService] Error in addVocabulary:', error);
      throw error;
    }
  }

  /**
   * Add multiple vocabulary items (batch operation)
   */
  async addVocabularyList(
    items: VocabularyItemInsert[]
  ): Promise<VocabularyItem[]> {
    try {
      if (!items || items.length === 0) {
        throw new VocabularyServiceError(
          'No items provided',
          'VALIDATION_ERROR'
        );
      }

      // Validate all items
      items.forEach((item, index) => {
        if (!item.spanish_text || !item.english_translation) {
          throw new VocabularyServiceError(
            `Item at index ${index} missing required fields`,
            'VALIDATION_ERROR'
          );
        }
      });

      const { data, error } = await supabase
        .from('vocabulary_items')
        .insert(items)
        .select();

      if (error) {
        throw new VocabularyServiceError(
          'Failed to add vocabulary items',
          'BATCH_INSERT_ERROR',
          error
        );
      }

      // Invalidate cache
      this.cache.invalidate('vocab:');

      logger.info(`[VocabularyService] Added ${data?.length || 0} vocabulary items`);
      return data || [];
    } catch (error) {
      logger.error('[VocabularyService] Error in addVocabularyList:', error);
      throw error;
    }
  }

  /**
   * Update a vocabulary item
   */
  async updateVocabulary(
    id: string,
    updates: VocabularyItemUpdate
  ): Promise<VocabularyItem> {
    try {
      const { data, error } = await supabase
        .from('vocabulary_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new VocabularyServiceError(
          'Failed to update vocabulary item',
          'UPDATE_ERROR',
          error
        );
      }

      // Invalidate cache
      this.cache.invalidate('vocab:');

      logger.info(`[VocabularyService] Updated vocabulary item: ${id}`);
      return data;
    } catch (error) {
      logger.error('[VocabularyService] Error in updateVocabulary:', error);
      throw error;
    }
  }

  /**
   * Delete a vocabulary item (soft delete recommended)
   */
  async deleteVocabulary(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('vocabulary_items')
        .delete()
        .eq('id', id);

      if (error) {
        throw new VocabularyServiceError(
          'Failed to delete vocabulary item',
          'DELETE_ERROR',
          error
        );
      }

      // Invalidate cache
      this.cache.invalidate('vocab:');

      logger.info(`[VocabularyService] Deleted vocabulary item: ${id}`);
      return true;
    } catch (error) {
      logger.error('[VocabularyService] Error in deleteVocabulary:', error);
      throw error;
    }
  }

  /**
   * Get vocabulary statistics
   */
  async getVocabularyStats(userId?: string): Promise<VocabularyStats> {
    try {
      const cacheKey = `vocab:stats:${userId || 'global'}`;
      const cached = this.cache.get<VocabularyStats>(cacheKey);
      if (cached) return cached;

      // Get all vocabulary items
      const { data: allItems, error: itemsError } = await supabase
        .from('vocabulary_items')
        .select('*');

      if (itemsError) throw itemsError;

      // Get learning progress if user provided
      let progressData: LearningProgress[] = [];
      if (userId) {
        const { data, error } = await supabase
          .from('learning_progress')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;
        progressData = data || [];
      }

      // Calculate statistics
      const stats: VocabularyStats = {
        total_words: allItems?.length || 0,
        mastered_words: progressData.filter(p => p.learning_phase === 'mastered').length,
        learning_words: progressData.filter(p => p.learning_phase === 'learning').length,
        new_words: progressData.filter(p => p.learning_phase === 'new').length,
        by_category: {},
        by_difficulty: {},
        by_part_of_speech: {},
        mastery_distribution: {
          'new': 0,
          'learning': 0,
          'review': 0,
          'mastered': 0,
        },
      };

      // Count by category
      allItems?.forEach(item => {
        const category = item.category || 'uncategorized';
        stats.by_category[category] = (stats.by_category[category] || 0) + 1;
      });

      // Count by difficulty
      allItems?.forEach(item => {
        const difficulty = item.difficulty_level;
        stats.by_difficulty[difficulty] = (stats.by_difficulty[difficulty] || 0) + 1;
      });

      // Count by part of speech
      allItems?.forEach(item => {
        const pos = item.part_of_speech;
        stats.by_part_of_speech[pos] = (stats.by_part_of_speech[pos] || 0) + 1;
      });

      // Count mastery distribution
      progressData.forEach(progress => {
        const phase = progress.learning_phase;
        stats.mastery_distribution[phase] = (stats.mastery_distribution[phase] || 0) + 1;
      });

      // Cache results
      this.cache.set(cacheKey, stats, 10 * 60 * 1000); // 10 minutes

      logger.info('[VocabularyService] Calculated vocabulary statistics');
      return stats;
    } catch (error) {
      logger.error('[VocabularyService] Error in getVocabularyStats:', error);
      throw error;
    }
  }

  /**
   * Get mastery progress for a user
   */
  async getMasteryProgress(userId: string): Promise<{
    overall_progress: number;
    by_category: Record<string, number>;
    recent_improvements: LearningProgress[];
  }> {
    try {
      const { data: progress, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new VocabularyServiceError(
          'Failed to fetch mastery progress',
          'PROGRESS_FETCH_ERROR',
          error
        );
      }

      const progressData = progress || [];
      const totalItems = progressData.length;
      const masteredItems = progressData.filter(p => p.learning_phase === 'mastered').length;
      const overall_progress = totalItems > 0 ? (masteredItems / totalItems) * 100 : 0;

      // Recent improvements (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent_improvements = progressData
        .filter(p => new Date(p.updated_at) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10);

      logger.info(`[VocabularyService] Calculated mastery progress for user: ${userId}`);
      return {
        overall_progress,
        by_category: {}, // TODO: Calculate by category if vocabulary items have categories
        recent_improvements,
      };
    } catch (error) {
      logger.error('[VocabularyService] Error in getMasteryProgress:', error);
      throw error;
    }
  }

  /**
   * Get vocabulary lists
   */
  async getVocabularyLists(userId?: string): Promise<VocabularyList[]> {
    try {
      let query = supabase.from('vocabulary_lists').select('*');

      if (userId) {
        query = query.or(`created_by.eq.${userId},is_public.eq.true`);
      } else {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new VocabularyServiceError(
          'Failed to fetch vocabulary lists',
          'LIST_FETCH_ERROR',
          error
        );
      }

      logger.info(`[VocabularyService] Fetched ${data?.length || 0} vocabulary lists`);
      return data || [];
    } catch (error) {
      logger.error('[VocabularyService] Error in getVocabularyLists:', error);
      throw error;
    }
  }

  /**
   * Create a new vocabulary list
   */
  async createVocabularyList(
    listData: VocabularyListInsert
  ): Promise<VocabularyList> {
    try {
      const { data, error } = await supabase
        .from('vocabulary_lists')
        .insert([listData])
        .select()
        .single();

      if (error) {
        throw new VocabularyServiceError(
          'Failed to create vocabulary list',
          'LIST_CREATE_ERROR',
          error
        );
      }

      logger.info(`[VocabularyService] Created vocabulary list: ${data.name}`);
      return data;
    } catch (error) {
      logger.error('[VocabularyService] Error in createVocabularyList:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.invalidate();
    logger.info('[VocabularyService] Cache cleared');
  }
}

// Export singleton instance
export const vocabularyService = new VocabularyService();
export { VocabularyService, VocabularyServiceError };
export default vocabularyService;
