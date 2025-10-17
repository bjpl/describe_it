/**
 * Progress Tracking Database Integration Tests
 * Tests: Progress saves → Database queries → No localStorage → Analytics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from '@/lib/api-client';

global.fetch = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Progress Tracking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Progress API', () => {
    it('should fetch user progress successfully', async () => {
      const mockProgress = {
        total_points: 1250,
        completion_rate: 0.75,
        this_week: {
          sessions: 8,
          points: 320,
          accuracy: 0.82,
        },
        achievements: ['first_week', '100_words'],
        improvement_trend: 'improving',
        next_milestones: {
          '500_words': 50,
          'perfect_week': 2,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockProgress }),
      });

      const result = await APIClient.getUserProgress('user-123', 30);

      expect(result.data).toEqual(mockProgress);
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/progress?userId=user-123&daysBack=30',
        expect.any(Object)
      );
    });

    it('should fetch progress stats', async () => {
      const mockStats = {
        total_sessions: 45,
        total_time_minutes: 1350,
        vocabulary_mastered: 125,
        current_streak: 7,
        longest_streak: 14,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockStats }),
      });

      const result = await APIClient.getProgressStats('user-123');

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should fetch streak information', async () => {
      const mockStreak = {
        current: 7,
        longest: 14,
        today_completed: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockStreak }),
      });

      const result = await APIClient.getStreakInfo('user-123');

      expect(result.data).toEqual(mockStreak);
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/progress/streak?userId=user-123',
        expect.any(Object)
      );
    });
  });

  describe('Learning Progress Updates', () => {
    it('should update learning progress for vocabulary item', async () => {
      const progressData = {
        mastery_level: 75,
        review_count: 5,
        correct_count: 4,
        learning_phase: 'mastered',
      };

      const updatedProgress = {
        user_id: 'user-123',
        vocabulary_item_id: 'item-456',
        ...progressData,
        last_reviewed: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: updatedProgress }),
      });

      const result = await APIClient.updateLearningProgress(
        'user-123',
        'item-456',
        progressData
      );

      expect(result.data).toBeDefined();
      expect(result.data?.mastery_level).toBe(75);
      expect(result.error).toBeNull();
    });

    it('should handle progress updates for new items', async () => {
      const newItemProgress = {
        mastery_level: 0,
        review_count: 0,
        correct_count: 0,
        learning_phase: 'new',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            user_id: 'user-123',
            vocabulary_item_id: 'item-new',
            ...newItemProgress,
          },
        }),
      });

      const result = await APIClient.updateLearningProgress(
        'user-123',
        'item-new',
        newItemProgress
      );

      expect(result.data?.learning_phase).toBe('new');
      expect(result.data?.mastery_level).toBe(0);
    });
  });

  describe('Session Management', () => {
    it('should fetch user sessions', async () => {
      const mockSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        user_id: 'user-123',
        session_type: 'learning',
        duration_minutes: 30,
        images_processed: 5,
        qa_attempts: 10,
        qa_correct: 8,
        started_at: new Date().toISOString(),
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockSessions }),
      });

      const result = await APIClient.getUserSessions('user-123', 20);

      expect(result.data).toHaveLength(20);
      expect(result.error).toBeNull();
    });

    it('should create new session', async () => {
      const sessionData = {
        user_id: 'user-123',
        session_type: 'learning' as const,
      };

      const createdSession = {
        id: 'session-new',
        ...sessionData,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: createdSession }),
      });

      const result = await APIClient.createSession(sessionData);

      expect(result.data).toBeDefined();
      expect(result.data?.user_id).toBe('user-123');
      expect(result.error).toBeNull();
    });

    it('should end session with metrics', async () => {
      const endData = {
        duration_minutes: 45,
        images_processed: 10,
        descriptions_generated: 10,
        qa_attempts: 25,
        qa_correct: 20,
        vocabulary_learned: 8,
        ended_at: new Date().toISOString(),
      };

      const endedSession = {
        id: 'session-123',
        user_id: 'user-123',
        ...endData,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: endedSession }),
      });

      const result = await APIClient.endSession('session-123', endData);

      expect(result.data).toBeDefined();
      expect(result.data?.duration_minutes).toBe(45);
      expect(result.error).toBeNull();
    });
  });

  describe('No localStorage Usage', () => {
    it('should not use localStorage for progress tracking', async () => {
      const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const localStorageGetSpy = vi.spyOn(Storage.prototype, 'getItem');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      await APIClient.getUserProgress('user-123', 30);

      expect(localStorageSpy).not.toHaveBeenCalled();
      expect(localStorageGetSpy).not.toHaveBeenCalled();

      localStorageSpy.mockRestore();
      localStorageGetSpy.mockRestore();
    });

    it('should store all progress in database via API', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      await APIClient.updateLearningProgress('user-123', 'item-456', {
        mastery_level: 50,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/progress/update',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Analytics Data', () => {
    it('should fetch learning analytics', async () => {
      const mockAnalytics = {
        weekly_progress: [
          { week: '2025-10-09', points: 150, accuracy: 0.8 },
          { week: '2025-10-02', points: 120, accuracy: 0.75 },
        ],
        difficulty_breakdown: {
          facil: 45,
          medio: 35,
          dificil: 20,
        },
        learning_patterns: {
          best_time: '18:00',
          avg_session_length: 35,
          preferred_styles: ['conversacional', 'narrativo'],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockAnalytics }),
      });

      const result = await APIClient.getLearningAnalytics('user-123');

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle progress update failures', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Failed to update progress',
        }),
      });

      const result = await APIClient.updateLearningProgress(
        'user-123',
        'item-456',
        { mastery_level: 50 }
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await APIClient.getUserProgress('user-123', 30);

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Network error');
    });

    it('should handle invalid user IDs', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'User not found',
        }),
      });

      const result = await APIClient.getUserProgress('invalid-user', 30);

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('User not found');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        vocabulary_item_id: `item-${i}`,
        mastery_level: Math.floor(Math.random() * 100),
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: largeDataset }),
      });

      const startTime = Date.now();
      const result = await APIClient.getUserProgress('user-123', 365);
      const endTime = Date.now();

      expect(result.data).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
    });

    it('should not block on parallel progress updates', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      const updates = Array.from({ length: 10 }, (_, i) =>
        APIClient.updateLearningProgress('user-123', `item-${i}`, {
          mastery_level: 50,
        })
      );

      const startTime = Date.now();
      await Promise.all(updates);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Parallel execution
    });
  });
});
