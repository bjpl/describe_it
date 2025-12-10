/**
 * DescriptionRepository - Data Access Layer for Image Descriptions
 *
 * Handles all database operations related to image descriptions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type {
  Description,
  DescriptionInsert,
  DescriptionUpdate,
  ApiResponse,
  DescriptionStyle,
} from '../types';

export interface DescriptionFilters {
  image_id?: string;
  user_id?: string;
  style?: DescriptionStyle;
  is_completed?: boolean;
}

export class DescriptionRepository extends BaseRepository<
  Description,
  DescriptionInsert,
  DescriptionUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, {
      tableName: 'descriptions',
      primaryKey: 'id',
    });
  }

  /**
   * Find descriptions by image ID
   */
  async findByImageId(imageId: string): Promise<ApiResponse<Description[]>> {
    return this.findAll({
      filters: { image_id: imageId },
      order_by: 'created_at',
      order: 'desc',
    });
  }

  /**
   * Find descriptions by user ID
   */
  async findByUserId(userId: string): Promise<ApiResponse<Description[]>> {
    return this.findAll({
      filters: { user_id: userId },
      order_by: 'created_at',
      order: 'desc',
    });
  }

  /**
   * Find description by image ID and style
   */
  async findByImageAndStyle(
    imageId: string,
    style: DescriptionStyle
  ): Promise<ApiResponse<Description | null>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('image_id', imageId)
        .eq('style', style)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: data as Description | null,
        error: undefined,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Find all completed descriptions
   */
  async findCompleted(userId?: string): Promise<ApiResponse<Description[]>> {
    const filters: DescriptionFilters = { is_completed: true };
    if (userId) {
      filters.user_id = userId;
    }

    return this.findAll({
      filters,
      order_by: 'completed_at',
      order: 'desc',
    });
  }

  /**
   * Mark description as completed
   */
  async markCompleted(
    id: string,
    completionTimeSeconds?: number,
    rating?: number
  ): Promise<ApiResponse<Description>> {
    const updates: DescriptionUpdate = {
      is_completed: true,
      completed_at: new Date().toISOString(),
    };

    if (completionTimeSeconds !== undefined) {
      updates.completion_time_seconds = completionTimeSeconds;
    }

    if (rating !== undefined) {
      updates.user_rating = rating;
    }

    return this.update(id, updates);
  }

  /**
   * Get description statistics for a user
   */
  async getUserStats(userId: string): Promise<ApiResponse<{
    total: number;
    completed: number;
    by_style: Record<DescriptionStyle, number>;
    average_rating: number;
    average_completion_time: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return this.handleDatabaseError(error);
      }

      const descriptions = (data as Description[]) || [];

      const stats = {
        total: descriptions.length,
        completed: descriptions.filter(d => d.is_completed).length,
        by_style: {
          narrativo: 0,
          poetico: 0,
          academico: 0,
          conversacional: 0,
          infantil: 0,
        } as Record<DescriptionStyle, number>,
        average_rating: 0,
        average_completion_time: 0,
      };

      let totalRating = 0;
      let ratedCount = 0;
      let totalTime = 0;
      let timedCount = 0;

      descriptions.forEach(desc => {
        stats.by_style[desc.style]++;

        if (desc.user_rating) {
          totalRating += desc.user_rating;
          ratedCount++;
        }

        if (desc.completion_time_seconds) {
          totalTime += desc.completion_time_seconds;
          timedCount++;
        }
      });

      stats.average_rating = ratedCount > 0 ? totalRating / ratedCount : 0;
      stats.average_completion_time = timedCount > 0 ? totalTime / timedCount : 0;

      return {
        success: true,
        data: stats,
        error: undefined,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}
