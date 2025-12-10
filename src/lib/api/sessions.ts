/**
 * Sessions API Client
 *
 * Type-safe API methods for learning session management with Result-based error handling.
 */

import { BaseApiClient } from './client-base';
import { Result } from './result';
import { API_ENDPOINTS, buildQueryString } from './endpoints';
import type { SessionType, SessionStatus } from '@/core/types/entities';
import type { PaginatedResponse, PaginationRequest } from '@/core/types/api';

/**
 * Session entity (matching database schema)
 */
export interface SessionEntity {
  id: string;
  user_id: string;
  session_type: SessionType;
  status: SessionStatus;
  started_at: string;
  completed_at?: string;
  total_items?: number;
  correct_answers?: number;
  incorrect_answers?: number;
  skipped_items?: number;
  time_spent_seconds?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Session list query parameters
 */
export interface SessionListParams extends PaginationRequest {
  user_id?: string;
  session_type?: SessionType;
  status?: SessionStatus;
  started_after?: string;
  started_before?: string;
  sort_by?: 'started_at' | 'completed_at' | 'time_spent_seconds';
  sort_order?: 'asc' | 'desc';
}

/**
 * Create session DTO
 */
export interface CreateSessionDTO {
  user_id: string;
  session_type: SessionType;
}

/**
 * Update session DTO
 */
export interface UpdateSessionDTO {
  total_items?: number;
  correct_answers?: number;
  incorrect_answers?: number;
  skipped_items?: number;
  time_spent_seconds?: number;
}

/**
 * Complete session DTO
 */
export interface CompleteSessionDTO {
  total_items: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_items?: number;
  time_spent_seconds: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;
  total_time_spent_seconds: number;
  average_accuracy: number;
  by_type: Record<SessionType, {
    count: number;
    average_accuracy: number;
    total_time_seconds: number;
  }>;
}

/**
 * Sessions API Client
 */
export class SessionsApi extends BaseApiClient {
  /**
   * List sessions with filtering and pagination
   */
  async list(params?: SessionListParams): Promise<Result<PaginatedResponse<SessionEntity>>> {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return this.request<PaginatedResponse<SessionEntity>>(
      `${API_ENDPOINTS.sessions.list}${queryString}`
    );
  }

  /**
   * Get single session by ID
   */
  async get(id: string): Promise<Result<SessionEntity>> {
    return this.request<SessionEntity>(API_ENDPOINTS.sessions.get(id));
  }

  /**
   * Create new session
   */
  async create(data: CreateSessionDTO): Promise<Result<SessionEntity>> {
    return this.request<SessionEntity>(API_ENDPOINTS.sessions.create, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update session progress
   */
  async update(id: string, data: UpdateSessionDTO): Promise<Result<SessionEntity>> {
    return this.request<SessionEntity>(API_ENDPOINTS.sessions.update(id), {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Complete session
   */
  async complete(id: string, data: CompleteSessionDTO): Promise<Result<SessionEntity>> {
    return this.request<SessionEntity>(API_ENDPOINTS.sessions.complete(id), {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Abandon session
   */
  async abandon(id: string): Promise<Result<SessionEntity>> {
    return this.request<SessionEntity>(API_ENDPOINTS.sessions.abandon(id), {
      method: 'POST',
    });
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<Result<SessionEntity[]>> {
    const queryString = buildQueryString({ user_id: userId } as Record<string, unknown>);
    return this.request<SessionEntity[]>(
      `${API_ENDPOINTS.sessions.active}${queryString}`
    );
  }

  /**
   * Get session statistics for a user
   */
  async getStats(userId: string): Promise<Result<SessionStats>> {
    const queryString = buildQueryString({ user_id: userId } as Record<string, unknown>);
    return this.request<SessionStats>(
      `${API_ENDPOINTS.progress.stats}${queryString}`
    );
  }
}
