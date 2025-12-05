/**
 * VocabularyService Tests
 * Comprehensive unit tests for vocabulary management service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyService, type VocabularyItemInput } from '@/core/services/VocabularyService';
import { DatabaseService } from '@/lib/supabase';
import { descriptionCache } from '@/lib/cache';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  DatabaseService: {
    getVocabularyLists: vi.fn(),
    createVocabularyList: vi.fn(),
    addVocabularyItem: vi.fn(),
    getVocabularyItems: vi.fn(),
  },
}));

vi.mock('@/lib/cache', () => ({
  descriptionCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('VocabularyService', () => {
  let service: VocabularyService;
  const mockUserId = 'user-123';
  const mockCollectionName = 'My Vocabulary';

  beforeEach(() => {
    service = new VocabularyService();
    vi.clearAllMocks();
  });

  describe('saveVocabulary', () => {
    const vocabularyInput: VocabularyItemInput = {
      phrase: 'perro',
      definition: 'A domesticated animal',
      category: 'animals',
      partOfSpeech: 'noun',
      difficulty: 'beginner',
      context: 'El perro corre en el parque',
      translation: 'dog',
      notes: 'Common pet',
      tags: ['animals', 'pets'],
      gender: 'masculino',
      article: 'el',
    };

    it('should save vocabulary to existing list', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        vocabulary_list_id: 'list-123',
        spanish_text: 'perro',
        english_translation: 'dog',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveVocabulary(
        mockUserId,
        vocabularyInput,
        mockCollectionName
      );

      expect(result).toMatchObject({
        id: 'vocab-123',
        phrase: 'perro',
        translation: 'dog',
        userId: mockUserId,
        collectionName: mockCollectionName,
      });
      expect(DatabaseService.addVocabularyItem).toHaveBeenCalledWith(
        expect.objectContaining({
          vocabulary_list_id: 'list-123',
          spanish_text: 'perro',
          english_translation: 'dog',
        })
      );
    });

    it('should create new list if not exists', async () => {
      const mockList = { id: 'list-456', name: 'New List' };
      const mockVocabItem = {
        id: 'vocab-456',
        vocabulary_list_id: 'list-456',
        spanish_text: 'casa',
        english_translation: 'house',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([]);
      vi.mocked(DatabaseService.createVocabularyList).mockResolvedValue(mockList);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveVocabulary(mockUserId, vocabularyInput, 'New List');

      expect(DatabaseService.createVocabularyList).toHaveBeenCalledWith({
        name: 'New List',
        description: 'Vocabulary collection: New List',
        category: 'general',
      });
    });

    it('should map difficulty levels correctly', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveVocabulary(
        mockUserId,
        { ...vocabularyInput, difficulty: 'advanced' },
        mockCollectionName
      );

      expect(DatabaseService.addVocabularyItem).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty_level: 3,
        })
      );
    });

    it('should update collection index', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveVocabulary(mockUserId, vocabularyInput, mockCollectionName);

      const indexCall = vi.mocked(descriptionCache.set).mock.calls.find(
        (call) => call[2].includes(':index')
      );
      expect(indexCall).toBeDefined();
      expect(indexCall?.[0]).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'vocab-123',
            phrase: 'perro',
            category: 'animals',
          }),
        ]),
      });
    });

    it('should update user statistics', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveVocabulary(mockUserId, vocabularyInput, mockCollectionName);

      const statsCall = vi.mocked(descriptionCache.set).mock.calls.find(
        (call) => call[2].includes(':stats')
      );
      expect(statsCall).toBeDefined();
      expect(statsCall?.[0]).toMatchObject({
        totalItems: 1,
        difficultyCounts: expect.objectContaining({ beginner: 1 }),
        categoryCounts: expect.objectContaining({ animals: 1 }),
      });
    });

    it('should throw error when list creation fails', async () => {
      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([]);
      vi.mocked(DatabaseService.createVocabularyList).mockResolvedValue(null);

      await expect(
        service.saveVocabulary(mockUserId, vocabularyInput, 'New List')
      ).rejects.toThrow('Failed to create vocabulary list');
    });

    it('should throw error when vocabulary save fails', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(null);

      await expect(
        service.saveVocabulary(mockUserId, vocabularyInput, mockCollectionName)
      ).rejects.toThrow('Failed to save vocabulary item to database');
    });
  });

  describe('saveBulkVocabulary', () => {
    const vocabularyItems: VocabularyItemInput[] = [
      {
        phrase: 'gato',
        definition: 'cat',
        category: 'animals',
        difficulty: 'beginner',
        translation: 'cat',
      },
      {
        phrase: 'perro',
        definition: 'dog',
        category: 'animals',
        difficulty: 'beginner',
        translation: 'dog',
      },
    ];

    it('should save multiple vocabulary items', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItems = vocabularyItems.map((item, i) => ({
        id: `vocab-${i}`,
        vocabulary_list_id: 'list-123',
        spanish_text: item.phrase,
        english_translation: item.translation!,
        created_at: '2024-01-15T00:00:00.000Z',
      }));

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem)
        .mockResolvedValueOnce(mockVocabItems[0])
        .mockResolvedValueOnce(mockVocabItems[1]);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const results = await service.saveBulkVocabulary(
        mockUserId,
        vocabularyItems,
        mockCollectionName
      );

      expect(results).toHaveLength(2);
      expect(results[0].phrase).toBe('gato');
      expect(results[1].phrase).toBe('perro');
    });

    it('should update stats for each item', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await service.saveBulkVocabulary(mockUserId, vocabularyItems, mockCollectionName);

      const statsCalls = vi.mocked(descriptionCache.set).mock.calls.filter(
        (call) => call[2].includes(':stats')
      );
      expect(statsCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should mark items with bulkImport metadata', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const results = await service.saveBulkVocabulary(
        mockUserId,
        vocabularyItems,
        mockCollectionName
      );

      expect(results.every((r) => r.metadata.bulkImport)).toBe(true);
    });

    it('should skip failed items', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem)
        .mockResolvedValueOnce({ id: 'vocab-1', created_at: '2024-01-15T00:00:00.000Z' })
        .mockResolvedValueOnce(null);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const results = await service.saveBulkVocabulary(
        mockUserId,
        vocabularyItems,
        mockCollectionName
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('getVocabulary', () => {
    it('should retrieve vocabulary with default filters', async () => {
      const mockLists = [{ id: 'list-123', name: 'Collection 1' }];
      const mockItems = [
        {
          id: 'vocab-1',
          spanish_text: 'perro',
          english_translation: 'dog',
          category: 'animals',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
      ];

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue(mockLists);
      vi.mocked(DatabaseService.getVocabularyItems).mockResolvedValue(mockItems);

      const result = await service.getVocabulary(mockUserId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        phrase: 'perro',
        translation: 'dog',
        difficulty: 'beginner',
      });
    });

    it('should filter by collection name', async () => {
      const mockLists = [
        { id: 'list-1', name: 'Collection 1' },
        { id: 'list-2', name: 'Collection 2' },
      ];
      const mockItems = [
        {
          id: 'vocab-1',
          spanish_text: 'perro',
          english_translation: 'dog',
          category: 'animals',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
      ];

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue(mockLists);
      vi.mocked(DatabaseService.getVocabularyItems).mockResolvedValue(mockItems);

      const result = await service.getVocabulary(mockUserId, {
        collectionName: 'Collection 1',
      });

      expect(DatabaseService.getVocabularyItems).toHaveBeenCalledWith('list-1');
    });

    it('should filter by category', async () => {
      const mockLists = [{ id: 'list-123', name: 'Collection 1' }];
      const mockItems = [
        {
          id: 'vocab-1',
          spanish_text: 'perro',
          english_translation: 'dog',
          category: 'animals',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 'vocab-2',
          spanish_text: 'mesa',
          english_translation: 'table',
          category: 'furniture',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
      ];

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue(mockLists);
      vi.mocked(DatabaseService.getVocabularyItems).mockResolvedValue(mockItems);

      const result = await service.getVocabulary(mockUserId, { category: 'animals' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].phrase).toBe('perro');
    });

    it('should filter by difficulty', async () => {
      const mockLists = [{ id: 'list-123', name: 'Collection 1' }];
      const mockItems = [
        {
          id: 'vocab-1',
          spanish_text: 'perro',
          english_translation: 'dog',
          category: 'animals',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 'vocab-2',
          spanish_text: 'complejo',
          english_translation: 'complex',
          category: 'general',
          difficulty_level: 3,
          part_of_speech: 'adjective',
          created_at: '2024-01-15T00:00:00.000Z',
        },
      ];

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue(mockLists);
      vi.mocked(DatabaseService.getVocabularyItems).mockResolvedValue(mockItems);

      const result = await service.getVocabulary(mockUserId, { difficulty: 'beginner' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].difficulty).toBe('beginner');
    });

    it('should apply pagination', async () => {
      const mockLists = [{ id: 'list-123', name: 'Collection 1' }];
      const mockItems = Array.from({ length: 100 }, (_, i) => ({
        id: `vocab-${i}`,
        spanish_text: `word${i}`,
        english_translation: `translation${i}`,
        category: 'general',
        difficulty_level: 1,
        part_of_speech: 'noun',
        created_at: '2024-01-15T00:00:00.000Z',
      }));

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue(mockLists);
      vi.mocked(DatabaseService.getVocabularyItems).mockResolvedValue(mockItems);

      const result = await service.getVocabulary(mockUserId, {
        limit: 20,
        offset: 10,
      });

      expect(result.items).toHaveLength(20);
      // Items are sorted descending by createdAt by default, so after offset of 10, we're at index 10
      expect(result.items[0].phrase).toMatch(/^word\d+$/);
      expect(result.hasMore).toBe(true);
    });

    it('should sort by phrase ascending', async () => {
      const mockLists = [{ id: 'list-123', name: 'Collection 1' }];
      const mockItems = [
        {
          id: 'vocab-1',
          spanish_text: 'zebra',
          english_translation: 'zebra',
          category: 'animals',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 'vocab-2',
          spanish_text: 'apple',
          english_translation: 'manzana',
          category: 'food',
          difficulty_level: 1,
          part_of_speech: 'noun',
          created_at: '2024-01-15T00:00:00.000Z',
        },
      ];

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue(mockLists);
      vi.mocked(DatabaseService.getVocabularyItems).mockResolvedValue(mockItems);

      const result = await service.getVocabulary(mockUserId, {
        sortBy: 'phrase',
        sortOrder: 'asc',
      });

      expect(result.items[0].phrase).toBe('apple');
      expect(result.items[1].phrase).toBe('zebra');
    });

    it('should return empty array when collection not found', async () => {
      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([]);

      const result = await service.getVocabulary(mockUserId, {
        collectionName: 'Nonexistent',
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(DatabaseService.getVocabularyLists).mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.getVocabulary(mockUserId);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserStats', () => {
    it('should return cached statistics', async () => {
      const mockStats = {
        totalItems: 50,
        difficultyCounts: { beginner: 20, intermediate: 20, advanced: 10 },
        categoryCounts: { animals: 15, food: 20, general: 15 },
        lastUpdated: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(descriptionCache.get).mockResolvedValue(mockStats);

      const result = await service.getUserStats(mockUserId);

      expect(result).toEqual(mockStats);
    });

    it('should return default stats when none exist', async () => {
      vi.mocked(descriptionCache.get).mockResolvedValue(null);

      const result = await service.getUserStats(mockUserId);

      expect(result).toMatchObject({
        totalItems: 0,
        difficultyCounts: { beginner: 0, intermediate: 0, advanced: 0 },
        categoryCounts: {},
      });
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in phrases', async () => {
      const specialInput: VocabularyItemInput = {
        phrase: '¿Cómo estás?',
        definition: 'How are you?',
        category: 'greetings',
        difficulty: 'beginner',
        translation: 'How are you?',
      };

      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      await expect(
        service.saveVocabulary(mockUserId, specialInput, mockCollectionName)
      ).resolves.toBeDefined();
    });

    it('should handle very long phrases', async () => {
      const longPhrase = 'a'.repeat(500);
      const longInput: VocabularyItemInput = {
        phrase: longPhrase,
        definition: 'test',
        category: 'test',
        difficulty: 'beginner',
        translation: 'test',
      };

      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const result = await service.saveVocabulary(
        mockUserId,
        longInput,
        mockCollectionName
      );

      expect(result.phrase).toBe(longPhrase);
    });

    it('should handle concurrent saves', async () => {
      const mockList = { id: 'list-123', name: mockCollectionName };
      const mockVocabItem = {
        id: 'vocab-123',
        created_at: '2024-01-15T00:00:00.000Z',
      };

      vi.mocked(DatabaseService.getVocabularyLists).mockResolvedValue([mockList]);
      vi.mocked(DatabaseService.addVocabularyItem).mockResolvedValue(mockVocabItem);
      vi.mocked(descriptionCache.get).mockResolvedValue(null);
      vi.mocked(descriptionCache.set).mockResolvedValue(undefined);

      const saves = Array.from({ length: 5 }, (_, i) =>
        service.saveVocabulary(
          mockUserId,
          {
            phrase: `word${i}`,
            definition: 'test',
            category: 'test',
            difficulty: 'beginner',
            translation: 'test',
          },
          mockCollectionName
        )
      );

      const results = await Promise.all(saves);

      expect(results).toHaveLength(5);
    });
  });
});
