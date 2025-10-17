/**
 * API Client Utilities
 * Centralized API calls with error handling and type safety
 */

import { logger } from './logger';
import type {
  VocabularyList,
  VocabularyItem,
  UserProgress,
  StudySession,
  DescriptionRecord,
  QAResponse,
  UserSettings
} from '@/types/database';

const API_BASE_URL = '/api';

interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

export class APIClient {
  /**
   * Generic fetch wrapper with error handling
   */
  private static async fetcher<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ data: T | null; error: APIError | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data?.message || data?.error || `Request failed with status ${response.status}`,
            code: data?.code,
            details: data,
          },
        };
      }

      return { data: data?.data || data, error: null };
    } catch (error) {
      logger.error('API request failed:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error,
        },
      };
    }
  }

  // Vocabulary API
  static async getVocabularyLists(userId?: string) {
    const query = userId ? `?userId=${userId}` : '';
    return this.fetcher<VocabularyList[]>(`/vocabulary/lists${query}`);
  }

  static async createVocabularyList(data: {
    name: string;
    description?: string;
    user_id?: string;
  }) {
    return this.fetcher<VocabularyList>('/vocabulary/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async saveVocabularyItems(
    listId: string,
    items: Omit<VocabularyItem, 'id' | 'created_at'>[]
  ) {
    return this.fetcher<VocabularyItem[]>('/vocabulary/save', {
      method: 'POST',
      body: JSON.stringify({ listId, items }),
    });
  }

  static async saveVocabularyItem(item: Partial<VocabularyItem>) {
    return this.fetcher<VocabularyItem>('/vocabulary/save', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  static async getVocabularyItems(listId: string) {
    return this.fetcher<VocabularyItem[]>(`/vocabulary/items?listId=${listId}`);
  }

  // Progress API
  static async getUserProgress(userId: string, limit: number = 50, offset: number = 0) {
    return this.fetcher<UserProgress[]>(`/progress?limit=${limit}&offset=${offset}`);
  }

  static async getProgressStats(userId: string) {
    return this.fetcher<{
      total_sessions: number;
      total_descriptions: number;
      total_points: number;
      completion_rate: number;
      accuracy_rate: number;
      vocabulary_mastered: number;
      streak_current: number;
      streak_longest: number;
      this_week: {
        points: number;
        sessions: number;
        accuracy: number;
      };
      achievements: string[];
      improvement_trend: "improving" | "stable" | "declining";
      next_milestones: Record<string, any>;
    }>(`/progress/stats?userId=${userId}`);
  }

  static async getStreakInfo(userId: string) {
    return this.fetcher<{
      current: number;
      longest: number;
      today_completed: boolean;
    }>(`/progress/streak?userId=${userId}`);
  }

  static async getLearningAnalytics(userId: string) {
    return this.fetcher<{
      skill_breakdown: Record<string, number>;
      recent_activity: {
        sessions_last_week: number;
        descriptions_completed: number;
        new_phrases_learned: number;
      };
      recommendations: {
        focus_areas: string[];
      };
    }>(`/progress/analytics?userId=${userId}`);
  }

  static async updateProgressStats(
    type: "session" | "description" | "phrase" | "quiz",
    result?: any
  ) {
    return this.fetcher<{ success: boolean }>('/progress/update', {
      method: 'POST',
      body: JSON.stringify({ type, result }),
    });
  }

  // Sessions API
  static async getUserSessions(userId: string, limit: number = 20) {
    return this.fetcher<StudySession[]>(`/sessions?userId=${userId}&limit=${limit}`);
  }

  static async createSession(sessionData: Omit<StudySession, 'id' | 'created_at'>) {
    return this.fetcher<StudySession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  static async endSession(sessionId: string, endData: Partial<StudySession>) {
    return this.fetcher<StudySession>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(endData),
    });
  }

  // Descriptions API
  static async getSavedDescriptions(userId?: string, limit: number = 20) {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    query.append('limit', limit.toString());

    return this.fetcher<DescriptionRecord[]>(`/descriptions/saved?${query}`);
  }

  static async saveDescription(
    descriptionData: Omit<DescriptionRecord, 'id' | 'created_at' | 'updated_at'>
  ) {
    return this.fetcher<DescriptionRecord>('/descriptions/save', {
      method: 'POST',
      body: JSON.stringify(descriptionData),
    });
  }

  static async updateDescription(
    descriptionId: string,
    updates: Partial<DescriptionRecord>
  ) {
    return this.fetcher<DescriptionRecord>(`/descriptions/${descriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  static async toggleFavoriteDescription(descriptionId: string, isFavorite: boolean) {
    return this.fetcher<{ success: boolean }>(`/descriptions/${descriptionId}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ isFavorite }),
    });
  }

  static async generateDescription(
    imageUrl: string,
    style: string,
    language: string,
    maxLength: number = 200
  ) {
    return this.fetcher<{ text: string }>('/descriptions/generate', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, style, language, maxLength }),
    });
  }

  // Q&A API
  static async saveQAResponse(responseData: Partial<QAResponse>) {
    return this.fetcher<QAResponse>('/qa/save', {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  }

  static async getQAResponses(userId?: string, limit: number = 20) {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    query.append('limit', limit.toString());

    return this.fetcher<QAResponse[]>(`/qa/responses?${query}`);
  }

  // User Settings API
  static async getUserSettings(userId: string) {
    return this.fetcher<UserSettings>(`/users/${userId}/settings`);
  }

  static async updateUserSettings(userId: string, settings: Partial<UserSettings>) {
    return this.fetcher<UserSettings>(`/users/${userId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Learning Progress Updates
  static async updateLearningProgress(
    userId: string,
    vocabularyItemId: string,
    progressData: Partial<UserProgress>
  ) {
    return this.fetcher<UserProgress>('/progress/update', {
      method: 'POST',
      body: JSON.stringify({ userId, vocabularyItemId, ...progressData }),
    });
  }

  // Health Check
  static async healthCheck() {
    return this.fetcher<{ status: string }>('/health');
  }
}

export default APIClient;
