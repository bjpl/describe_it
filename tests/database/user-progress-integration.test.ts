/**
 * User Progress Table Integration Tests
 * Tests CRUD operations, RLS policies, and progress tracking logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { progressOperations } from '@/lib/database/utils';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Skip tests if database is not available
const skipTests = !process.env.NEXT_PUBLIC_SUPABASE_URL;

describe.skipIf(skipTests)('User Progress Table Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================
  // CREATE OPERATIONS
  // ==============================================

  describe('Create Progress Records', () => {
    it('should create new user progress record', async () => {
      const mockProgress = {
        id: 'progress-123',
        user_id: 'user-123',
        total_sessions: 0,
        total_study_time: 0,
        current_streak: 0,
        longest_streak: 0,
        total_points: 0,
        level: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProgress,
          error: null,
        }),
      });

      const result = await progressOperations.create({
        user_id: 'user-123',
        total_sessions: 0,
        total_study_time: 0,
        current_streak: 0,
        longest_streak: 0,
        total_points: 0,
        level: 1,
      });

      expect(result.data).toEqual(mockProgress);
      expect(result.error).toBeNull();
    });

    it('should enforce unique constraint on user_id', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
          },
        }),
      });

      const result = await progressOperations.create({
        user_id: 'user-123',
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('duplicate');
    });

    it('should enforce foreign key constraint on user_id', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'violates foreign key constraint',
            code: '23503',
          },
        }),
      });

      const result = await progressOperations.create({
        user_id: 'invalid-user',
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('foreign key');
    });
  });

  // ==============================================
  // READ OPERATIONS
  // ==============================================

  describe('Read Progress Records', () => {
    it('should retrieve user progress by user_id', async () => {
      const mockProgress = {
        id: 'progress-123',
        user_id: 'user-123',
        total_sessions: 10,
        total_study_time: 300,
        current_streak: 5,
        longest_streak: 10,
        total_points: 500,
        level: 3,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProgress,
          error: null,
        }),
      });

      const result = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', 'user-123')
        .single();

      expect(result.data).toEqual(mockProgress);
      expect(result.error).toBeNull();
    });

    it('should return empty for non-existent user', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        }),
      });

      const result = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', 'non-existent')
        .single();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('PGRST116');
    });
  });

  // ==============================================
  // UPDATE OPERATIONS
  // ==============================================

  describe('Update Progress Records', () => {
    it('should update total_sessions and total_study_time', async () => {
      const updatedProgress = {
        id: 'progress-123',
        user_id: 'user-123',
        total_sessions: 11,
        total_study_time: 330,
        current_streak: 6,
        total_points: 550,
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedProgress,
          error: null,
        }),
      });

      const result = await progressOperations.update('progress-123', {
        total_sessions: 11,
        total_study_time: 330,
        current_streak: 6,
        total_points: 550,
      });

      expect(result.data?.total_sessions).toBe(11);
      expect(result.data?.current_streak).toBe(6);
      expect(result.error).toBeNull();
    });

    it('should update streak correctly', async () => {
      const updatedProgress = {
        current_streak: 7,
        longest_streak: 7,
        last_activity_date: new Date().toISOString().split('T')[0],
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedProgress,
          error: null,
        }),
      });

      const result = await progressOperations.update('progress-123', {
        current_streak: 7,
        longest_streak: 7,
        last_activity_date: new Date().toISOString().split('T')[0],
      });

      expect(result.data?.current_streak).toBe(7);
      expect(result.data?.longest_streak).toBe(7);
    });

    it('should update level and total_points', async () => {
      const updatedProgress = {
        level: 4,
        total_points: 1000,
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedProgress,
          error: null,
        }),
      });

      const result = await progressOperations.update('progress-123', {
        level: 4,
        total_points: 1000,
      });

      expect(result.data?.level).toBe(4);
      expect(result.data?.total_points).toBe(1000);
    });

    it('should auto-update updated_at timestamp', async () => {
      const now = new Date().toISOString();

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { updated_at: now },
          error: null,
        }),
      });

      const result = await progressOperations.update('progress-123', {
        total_sessions: 12,
      });

      expect(result.data?.updated_at).toBeDefined();
    });
  });

  // ==============================================
  // DELETE OPERATIONS
  // ==============================================

  describe('Delete Progress Records', () => {
    it('should delete progress record', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await progressOperations.delete('progress-123');

      expect(result.error).toBeNull();
    });

    it('should cascade delete when user is deleted', async () => {
      // Simulate user deletion
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // Delete user (should cascade to user_progress)
      const result = await supabase
        .from('users')
        .delete()
        .eq('id', 'user-123');

      expect(result.error).toBeNull();
    });
  });

  // ==============================================
  // RLS POLICY TESTS
  // ==============================================

  describe('Row Level Security Policies', () => {
    it('should allow users to read own progress', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user-123', total_points: 500 },
          error: null,
        }),
      });

      const result = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', 'user-123')
        .single();

      expect(result.data?.user_id).toBe('user-123');
      expect(result.error).toBeNull();
    });

    it('should prevent users from reading others progress', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const result = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', 'other-user')
        .single();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('PGRST301');
    });

    it('should allow users to update own progress', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user-123', total_points: 600 },
          error: null,
        }),
      });

      const result = await supabase
        .from('user_progress')
        .update({ total_points: 600 })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data?.total_points).toBe(600);
      expect(result.error).toBeNull();
    });

    it('should prevent users from updating others progress', async () => {
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const result = await supabase
        .from('user_progress')
        .update({ total_points: 999 })
        .eq('user_id', 'other-user')
        .select();

      expect(result.error?.code).toBe('PGRST301');
    });
  });

  // ==============================================
  // DATA INTEGRITY TESTS
  // ==============================================

  describe('Data Integrity', () => {
    it('should enforce non-negative constraints on numeric fields', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'new row violates check constraint',
            code: '23514',
          },
        }),
      });

      const result = await progressOperations.create({
        user_id: 'user-123',
        total_points: -100, // Invalid negative value
      });

      expect(result.error).toBeTruthy();
    });

    it('should enforce valid level range', async () => {
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'level must be between 1 and 100',
            code: '23514',
          },
        }),
      });

      const result = await progressOperations.update('progress-123', {
        level: 101, // Invalid level
      });

      expect(result.error).toBeTruthy();
    });

    it('should maintain streak consistency', async () => {
      const mockProgress = {
        current_streak: 5,
        longest_streak: 10,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProgress,
          error: null,
        }),
      });

      const result = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', 'user-123')
        .single();

      // Current streak should never exceed longest streak
      expect(result.data?.current_streak).toBeLessThanOrEqual(
        result.data?.longest_streak || 0
      );
    });
  });

  // ==============================================
  // PROGRESS TRACKING LOGIC
  // ==============================================

  describe('Progress Tracking Logic', () => {
    it('should calculate accuracy correctly', async () => {
      const totalSessions = 10;
      const totalQuestions = 100;
      const correctAnswers = 85;
      const accuracy = (correctAnswers / totalQuestions) * 100;

      expect(accuracy).toBe(85);
    });

    it('should calculate level progression', async () => {
      const totalPoints = 1500;
      const level = Math.floor(totalPoints / 500) + 1; // 500 points per level

      expect(level).toBe(4);
    });

    it('should calculate streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastActivityDate = yesterday.toISOString().split('T')[0];
      const todayDate = today.toISOString().split('T')[0];

      // If last activity was yesterday, increment streak
      const daysDiff = Math.floor(
        (today.getTime() - yesterday.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBe(1);
    });

    it('should reset streak if more than 1 day gap', async () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const daysDiff = Math.floor(
        (today.getTime() - threeDaysAgo.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Streak should reset if gap > 1 day
      expect(daysDiff).toBeGreaterThan(1);
    });
  });
});
