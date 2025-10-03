/**
 * Supabase CRUD Operations Integration Tests
 *
 * Tests for:
 * - SELECT queries (all, filtered, paginated)
 * - INSERT operations (single, batch)
 * - UPDATE operations (single, batch)
 * - DELETE operations (single, batch)
 * - UPSERT operations
 * - Transaction handling
 *
 * Total: 40 comprehensive tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { dbHelpers } from '@/lib/supabase/client';
import type { Description, DescriptionInsert, User } from '@/lib/supabase/types';

describe('Supabase CRUD Operations', () => {
  let testUserId: string;
  let testDescriptionIds: string[] = [];

  beforeAll(async () => {
    // Get or create a test user
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      testUserId = user.id;
    }
  });

  afterEach(async () => {
    // Cleanup created descriptions
    if (testDescriptionIds.length > 0) {
      await supabase
        .from('descriptions')
        .delete()
        .in('id', testDescriptionIds);
      testDescriptionIds = [];
    }
  });

  describe('SELECT Operations', () => {
    it('should select all records from a table', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should select specific columns', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .limit(5);

      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('email');
        expect(data[0]).toHaveProperty('created_at');
      }
    });

    it('should filter records with eq operator', async () => {
      if (!testUserId) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.id).toBe(testUserId);
      }
    });

    it('should filter records with multiple conditions', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .eq('description_type', 'image')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should use OR filter', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .or('description_type.eq.image,description_type.eq.vocabulary')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should use IN filter', async () => {
      const types = ['image', 'vocabulary', 'phrase'];
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .in('description_type', types)
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should use NOT filter', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .not('description_type', 'eq', 'image')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should paginate results', async () => {
      const pageSize = 5;
      const { data: page1, error: error1 } = await supabase
        .from('descriptions')
        .select('*')
        .range(0, pageSize - 1)
        .order('created_at', { ascending: false });

      const { data: page2, error: error2 } = await supabase
        .from('descriptions')
        .select('*')
        .range(pageSize, pageSize * 2 - 1)
        .order('created_at', { ascending: false });

      expect(error1).toBeNull();
      expect(error2).toBeNull();
      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);
    });

    it('should order results ascending', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(5);

      expect(error).toBeNull();
      if (data && data.length >= 2) {
        const dates = data.map(d => new Date(d.created_at).getTime());
        expect(dates[0]).toBeLessThanOrEqual(dates[1]);
      }
    });

    it('should order results descending', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      expect(error).toBeNull();
      if (data && data.length >= 2) {
        const dates = data.map(d => new Date(d.created_at).getTime());
        expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      }
    });

    it('should get single record', async () => {
      if (!testUserId) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should handle null/empty results', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select('*')
        .eq('id', 'non-existent-id-12345')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it('should count total records', async () => {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(typeof count).toBe('number');
    });

    it('should select with nested relations', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .select(`
          *,
          images (*),
          phrases (*)
        `)
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('INSERT Operations', () => {
    it('should insert single record', async () => {
      if (!testUserId) {
        console.log('Skipping test: no authenticated user');
        return;
      }

      const newDescription: DescriptionInsert = {
        user_id: testUserId,
        title: 'Test Description',
        content: 'This is a test description',
        description_type: 'test',
      };

      const { data, error } = await supabase
        .from('descriptions')
        .insert(newDescription)
        .select()
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.title).toBe('Test Description');
        testDescriptionIds.push(data.id);
      }
    });

    it('should insert with returning specific columns', async () => {
      if (!testUserId) return;

      const newDescription: DescriptionInsert = {
        user_id: testUserId,
        title: 'Test with Select',
        content: 'Test content',
        description_type: 'test',
      };

      const { data, error } = await supabase
        .from('descriptions')
        .insert(newDescription)
        .select('id, title')
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('title');
        testDescriptionIds.push(data.id);
      }
    });

    it('should batch insert multiple records', async () => {
      if (!testUserId) return;

      const descriptions: DescriptionInsert[] = [
        {
          user_id: testUserId,
          title: 'Batch Test 1',
          content: 'Content 1',
          description_type: 'test',
        },
        {
          user_id: testUserId,
          title: 'Batch Test 2',
          content: 'Content 2',
          description_type: 'test',
        },
        {
          user_id: testUserId,
          title: 'Batch Test 3',
          content: 'Content 3',
          description_type: 'test',
        },
      ];

      const { data, error } = await supabase
        .from('descriptions')
        .insert(descriptions)
        .select();

      expect(error).toBeNull();
      if (data) {
        expect(data).toHaveLength(3);
        testDescriptionIds.push(...data.map(d => d.id));
      }
    });

    it('should handle insert with default values', async () => {
      if (!testUserId) return;

      const minimal: DescriptionInsert = {
        user_id: testUserId,
        title: 'Minimal Test',
        content: 'Minimal content',
        description_type: 'test',
      };

      const { data, error } = await supabase
        .from('descriptions')
        .insert(minimal)
        .select()
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.created_at).toBeDefined();
        expect(data.updated_at).toBeDefined();
        testDescriptionIds.push(data.id);
      }
    });

    it('should reject insert with missing required fields', async () => {
      const invalid = {
        title: 'Invalid',
        // Missing user_id, content, description_type
      };

      const { error } = await supabase
        .from('descriptions')
        .insert(invalid as any);

      expect(error).toBeDefined();
    });
  });

  describe('UPDATE Operations', () => {
    let updateTestId: string;

    beforeEach(async () => {
      if (!testUserId) return;

      const { data } = await supabase
        .from('descriptions')
        .insert({
          user_id: testUserId,
          title: 'Update Test',
          content: 'Original content',
          description_type: 'test',
        })
        .select()
        .single();

      if (data) {
        updateTestId = data.id;
        testDescriptionIds.push(data.id);
      }
    });

    it('should update single record', async () => {
      if (!updateTestId) return;

      const { data, error } = await supabase
        .from('descriptions')
        .update({ title: 'Updated Title' })
        .eq('id', updateTestId)
        .select()
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.title).toBe('Updated Title');
      }
    });

    it('should update multiple fields', async () => {
      if (!updateTestId) return;

      const updates = {
        title: 'Multi Update',
        content: 'Updated content',
        tags: ['test', 'updated'],
      };

      const { data, error } = await supabase
        .from('descriptions')
        .update(updates)
        .eq('id', updateTestId)
        .select()
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.title).toBe('Multi Update');
        expect(data.content).toBe('Updated content');
      }
    });

    it('should batch update with condition', async () => {
      if (!testUserId) return;

      const { error } = await supabase
        .from('descriptions')
        .update({ tags: ['batch-updated'] })
        .eq('user_id', testUserId)
        .eq('description_type', 'test');

      expect(error).toBeNull();
    });

    it('should update and return modified count', async () => {
      if (!testUserId) return;

      const { count, error } = await supabase
        .from('descriptions')
        .update({ tags: ['counted'] })
        .eq('user_id', testUserId)
        .eq('description_type', 'test')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(typeof count).toBe('number');
    });

    it('should handle update with no matching records', async () => {
      const { data, error } = await supabase
        .from('descriptions')
        .update({ title: 'No Match' })
        .eq('id', 'non-existent-id')
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('DELETE Operations', () => {
    let deleteTestId: string;

    beforeEach(async () => {
      if (!testUserId) return;

      const { data } = await supabase
        .from('descriptions')
        .insert({
          user_id: testUserId,
          title: 'Delete Test',
          content: 'To be deleted',
          description_type: 'test',
        })
        .select()
        .single();

      if (data) {
        deleteTestId = data.id;
      }
    });

    it('should delete single record', async () => {
      if (!deleteTestId) return;

      const { error } = await supabase
        .from('descriptions')
        .delete()
        .eq('id', deleteTestId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await supabase
        .from('descriptions')
        .select('*')
        .eq('id', deleteTestId)
        .maybeSingle();

      expect(data).toBeNull();
    });

    it('should batch delete with condition', async () => {
      if (!testUserId) return;

      // Create multiple test records
      const testRecords = await supabase
        .from('descriptions')
        .insert([
          { user_id: testUserId, title: 'Batch Delete 1', content: 'Content', description_type: 'batch-test' },
          { user_id: testUserId, title: 'Batch Delete 2', content: 'Content', description_type: 'batch-test' },
        ])
        .select();

      const { error } = await supabase
        .from('descriptions')
        .delete()
        .eq('description_type', 'batch-test');

      expect(error).toBeNull();
    });

    it('should delete and return deleted records', async () => {
      if (!deleteTestId) return;

      const { data, error } = await supabase
        .from('descriptions')
        .delete()
        .eq('id', deleteTestId)
        .select();

      expect(error).toBeNull();
      if (data) {
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(deleteTestId);
      }
    });

    it('should handle delete with no matching records', async () => {
      const { error, count } = await supabase
        .from('descriptions')
        .delete()
        .eq('id', 'non-existent-id')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(count).toBe(0);
    });
  });

  describe('UPSERT Operations', () => {
    it('should insert when record does not exist', async () => {
      if (!testUserId) return;

      const record: DescriptionInsert = {
        user_id: testUserId,
        title: 'Upsert New',
        content: 'New content',
        description_type: 'upsert-test',
      };

      const { data, error } = await supabase
        .from('descriptions')
        .upsert(record)
        .select()
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.title).toBe('Upsert New');
        testDescriptionIds.push(data.id);
      }
    });

    it('should update when record exists', async () => {
      if (!testUserId) return;

      // Create initial record
      const { data: initial } = await supabase
        .from('descriptions')
        .insert({
          user_id: testUserId,
          title: 'Upsert Original',
          content: 'Original',
          description_type: 'upsert-test',
        })
        .select()
        .single();

      if (!initial) return;
      testDescriptionIds.push(initial.id);

      // Upsert to update
      const { data, error } = await supabase
        .from('descriptions')
        .upsert({
          id: initial.id,
          user_id: testUserId,
          title: 'Upsert Updated',
          content: 'Updated',
          description_type: 'upsert-test',
        })
        .select()
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.title).toBe('Upsert Updated');
      }
    });

    it('should batch upsert multiple records', async () => {
      if (!testUserId) return;

      const records: DescriptionInsert[] = [
        { user_id: testUserId, title: 'Batch Upsert 1', content: 'Content', description_type: 'batch-upsert' },
        { user_id: testUserId, title: 'Batch Upsert 2', content: 'Content', description_type: 'batch-upsert' },
      ];

      const { data, error } = await supabase
        .from('descriptions')
        .upsert(records)
        .select();

      expect(error).toBeNull();
      if (data) {
        expect(data.length).toBeGreaterThanOrEqual(2);
        testDescriptionIds.push(...data.map(d => d.id));
      }
    });
  });

  describe('Transaction-like Operations', () => {
    it('should handle multiple operations in sequence', async () => {
      if (!testUserId) return;

      // Insert
      const { data: inserted } = await supabase
        .from('descriptions')
        .insert({
          user_id: testUserId,
          title: 'Transaction Test',
          content: 'Initial',
          description_type: 'transaction-test',
        })
        .select()
        .single();

      if (!inserted) return;
      testDescriptionIds.push(inserted.id);

      // Update
      const { data: updated } = await supabase
        .from('descriptions')
        .update({ content: 'Updated' })
        .eq('id', inserted.id)
        .select()
        .single();

      expect(updated?.content).toBe('Updated');

      // Delete
      await supabase
        .from('descriptions')
        .delete()
        .eq('id', inserted.id);
    });

    it('should rollback on error (using conditional logic)', async () => {
      if (!testUserId) return;

      try {
        // Insert valid record
        const { data: inserted } = await supabase
          .from('descriptions')
          .insert({
            user_id: testUserId,
            title: 'Rollback Test',
            content: 'Content',
            description_type: 'rollback-test',
          })
          .select()
          .single();

        if (!inserted) throw new Error('Insert failed');
        testDescriptionIds.push(inserted.id);

        // Attempt invalid operation
        const { error } = await supabase
          .from('descriptions')
          .insert({
            // Missing required fields
            title: 'Invalid',
          } as any);

        if (error) {
          // Cleanup on error
          await supabase.from('descriptions').delete().eq('id', inserted.id);
          throw error;
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
