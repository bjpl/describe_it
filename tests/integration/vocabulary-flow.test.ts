/**
 * Vocabulary Flow Integration Tests
 * Tests: Create list → Add items → View → Edit → Delete flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Use vi.hoisted to create variables that can be used in mock factories
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() }
  } as unknown as SupabaseClient,
}));

vi.mock('@/lib/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

describe('Vocabulary Flow Integration', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-key',
      enableLogging: false,
    });
  });

  describe('Complete Vocabulary Management Flow', () => {
    it('should complete full vocabulary lifecycle', async () => {
      const userId = 'user-123';

      // Step 1: Create vocabulary list
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'list-new',
            name: 'Travel Vocabulary',
            category: 'travel',
            created_by: userId,
          },
          error: null,
        }),
      });

      const listResult = await dbService.createVocabularyList({
        name: 'Travel Vocabulary',
        category: 'travel',
        created_by: userId,
      });

      expect(listResult.success).toBe(true);
      const listId = listResult.data!.id;

      // Step 2: Add multiple vocabulary items
      const items = [
        { spanish_text: 'aeropuerto', english_translation: 'airport', part_of_speech: 'noun' },
        { spanish_text: 'hotel', english_translation: 'hotel', part_of_speech: 'noun' },
        { spanish_text: 'viajar', english_translation: 'to travel', part_of_speech: 'verb' },
      ];

      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: items.map((item, i) => ({ ...item, id: `item-${i}`, vocabulary_list_id: listId })),
          error: null,
        }),
      });

      const bulkResult = await dbService.bulkInsertVocabulary(
        items.map(item => ({ ...item, vocabulary_list_id: listId }))
      );

      expect(bulkResult.success).toBe(true);
      expect(bulkResult.data).toHaveLength(3);
      const itemId = bulkResult.data![0].id!;

      // Step 3: Retrieve and view items
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: bulkResult.data,
          error: null,
        }),
      });

      const viewResult = await dbService.getVocabularyItems(listId);
      expect(viewResult.success).toBe(true);
      expect(viewResult.data).toHaveLength(3);

      // Step 4: Edit a vocabulary item
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: itemId,
            spanish_text: 'aeropuerto',
            english_translation: 'airport',
            difficulty_level: 'intermediate',
          },
          error: null,
        }),
      });

      const editResult = await dbService.updateVocabularyItem(itemId, {
        difficulty_level: 'intermediate',
      });

      expect(editResult.success).toBe(true);
      expect(editResult.data?.difficulty_level).toBe('intermediate');

      // Step 5: Delete vocabulary item
      (mockSupabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const deleteResult = await dbService.deleteVocabularyItem(itemId);
      expect(deleteResult.success).toBe(true);
    });

    it('should handle vocabulary search and filtering', async () => {
      const listId = 'list-123';

      // Add items with different difficulty levels
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { spanish_text: 'fácil', difficulty_level: 'beginner' },
            { spanish_text: 'difícil', difficulty_level: 'advanced' },
          ],
          error: null,
        }),
      });

      // Filter by difficulty
      const beginnerItems = await dbService.getVocabularyItems(listId, {
        filter: { difficulty_level: 'beginner' },
      });

      expect(beginnerItems.success).toBe(true);

      // Search by term
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ spanish_text: 'casa', english_translation: 'house' }],
          error: null,
        }),
      });

      const searchResult = await dbService.searchVocabulary('casa');
      expect(searchResult.success).toBe(true);
    });
  });

  describe('Learning Progress Tracking', () => {
    it('should track vocabulary learning progress', async () => {
      const userId = 'user-123';
      const itemId = 'item-123';

      // Initial progress
      (mockSupabase.from as any).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: userId,
            vocabulary_item_id: itemId,
            mastery_level: 0,
            review_count: 0,
            learning_phase: 'new',
          },
          error: null,
        }),
      });

      const initialProgress = await dbService.updateLearningProgress(userId, itemId, {
        mastery_level: 0,
        learning_phase: 'new',
      });

      expect(initialProgress.success).toBe(true);
      expect(initialProgress.data?.learning_phase).toBe('new');

      // After correct answer
      (mockSupabase.from as any).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: userId,
            vocabulary_item_id: itemId,
            mastery_level: 25,
            review_count: 1,
            correct_count: 1,
            learning_phase: 'learning',
          },
          error: null,
        }),
      });

      const updatedProgress = await dbService.updateLearningProgress(userId, itemId, {
        mastery_level: 25,
        review_count: 1,
        correct_count: 1,
        learning_phase: 'learning',
      });

      expect(updatedProgress.success).toBe(true);
      expect(updatedProgress.data?.mastery_level).toBe(25);
    });

    it('should retrieve progress for all items', async () => {
      const userId = 'user-123';

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { vocabulary_item_id: 'item-1', mastery_level: 75, learning_phase: 'mastered' },
            { vocabulary_item_id: 'item-2', mastery_level: 50, learning_phase: 'learning' },
            { vocabulary_item_id: 'item-3', mastery_level: 10, learning_phase: 'new' },
          ],
          error: null,
        }),
      });

      const progressResult = await dbService.getLearningProgress(userId);

      expect(progressResult.success).toBe(true);
      expect(progressResult.data).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate vocabulary items gracefully', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key',
          },
        }),
      });

      const result = await dbService.addVocabularyItem({
        vocabulary_list_id: 'list-123',
        spanish_text: 'duplicate',
        english_translation: 'duplicate',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('23505');
    });

    it('should handle invalid foreign keys', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23503',
            message: 'foreign key violation',
          },
        }),
      });

      const result = await dbService.addVocabularyItem({
        vocabulary_list_id: 'nonexistent',
        spanish_text: 'test',
        english_translation: 'test',
      });

      expect(result.success).toBe(false);
    });
  });
});
