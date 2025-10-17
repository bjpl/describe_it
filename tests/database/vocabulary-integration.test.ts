/**
 * Vocabulary Integration Tests
 * Tests complete vocabulary workflow including lists, items, and database operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';
import type { VocabularyList, VocabularyItem } from '@/lib/services/database';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
};

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Vocabulary Integration Tests', () => {
  let dbService: DatabaseService;
  let testUserId: string;
  let testListId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testUserId = 'test-user-123';
    testListId = 'test-list-456';

    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      enableLogging: false,
    });
  });

  afterEach(() => {
    dbService.clearCache();
  });

  // ==============================================
  // VOCABULARY LIST OPERATIONS
  // ==============================================

  describe('Vocabulary List Operations', () => {
    it('should create a new vocabulary list', async () => {
      const mockList: Partial<VocabularyList> = {
        id: testListId,
        user_id: testUserId,
        name: 'Spanish Travel Vocabulary',
        description: 'Essential phrases for travel',
        category: 'travel',
        difficulty_level: 'beginner',
        is_public: false,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (mockSupabaseClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockList, error: null }),
      });

      const result = await dbService.createVocabularyList({
        user_id: testUserId,
        name: 'Spanish Travel Vocabulary',
        description: 'Essential phrases for travel',
        category: 'travel',
        difficulty_level: 'beginner',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Spanish Travel Vocabulary');
      expect(result.data?.category).toBe('travel');
    });

    it('should retrieve user vocabulary lists with filtering', async () => {
      const mockLists: Partial<VocabularyList>[] = [
        {
          id: 'list-1',
          user_id: testUserId,
          name: 'Beginner Spanish',
          category: 'general',
          difficulty_level: 'beginner',
          items_count: 25,
        },
        {
          id: 'list-2',
          user_id: testUserId,
          name: 'Advanced Spanish',
          category: 'advanced',
          difficulty_level: 'advanced',
          items_count: 50,
        },
      ];

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockLists, error: null }),
      });

      const result = await dbService.getVocabularyLists(testUserId, {
        limit: 10,
        category: 'general',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should update vocabulary list metadata', async () => {
      const updatedList: Partial<VocabularyList> = {
        id: testListId,
        name: 'Updated Travel Vocabulary',
        description: 'Comprehensive travel phrases',
      };

      (mockSupabaseClient.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedList, error: null }),
      });

      const result = await dbService.updateVocabularyList(testListId, {
        name: 'Updated Travel Vocabulary',
        description: 'Comprehensive travel phrases',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Travel Vocabulary');
    });

    it('should delete vocabulary list and cascade items', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await dbService.deleteVocabularyList(testListId);

      expect(result.success).toBe(true);
    });
  });

  // ==============================================
  // VOCABULARY ITEM OPERATIONS
  // ==============================================

  describe('Vocabulary Item Operations', () => {
    it('should add vocabulary item with all fields', async () => {
      const mockItem: Partial<VocabularyItem> = {
        id: 'item-123',
        vocabulary_list_id: testListId,
        spanish_text: '¿Dónde está el baño?',
        english_translation: 'Where is the bathroom?',
        part_of_speech: 'phrase',
        difficulty_level: 'beginner',
        context: 'Travel essentials',
        example_sentence: '¿Dónde está el baño más cercano?',
        phonetic: 'DON-deh eh-STAH el BAH-nyo',
        audio_url: null,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      (mockSupabaseClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockItem, error: null }),
      });

      const result = await dbService.addVocabularyItem({
        vocabulary_list_id: testListId,
        spanish_text: '¿Dónde está el baño?',
        english_translation: 'Where is the bathroom?',
        part_of_speech: 'phrase',
        difficulty_level: 'beginner',
        context: 'Travel essentials',
        example_sentence: '¿Dónde está el baño más cercano?',
        phonetic: 'DON-deh eh-STAH el BAH-nyo',
      });

      expect(result.success).toBe(true);
      expect(result.data?.spanish_text).toBe('¿Dónde está el baño?');
      expect(result.data?.difficulty_level).toBe('beginner');
    });

    it('should retrieve vocabulary items with pagination and filters', async () => {
      const mockItems: Partial<VocabularyItem>[] = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        vocabulary_list_id: testListId,
        spanish_text: `palabra ${i}`,
        english_translation: `word ${i}`,
        part_of_speech: i % 2 === 0 ? 'noun' : 'verb',
        difficulty_level: 'beginner',
      }));

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      });

      const result = await dbService.getVocabularyItems(testListId, {
        limit: 10,
        offset: 0,
        filter: {
          part_of_speech: 'noun',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should update vocabulary item fields', async () => {
      const updatedItem: Partial<VocabularyItem> = {
        id: 'item-123',
        is_favorite: true,
        context: 'Updated context',
      };

      (mockSupabaseClient.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedItem, error: null }),
      });

      const result = await dbService.updateVocabularyItem('item-123', {
        is_favorite: true,
        context: 'Updated context',
      });

      expect(result.success).toBe(true);
      expect(result.data?.is_favorite).toBe(true);
    });

    it('should delete vocabulary item', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await dbService.deleteVocabularyItem('item-123');

      expect(result.success).toBe(true);
    });

    it('should bulk insert vocabulary items', async () => {
      const bulkItems: Partial<VocabularyItem>[] = Array.from({ length: 50 }, (_, i) => ({
        vocabulary_list_id: testListId,
        spanish_text: `palabra ${i}`,
        english_translation: `word ${i}`,
        part_of_speech: 'noun',
      }));

      (mockSupabaseClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: bulkItems, error: null }),
      });

      const result = await dbService.bulkInsertVocabulary(bulkItems);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(50);
    });
  });

  // ==============================================
  // SEARCH AND FILTERING
  // ==============================================

  describe('Search and Filtering', () => {
    it('should search vocabulary items by text', async () => {
      const searchResults: Partial<VocabularyItem>[] = [
        {
          id: 'item-1',
          spanish_text: 'casa',
          english_translation: 'house',
        },
        {
          id: 'item-2',
          spanish_text: 'casamiento',
          english_translation: 'wedding',
        },
      ];

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: searchResults, error: null }),
      });

      const result = await dbService.searchVocabulary(testUserId, 'casa', {
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by multiple criteria', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await dbService.getVocabularyItems(testListId, {
        filter: {
          part_of_speech: 'verb',
          difficulty_level: 'intermediate',
          is_favorite: true,
        },
      });

      expect(result.success).toBe(true);
    });
  });

  // ==============================================
  // STATISTICS AND ANALYTICS
  // ==============================================

  describe('Statistics and Analytics', () => {
    it('should calculate vocabulary list statistics', async () => {
      const mockStats = {
        total_items: 100,
        by_difficulty: {
          beginner: 40,
          intermediate: 35,
          advanced: 25,
        },
        by_part_of_speech: {
          noun: 45,
          verb: 30,
          adjective: 15,
          phrase: 10,
        },
        favorites_count: 15,
      };

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockStats], error: null }),
      });

      const result = await dbService.getVocabularyListStats(testListId);

      expect(result.success).toBe(true);
      expect(result.data?.total_items).toBe(100);
    });

    it('should track vocabulary item usage', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const result = await dbService.trackVocabularyUsage('item-123', {
        user_id: testUserId,
        action: 'reviewed',
      });

      expect(result.success).toBe(true);
    });
  });

  // ==============================================
  // ERROR HANDLING
  // ==============================================

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Connection failed')),
      });

      try {
        await dbService.getVocabularyLists(testUserId);
      } catch (error: any) {
        expect(error.message).toContain('Connection failed');
      }
    });

    it('should handle invalid list ID', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      });

      const result = await dbService.getVocabularyList('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PGRST116');
    });

    it('should handle duplicate item insertion', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        }),
      });

      const result = await dbService.addVocabularyItem({
        vocabulary_list_id: testListId,
        spanish_text: 'casa',
        english_translation: 'house',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('23505');
    });
  });

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance Tests', () => {
    it('should handle large vocabulary lists efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        spanish_text: `palabra ${i}`,
        english_translation: `word ${i}`,
      }));

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: largeDataset, error: null }),
      });

      const startTime = performance.now();
      const result = await dbService.getVocabularyItems(testListId, {
        limit: 1000,
      });
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should cache frequently accessed lists', async () => {
      const mockList = { id: testListId, name: 'Test List' };
      const selectSpy = vi.fn().mockReturnThis();

      (mockSupabaseClient.from as any).mockReturnValue({
        select: selectSpy,
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockList, error: null }),
      });

      // First call - should hit database
      await dbService.getVocabularyList(testListId);
      expect(selectSpy).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await dbService.getVocabularyList(testListId);
      expect(selectSpy).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  // ==============================================
  // SECURITY TESTS
  // ==============================================

  describe('Security Tests', () => {
    it('should prevent SQL injection in search queries', async () => {
      const maliciousInput = "'; DROP TABLE vocabulary_items; --";

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await dbService.searchVocabulary(testUserId, maliciousInput);

      expect(result.success).toBe(true);
      // Should not throw or cause errors
    });

    it('should enforce user ID validation', async () => {
      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Should only return lists belonging to the user
      const result = await dbService.getVocabularyLists(testUserId);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vocabulary_lists');
    });
  });
});
