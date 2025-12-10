/**
 * SessionRepository - Data Access Layer for User Sessions
 *
 * Handles all database operations related to study/practice sessions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type {
  Session,
  SessionInsert,
  SessionUpdate,
  ApiResponse,
  SessionType,
  SessionStatus,
} from '../types';

export interface SessionFilters {
  user_id?: string;
  session_type?: SessionType;
  status?: SessionStatus;
  date_from?: string;
  date_to?: string;
}

export class SessionRepository extends BaseRepository<
  Session,
  SessionInsert,
  SessionUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, {
      tableName: 'sessions',
      primaryKey: 'id',
    });
  }

  /**
   * Find sessions by user ID
   */
  async findByUserId(userId: string): Promise<ApiResponse<Session[]>> {
    return this.findAll({
      filters: { user_id: userId },
      order_by: 'started_at',
      order: 'desc',
    });
  }

  /**
   * Find active session for user
   */
  async findActiveSession(userId: string): Promise<ApiResponse<Session | null>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: data as Session | null,
        error: undefined,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Find sessions by type
   */
  async findByType(
    sessionType: SessionType,
    userId?: string
  ): Promise<ApiResponse<Session[]>> {
    const filters: Record<string, any> = { session_type: sessionType };
    if (userId) {
      filters.user_id = userId;
    }

    return this.findAll({
      filters,
      order_by: 'started_at',
      order: 'desc',
    });
  }

  /**
   * Complete a session
   */
  async completeSession(
    id: string,
    data: {
      score?: number;
      session_data?: any;
    }
  ): Promise<ApiResponse<Session>> {
    const updates: SessionUpdate = {
      ...data,
      status: 'completed',
      ended_at: new Date().toISOString(),
    };

    return this.update(id, updates);
  }

  /**
   * Abandon a session
   */
  async abandonSession(id: string): Promise<ApiResponse<Session>> {
    return this.update(id, {
      status: 'abandoned',
      ended_at: new Date().toISOString(),
    });
  }

  /**
   * Get session statistics for a user
   */
  async getUserStats(
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<{
    total_sessions: number;
    completed_sessions: number;
    by_type: Record<SessionType, number>;
    average_score: number;
    total_duration: number;
  }>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      if (dateFrom) {
        query = query.gte('started_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('started_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        return this.handleDatabaseError(error);
      }

      const sessions = (data as Session[]) || [];

      const stats = {
        total_sessions: sessions.length,
        completed_sessions: sessions.filter(s => s.status === 'completed').length,
        by_type: {
          practice: 0,
          flashcards: 0,
          quiz: 0,
          matching: 0,
          writing: 0,
        } as Record<SessionType, number>,
        average_score: 0,
        total_duration: 0,
      };

      let totalScore = 0;
      let scoredCount = 0;

      sessions.forEach(session => {
        const sessionType = session.session_type as SessionType;
        stats.by_type[sessionType]++;

        if (session.score !== undefined && session.score !== null) {
          totalScore += session.score;
          scoredCount++;
        }

        if (session.duration_seconds) {
          stats.total_duration += session.duration_seconds;
        }
      });

      stats.average_score = scoredCount > 0 ? totalScore / scoredCount : 0;

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
   * Get recent sessions
   */
  async getRecentSessions(
    userId: string,
    limit: number = 10
  ): Promise<ApiResponse<Session[]>> {
    return this.findAll({
      filters: { user_id: userId },
      limit,
      order_by: 'started_at',
      order: 'desc',
    });
  }
}
