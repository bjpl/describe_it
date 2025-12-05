/**
 * Tests for BaseRepository
 * Comprehensive coverage of all CRUD operations, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository, BaseEntity, RepositoryOptions } from '@/core/repositories/base.repository';
import { SupabaseClient } from '@supabase/supabase-js';

interface TestEntity extends BaseEntity {
  name: string;
  value: number;
}

class TestRepository extends BaseRepository<TestEntity> {
  protected tableName = 'test_table';
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create chainable query builder mock
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockQueryBuilder),
    } as unknown as SupabaseClient;

    repository = new TestRepository(mockSupabase);
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const mockEntity: TestEntity = {
        id: '123',
        name: 'Test Item',
        value: 42,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockEntity,
        error: null,
      });

      const result = await repository.findById('123');

      expect(result).toEqual(mockEntity);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '123');
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should return null when entity not found', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
      });

      const result = await repository.findById('123');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockEntities: TestEntity[] = [
      {
        id: '1',
        name: 'Item 1',
        value: 10,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Item 2',
        value: 20,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    it('should return all entities without options', async () => {
      // Mock the promise-like behavior
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: mockEntities, error: null });
        }),
      });

      const result = await repository.findAll();

      expect(result).toEqual(mockEntities);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    });

    it('should apply orderBy option ascending', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: mockEntities, error: null });
        }),
      });

      const options: RepositoryOptions = {
        orderBy: { column: 'name', ascending: true },
      };

      await repository.findAll(options);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('should apply orderBy option descending', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: mockEntities, error: null });
        }),
      });

      const options: RepositoryOptions = {
        orderBy: { column: 'created_at', ascending: false },
      };

      await repository.findAll(options);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should apply limit option', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [mockEntities[0]], error: null });
        }),
      });

      const options: RepositoryOptions = {
        limit: 5,
      };

      await repository.findAll(options);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should apply offset with limit', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: mockEntities, error: null });
        }),
      });

      const options: RepositoryOptions = {
        offset: 10,
        limit: 5,
      };

      await repository.findAll(options);

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(10, 14); // offset to offset + limit - 1
    });

    it('should use default limit of 10 when offset provided without limit', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: mockEntities, error: null });
        }),
      });

      const options: RepositoryOptions = {
        offset: 5,
      };

      await repository.findAll(options);

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(5, 14); // 5 + 10 - 1
    });

    it('should return empty array when no data', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: null, error: null });
        }),
      });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should apply multiple options together', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: mockEntities, error: null });
        }),
      });

      const options: RepositoryOptions = {
        orderBy: { column: 'value' },
        limit: 20,
        offset: 5,
      };

      await repository.findAll(options);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('value', { ascending: true });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(5, 24);
    });
  });

  describe('create', () => {
    it('should create entity successfully', async () => {
      const newEntity = { name: 'New Item', value: 100 };
      const createdEntity: TestEntity = {
        id: '456',
        ...newEntity,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: createdEntity,
        error: null,
      });

      const result = await repository.create(newEntity);

      expect(result).toEqual(createdEntity);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(newEntity);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should throw error on creation failure', async () => {
      const newEntity = { name: 'New Item', value: 100 };

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Duplicate key violation' },
      });

      await expect(repository.create(newEntity)).rejects.toThrow('Duplicate key violation');
    });

    it('should throw error on constraint violation', async () => {
      const invalidEntity = { name: '', value: -1 };

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Check constraint violation' },
      });

      await expect(repository.create(invalidEntity)).rejects.toThrow('Check constraint violation');
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
      const updates = { name: 'Updated Name', value: 200 };
      const updatedEntity: TestEntity = {
        id: '123',
        ...updates,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: updatedEntity,
        error: null,
      });

      const result = await repository.update('123', updates);

      expect(result).toEqual(updatedEntity);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '123');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should include updated_at timestamp', async () => {
      const updates = { name: 'Updated Name' };
      let capturedUpdate: any;

      mockQueryBuilder.update.mockImplementation((data: any) => {
        capturedUpdate = data;
        return mockQueryBuilder;
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: '123', ...updates, updated_at: new Date().toISOString() },
        error: null,
      });

      await repository.update('123', updates);

      expect(capturedUpdate).toHaveProperty('updated_at');
      expect(capturedUpdate.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should throw error on update failure', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Entity not found' },
      });

      await expect(repository.update('nonexistent', { name: 'test' })).rejects.toThrow(
        'Entity not found'
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { value: 300 };
      const updatedEntity: TestEntity = {
        id: '123',
        name: 'Original Name',
        value: 300,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: updatedEntity,
        error: null,
      });

      const result = await repository.update('123', partialUpdate);

      expect(result.value).toBe(300);
      expect(result.name).toBe('Original Name');
    });
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(repository.delete('123')).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should throw error on deletion failure', async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation' },
      });

      await expect(repository.delete('123')).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle non-existent entity deletion', async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: 'No rows affected' },
      });

      await expect(repository.delete('nonexistent')).rejects.toThrow('No rows affected');
    });
  });

  describe('count', () => {
    it('should count all entities without filter', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: 42, error: null });
        }),
      });

      const result = await repository.count();

      expect(result).toBe(42);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*', {
        count: 'exact',
        head: true,
      });
    });

    it('should count entities with filter', async () => {
      mockQueryBuilder.eq.mockReturnThis();
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: 10, error: null });
        }),
      });

      const result = await repository.count({ name: 'Test' });

      expect(result).toBe(10);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('name', 'Test');
    });

    it('should count with multiple filters', async () => {
      mockQueryBuilder.eq.mockReturnThis();
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: 5, error: null });
        }),
      });

      const result = await repository.count({ name: 'Test', value: 100 });

      expect(result).toBe(5);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('name', 'Test');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('value', 100);
    });

    it('should return 0 when count is null', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: null, error: null });
        }),
      });

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: 1, error: null });
        }),
      });

      const result = await repository.exists('123');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*', {
        count: 'exact',
        head: true,
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should return false when entity does not exist', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: 0, error: null });
        }),
      });

      const result = await repository.exists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when count is null', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: null, error: null });
        }),
      });

      const result = await repository.exists('123');

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string IDs', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Invalid ID' },
      });

      const result = await repository.findById('');

      expect(result).toBeNull();
    });

    it('should handle special characters in filters', async () => {
      mockQueryBuilder.eq.mockReturnThis();
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ count: 1, error: null });
        }),
      });

      await repository.count({ name: "O'Reilly" });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('name', "O'Reilly");
    });

    it('should handle very large limit values', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      });

      await repository.findAll({ limit: 999999 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(999999);
    });

    it('should handle zero offset', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      });

      await repository.findAll({ offset: 0, limit: 10 });

      // When offset is 0, range is not called because 0 is falsy
      // Only limit should be applied
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.range).not.toHaveBeenCalled();
    });
  });
});
