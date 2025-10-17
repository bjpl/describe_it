/**
 * Vocabulary API Integration Tests
 * Tests: API calls → Database operations → Error handling → Data flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from '@/lib/api-client';

// Mock fetch globally
global.fetch = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Vocabulary API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vocabulary Lists Management', () => {
    it('should fetch vocabulary lists successfully', async () => {
      const mockLists = [
        { id: 'list-1', name: 'Travel', total_words: 25 },
        { id: 'list-2', name: 'Food', total_words: 30 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockLists }),
      });

      const result = await APIClient.getVocabularyLists('user-123');

      expect(result.data).toEqual(mockLists);
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vocabulary/lists?userId=user-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should create new vocabulary list', async () => {
      const newList = {
        id: 'list-new',
        name: 'Business',
        description: 'Business vocabulary',
        created_by: 'user-123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: newList }),
      });

      const result = await APIClient.createVocabularyList(
        'Business',
        'Business vocabulary',
        'user-123'
      );

      expect(result.data).toEqual(newList);
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vocabulary/lists',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Business"'),
        })
      );
    });

    it('should handle list creation errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'List name already exists',
          code: 'DUPLICATE_NAME',
        }),
      });

      const result = await APIClient.createVocabularyList(
        'Duplicate',
        'Test',
        'user-123'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('List name already exists');
    });
  });

  describe('Vocabulary Items Management', () => {
    it('should fetch vocabulary items for a list', async () => {
      const mockItems = [
        {
          id: 'item-1',
          spanish_text: 'casa',
          english_translation: 'house',
          part_of_speech: 'noun',
        },
        {
          id: 'item-2',
          spanish_text: 'comer',
          english_translation: 'to eat',
          part_of_speech: 'verb',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockItems }),
      });

      const result = await APIClient.getVocabularyItems('list-123');

      expect(result.data).toEqual(mockItems);
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vocabulary/items?listId=list-123',
        expect.any(Object)
      );
    });

    it('should save multiple vocabulary items', async () => {
      const items = [
        {
          vocabulary_list_id: 'list-123',
          spanish_text: 'perro',
          english_translation: 'dog',
        },
        {
          vocabulary_list_id: 'list-123',
          spanish_text: 'gato',
          english_translation: 'cat',
        },
      ];

      const savedItems = items.map((item, i) => ({
        ...item,
        id: `item-${i}`,
        created_at: new Date().toISOString(),
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: savedItems }),
      });

      const result = await APIClient.saveVocabularyItems('list-123', items);

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vocabulary/save',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"listId":"list-123"'),
        })
      );
    });

    it('should handle empty items array', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      const result = await APIClient.saveVocabularyItems('list-123', []);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await APIClient.getVocabularyLists('user-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Network error');
    });

    it('should handle non-JSON responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Plain text response',
      });

      const result = await APIClient.getVocabularyLists('user-123');

      expect(result.data).toBeDefined();
    });

    it('should handle 404 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'List not found',
        }),
      });

      const result = await APIClient.getVocabularyItems('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('List not found');
    });

    it('should handle 500 server errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Internal server error',
        }),
      });

      const result = await APIClient.createVocabularyList('Test', 'Test', 'user-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 50)
        )
      );

      const result = await APIClient.getVocabularyLists('user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Timeout');
    });
  });

  describe('Data Validation', () => {
    it('should accept valid vocabulary item data', async () => {
      const validItem = {
        vocabulary_list_id: 'list-123',
        spanish_text: 'árbol',
        english_translation: 'tree',
        part_of_speech: 'noun',
        difficulty_level: 'beginner',
        example_sentence: 'El árbol es grande',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: [{ ...validItem, id: 'item-new', created_at: new Date().toISOString() }],
        }),
      });

      const result = await APIClient.saveVocabularyItems('list-123', [validItem]);

      expect(result.data).toBeDefined();
      expect(result.data![0]).toMatchObject(validItem);
    });

    it('should handle special characters in vocabulary', async () => {
      const specialCharItem = {
        vocabulary_list_id: 'list-123',
        spanish_text: '¿Cómo estás?',
        english_translation: 'How are you?',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: [{ ...specialCharItem, id: 'item-special' }],
        }),
      });

      const result = await APIClient.saveVocabularyItems('list-123', [specialCharItem]);

      expect(result.data).toBeDefined();
      expect(result.data![0].spanish_text).toBe('¿Cómo estás?');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent requests', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        APIClient.getVocabularyLists(`user-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.error === null)).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should not interfere between concurrent requests', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: [{ id: 'list-1' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: [{ id: 'list-2' }] }),
        });

      const [result1, result2] = await Promise.all([
        APIClient.getVocabularyLists('user-1'),
        APIClient.getVocabularyLists('user-2'),
      ]);

      expect(result1.data![0].id).toBe('list-1');
      expect(result2.data![0].id).toBe('list-2');
    });
  });
});
