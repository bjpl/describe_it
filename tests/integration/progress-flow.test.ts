/**
 * Progress Tracking Flow Integration Tests
 * Tests: Track progress → View dashboard → Export data flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Use vi.hoisted to create variables that can be used in mock factories
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() } as unknown as SupabaseClient,
}));

vi.mock('@/lib/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

describe('Progress Tracking Flow', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-key',
      enableLogging: false,
    });
  });

  describe('Progress Dashboard Data', () => {
    it('should aggregate all progress data for dashboard', async () => {
      const userId = 'user-123';

      // Get user sessions
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `session-${i}`,
            duration_minutes: 30,
            qa_correct: 8,
            qa_attempts: 10,
          })),
          error: null,
        }),
      });

      const sessions = await dbService.getUserSessions(userId, { limit: 10 });
      expect(sessions.success).toBe(true);
      expect(sessions.data).toHaveLength(10);

      // Get learning progress
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array.from({ length: 50 }, (_, i) => ({
            vocabulary_item_id: `item-${i}`,
            mastery_level: Math.floor(Math.random() * 100),
            learning_phase: i < 10 ? 'mastered' : 'learning',
          })),
          error: null,
        }),
      });

      const progress = await dbService.getLearningProgress(userId);
      expect(progress.success).toBe(true);
      expect(progress.data).toHaveLength(50);

      // Get saved descriptions
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array.from({ length: 20 }, (_, i) => ({
            id: `desc-${i}`,
            is_favorite: i < 5,
            user_rating: 4,
          })),
          error: null,
        }),
      });

      const descriptions = await dbService.getSavedDescriptions(userId, { limit: 20 });
      expect(descriptions.success).toBe(true);
      expect(descriptions.data).toHaveLength(20);

      // Get QA responses
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array.from({ length: 100 }, (_, i) => ({
            id: `qa-${i}`,
            is_correct: Math.random() > 0.2,
            difficulty: ['facil', 'medio', 'dificil'][i % 3],
          })),
          error: null,
        }),
      });

      const qaResponses = await dbService.getQAResponses(userId, { limit: 100 });
      expect(qaResponses.success).toBe(true);
      expect(qaResponses.data).toHaveLength(100);
    });

    it('should calculate analytics metrics', async () => {
      const userId = 'user-123';

      (mockSupabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [
            { duration_minutes: 30, qa_attempts: 10, qa_correct: 8, vocabulary_learned: 5 },
            { duration_minutes: 25, qa_attempts: 8, qa_correct: 6, vocabulary_learned: 3 },
          ],
          error: null,
        }),
      }).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [
            { mastery_level: 90, learning_phase: 'mastered' },
            { mastery_level: 75, learning_phase: 'mastered' },
            { mastery_level: 50, learning_phase: 'learning' },
            { mastery_level: 25, learning_phase: 'new' },
          ],
          error: null,
        }),
      });

      const analytics = await dbService.getUserAnalytics(userId, {
        start: '2025-10-01',
        end: '2025-10-16',
      });

      expect(analytics.success).toBe(true);
      expect(analytics.data?.sessions.total).toBe(2);
      expect(analytics.data?.sessions.totalTime).toBe(55);
      expect(analytics.data?.vocabulary.mastered).toBe(2);
    });
  });

  describe('Export Data Flow', () => {
    it('should prepare data for export', async () => {
      const userId = 'user-123';

      // Get all vocabulary lists
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'list-1', name: 'Travel', total_words: 25 },
            { id: 'list-2', name: 'Food', total_words: 30 },
          ],
          error: null,
        }),
      });

      const lists = await dbService.getVocabularyLists({
        filter: { created_by: userId },
      });

      expect(lists.success).toBe(true);
      expect(lists.data).toHaveLength(2);

      // Get items for each list
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array.from({ length: 25 }, (_, i) => ({
            spanish_text: `word${i}`,
            english_translation: `translation${i}`,
            part_of_speech: 'noun',
          })),
          error: null,
        }),
      });

      const items = await dbService.getVocabularyItems('list-1');
      expect(items.success).toBe(true);
      expect(items.data).toHaveLength(25);
    });
  });

  describe('Settings Management', () => {
    it('should manage user settings', async () => {
      const userId = 'user-123';

      // Get current settings
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            theme: 'light',
            language: 'en',
            daily_word_goal: 10,
          },
          error: null,
        }),
      });

      const currentSettings = await dbService.getUserSettings(userId);
      expect(currentSettings.success).toBe(true);
      expect(currentSettings.data?.theme).toBe('light');

      // Update settings
      (mockSupabase.from as any).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            theme: 'dark',
            language: 'es',
            daily_word_goal: 20,
            settings_version: 2,
          },
          error: null,
        }),
      });

      const updatedSettings = await dbService.updateUserSettings(userId, {
        theme: 'dark',
        language: 'es',
        daily_word_goal: 20,
      });

      expect(updatedSettings.success).toBe(true);
      expect(updatedSettings.data?.theme).toBe('dark');
      expect(updatedSettings.data?.settings_version).toBe(2);
    });
  });
});
