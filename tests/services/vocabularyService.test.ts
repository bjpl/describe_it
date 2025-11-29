/**
 * VocabularyService Test Suite
 *
 * Comprehensive tests for VocabularyService including:
 * - CRUD operations
 * - Error handling
 * - Caching behavior
 * - Analytics and statistics
 * - Batch operations
 *
 * Target Coverage: 90%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup mocks using vi.hoisted to ensure they're available during hoisting
const { mockFrom, mockLogger } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// Now import the service
import { VocabularyService, VocabularyServiceError } from '@/lib/services/vocabularyService';

describe('VocabularyService', () => {
  let service: VocabularyService;
  let mockQueryBuilder: any;

  const createMockQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockQueryBuilder = createMockQueryBuilder();
    mockFrom.mockReturnValue(mockQueryBuilder);

    // Create fresh service instance
    service = new VocabularyService();
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: [{ id: '1' }],
        error: null,
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('vocabulary_items');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: null,
        error: new Error('Connection failed'),
      });

      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getAllVocabulary', () => {
    const mockItems = [
      {
        id: '1',
        spanish_text: 'casa',
        english_translation: 'house',
        category: 'home',
        difficulty_level: 1,
        part_of_speech: 'noun',
        frequency_score: 95,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    it('should fetch all vocabulary items', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await service.getAllVocabulary();

      expect(result).toEqual(mockItems);
      expect(mockFrom).toHaveBeenCalledWith('vocabulary_items');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    });

    it('should apply category filter', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      await service.getAllVocabulary({ category: 'home' });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', 'home');
    });

    it('should apply difficulty level filter', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      await service.getAllVocabulary({ difficulty_level: 1 });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('difficulty_level', 1);
    });

    it('should apply frequency range filters', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      await service.getAllVocabulary({
        frequency_min: 50,
        frequency_max: 100,
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('frequency_score', 50);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('frequency_score', 100);
    });

    it('should use cache when enabled', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      await service.getAllVocabulary({}, { useCache: true });
      await service.getAllVocabulary({}, { useCache: true });

      // Should only call database once due to caching
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('should throw on database error', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      await expect(service.getAllVocabulary()).rejects.toThrow(VocabularyServiceError);
    });

    it('should return empty array when no data', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.getAllVocabulary();

      expect(result).toEqual([]);
    });
  });

  describe('searchVocabulary', () => {
    it('should search vocabulary items', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: [{ spanish_text: 'casa' }],
        error: null,
      });

      const result = await service.searchVocabulary('casa');

      expect(result).toBeDefined();
      expect(mockQueryBuilder.or).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should return empty array for empty query', async () => {
      const result = await service.searchVocabulary('');

      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace query', async () => {
      const result = await service.searchVocabulary('   ');

      expect(result).toEqual([]);
    });
  });

  describe('addVocabulary', () => {
    const validItem = {
      spanish_text: 'nuevo',
      english_translation: 'new',
      category: 'adjectives',
      difficulty_level: 1,
      part_of_speech: 'adjective' as const,
      frequency_score: 85,
    };

    it('should add vocabulary item', async () => {
      const mockResult = { id: 'new-id', ...validItem };
      mockQueryBuilder.select.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockResult,
          error: null,
        }),
      });

      const result = await service.addVocabulary(validItem);

      expect(result).toHaveProperty('id');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('should throw error for missing spanish_text', async () => {
      const invalidItem: any = {
        english_translation: 'test',
      };

      await expect(service.addVocabulary(invalidItem)).rejects.toThrow();
    });

    it('should throw error for missing english_translation', async () => {
      const invalidItem: any = {
        spanish_text: 'test',
      };

      await expect(service.addVocabulary(invalidItem)).rejects.toThrow();
    });
  });

  describe('addVocabularyList', () => {
    const validItems = [
      {
        spanish_text: 'item1',
        english_translation: 'translation1',
        category: 'test',
        difficulty_level: 1,
        part_of_speech: 'noun' as const,
        frequency_score: 50,
      },
      {
        spanish_text: 'item2',
        english_translation: 'translation2',
        category: 'test',
        difficulty_level: 1,
        part_of_speech: 'verb' as const,
        frequency_score: 60,
      },
    ];

    it('should add multiple vocabulary items', async () => {
      mockQueryBuilder.select.mockResolvedValue({
        data: validItems.map((item, i) => ({ id: `id-${i}`, ...item })),
        error: null,
      });

      const result = await service.addVocabularyList(validItems);

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(validItems);
    });

    it('should throw error for empty array', async () => {
      await expect(service.addVocabularyList([])).rejects.toThrow('No items provided');
    });

    it('should validate all items', async () => {
      const invalidItems: any = [
        {
          spanish_text: 'valid',
          english_translation: 'valid',
          category: 'test',
          difficulty_level: 1,
          part_of_speech: 'noun',
          frequency_score: 50,
        },
        {
          category: 'test', // Missing required fields
        },
      ];

      await expect(service.addVocabularyList(invalidItems)).rejects.toThrow(
        'missing required fields'
      );
    });
  });

  describe('updateVocabulary', () => {
    const updates = {
      spanish_text: 'updated',
      frequency_score: 100,
    };

    it('should update vocabulary item', async () => {
      mockQueryBuilder.select.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'vocab-1', ...updates },
          error: null,
        }),
      });

      const result = await service.updateVocabulary('vocab-1', updates);

      expect(result.spanish_text).toBe('updated');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'vocab-1');
    });

    it('should invalidate cache after update', async () => {
      mockQueryBuilder.select.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'vocab-1', ...updates },
          error: null,
        }),
      });

      await service.updateVocabulary('vocab-1', updates);

      // Clear previous calls
      mockFrom.mockClear();

      // Next call should hit database
      mockQueryBuilder.then.mockResolvedValue({
        data: [],
        error: null,
      });

      await service.getAllVocabulary({}, { useCache: true });

      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('deleteVocabulary', () => {
    it('should delete vocabulary item', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.deleteVocabulary('vocab-1');

      expect(result).toBe(true);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'vocab-1');
    });

    it('should handle deletion errors', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: null,
        error: new Error('Delete failed'),
      });

      await expect(service.deleteVocabulary('vocab-1')).rejects.toThrow();
    });
  });

  describe('getVocabularyStats', () => {
    const mockItems = [
      {
        id: '1',
        category: 'home',
        difficulty_level: 1,
        part_of_speech: 'noun',
      },
      {
        id: '2',
        category: 'animals',
        difficulty_level: 2,
        part_of_speech: 'verb',
      },
    ];

    it('should calculate vocabulary statistics', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const stats = await service.getVocabularyStats();

      expect(stats.total_words).toBe(2);
      expect(stats.by_category).toHaveProperty('home', 1);
      expect(stats.by_category).toHaveProperty('animals', 1);
      expect(stats.by_difficulty).toHaveProperty('1', 1);
      expect(stats.by_difficulty).toHaveProperty('2', 1);
      expect(stats.by_part_of_speech).toHaveProperty('noun', 1);
      expect(stats.by_part_of_speech).toHaveProperty('verb', 1);
    });

    it('should cache statistics', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      await service.getVocabularyStats();
      await service.getVocabularyStats();

      // Should only call database once
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMasteryProgress', () => {
    const mockProgress = [
      {
        id: 'progress-1',
        user_id: 'user-1',
        learning_phase: 'mastered',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'progress-2',
        user_id: 'user-1',
        learning_phase: 'learning',
        updated_at: new Date().toISOString(),
      },
    ];

    it('should calculate mastery progress', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockProgress,
        error: null,
      });

      const result = await service.getMasteryProgress('user-1');

      expect(result.overall_progress).toBe(50);
      expect(result.recent_improvements).toBeDefined();
    });

    it('should handle user with no progress', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getMasteryProgress('user-2');

      expect(result.overall_progress).toBe(0);
      expect(result.recent_improvements).toHaveLength(0);
    });
  });

  describe('getVocabularyLists', () => {
    const mockLists = [
      {
        id: 'list-1',
        name: 'Test List',
        is_public: true,
      },
    ];

    it('should fetch public lists', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockLists,
        error: null,
      });

      const result = await service.getVocabularyLists();

      expect(result).toEqual(mockLists);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_public', true);
    });

    it('should fetch user and public lists', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: mockLists,
        error: null,
      });

      await service.getVocabularyLists('user-1');

      expect(mockQueryBuilder.or).toHaveBeenCalledWith('created_by.eq.user-1,is_public.eq.true');
    });
  });

  describe('createVocabularyList', () => {
    const listData = {
      name: 'New List',
      description: 'Test list',
      is_public: false,
      created_by: 'user-1',
    };

    it('should create vocabulary list', async () => {
      mockQueryBuilder.select.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'list-2', ...listData },
          error: null,
        }),
      });

      const result = await service.createVocabularyList(listData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(listData.name);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: [],
        error: null,
      });

      // Populate cache
      await service.getAllVocabulary({}, { useCache: true });
      mockFrom.mockClear();

      // Clear cache
      service.clearCache();

      // Should hit database again
      await service.getAllVocabulary({}, { useCache: true });

      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('VocabularyServiceError', () => {
    it('should create error with proper fields', () => {
      const error = new VocabularyServiceError('Test error', 'TEST_CODE', { detail: 'test' });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('VocabularyServiceError');
    });
  });
});
