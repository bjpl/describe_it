/**
 * VocabularyRepository - Data Access Layer for Vocabulary Items
 *
 * Handles all database operations related to vocabulary items.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type {
  VocabularyItem,
  ApiResponse,
  DifficultyLevel,
  VocabularyItemInsert,
  VocabularyItemUpdate,
} from '../types';

export interface VocabularySearchFilters {
  search?: string;
  category?: string;
  difficulty_level?: number | DifficultyLevel;
  part_of_speech?: string;
  mastery_level?: number;
  has_audio?: boolean;
  has_context?: boolean;
  user_id?: string;
}

export class VocabularyRepository extends BaseRepository<
  VocabularyItem,
  VocabularyItemInsert,
  VocabularyItemUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, {
      tableName: 'vocabulary_items',
      primaryKey: 'id',
    });
  }

  /**
   * Search vocabulary items with advanced filtering
   */
  async search(filters: VocabularySearchFilters): Promise<ApiResponse<VocabularyItem[]>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Text search
      if (filters.search) {
        query = query.or(
          `spanish_text.ilike.%${filters.search}%,english_translation.ilike.%${filters.search}%`
        );
      }

      // Category filter
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Difficulty filter
      if (filters.difficulty_level !== undefined) {
        if (typeof filters.difficulty_level === 'number') {
          query = query.eq('difficulty_level', filters.difficulty_level);
        } else {
          // Convert string difficulty to number range
          const ranges: Record<DifficultyLevel, [number, number]> = {
            beginner: [1, 3],
            intermediate: [4, 7],
            advanced: [8, 10],
          };
          const [min, max] = ranges[filters.difficulty_level];
          query = query.gte('difficulty_level', min).lte('difficulty_level', max);
        }
      }

      // Part of speech filter
      if (filters.part_of_speech) {
        query = query.eq('part_of_speech', filters.part_of_speech);
      }

      // Mastery level filter
      if (filters.mastery_level !== undefined) {
        query = query.gte('mastery_level', filters.mastery_level);
      }

      // Audio availability filter
      if (filters.has_audio) {
        query = query.not('audio_url', 'is', null);
      }

      // Context availability filter
      if (filters.has_context) {
        query = query.not('context_sentence_spanish', 'is', null);
      }

      // User filter
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      const { data, error, count } = await query;

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: (data as VocabularyItem[]) || [],
        error: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          pagination: {
            total: count || 0,
            page: 1,
            limit: data?.length || 0,
            pages: 1,
            has_more: false,
            offset: 0,
          },
        },
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Find vocabulary items by category
   */
  async findByCategory(category: string): Promise<ApiResponse<VocabularyItem[]>> {
    return this.findAll({
      filters: { category },
      order_by: 'spanish_text',
      order: 'asc',
    });
  }

  /**
   * Find vocabulary items by difficulty level
   */
  async findByDifficulty(level: DifficultyLevel): Promise<ApiResponse<VocabularyItem[]>> {
    const ranges: Record<DifficultyLevel, [number, number]> = {
      beginner: [1, 3],
      intermediate: [4, 7],
      advanced: [8, 10],
    };
    const [min, max] = ranges[level];

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('difficulty_level', min)
        .lte('difficulty_level', max)
        .order('difficulty_level', { ascending: true });

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: (data as VocabularyItem[]) || [],
        error: undefined,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get vocabulary statistics
   */
  async getStats(userId?: string): Promise<ApiResponse<{
    total: number;
    by_category: Record<string, number>;
    by_difficulty: Record<DifficultyLevel, number>;
    by_part_of_speech: Record<string, number>;
    with_audio: number;
    with_context: number;
  }>> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        return this.handleDatabaseError(error);
      }

      const items = (data as VocabularyItem[]) || [];

      const stats = {
        total: items.length,
        by_category: {} as Record<string, number>,
        by_difficulty: {
          beginner: 0,
          intermediate: 0,
          advanced: 0,
        } as Record<DifficultyLevel, number>,
        by_part_of_speech: {} as Record<string, number>,
        with_audio: items.filter(item => item.audio_url).length,
        with_context: items.filter(item => item.context_sentence_spanish).length,
      };

      items.forEach(item => {
        // Category stats
        stats.by_category[item.category] = (stats.by_category[item.category] || 0) + 1;

        // Difficulty stats
        if (item.difficulty_level <= 3) {
          stats.by_difficulty.beginner++;
        } else if (item.difficulty_level <= 7) {
          stats.by_difficulty.intermediate++;
        } else {
          stats.by_difficulty.advanced++;
        }

        // Part of speech stats
        stats.by_part_of_speech[item.part_of_speech] =
          (stats.by_part_of_speech[item.part_of_speech] || 0) + 1;
      });

      return {
        success: true,
        data: stats,
        error: undefined,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Update user progress on vocabulary item
   */
  async updateProgress(
    id: string,
    progress: {
      mastery_level?: number;
      review_count?: number;
      last_reviewed?: string;
    }
  ): Promise<ApiResponse<VocabularyItem>> {
    return this.update(id, progress as VocabularyItemUpdate);
  }
}
