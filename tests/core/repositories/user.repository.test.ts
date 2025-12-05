/**
 * Tests for UserRepository
 * Comprehensive coverage of user-specific operations and business logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository, UserEntity } from '@/core/repositories/user.repository';
import { SupabaseClient } from '@supabase/supabase-js';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockSupabase: any;
  let mockQueryBuilder: any;

  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    learning_level: 'intermediate',
    subscription_status: 'premium',
    total_points: 1000,
    current_streak: 5,
    longest_streak: 10,
    last_active_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockSupabase = {
      from: vi.fn(() => mockQueryBuilder),
    } as unknown as SupabaseClient;

    repository = new UserRepository(mockSupabase);
  });

  describe('Inherited Methods', () => {
    describe('findById', () => {
      it('should find user by ID', async () => {
        mockQueryBuilder.single.mockResolvedValue({
          data: mockUser,
          error: null,
        });

        const result = await repository.findById('user-123');

        expect(result).toEqual(mockUser);
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'user-123');
      });

      it('should return null for non-existent user', async () => {
        mockQueryBuilder.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        });

        const result = await repository.findById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('should create new user with default values', async () => {
        const newUser = {
          email: 'newuser@example.com',
          full_name: 'New User',
          learning_level: 'beginner' as const,
          subscription_status: 'free' as const,
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
        };

        const createdUser: UserEntity = {
          id: 'new-user-123',
          ...newUser,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        };

        mockQueryBuilder.single.mockResolvedValue({
          data: createdUser,
          error: null,
        });

        const result = await repository.create(newUser);

        expect(result).toEqual(createdUser);
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(newUser);
      });
    });

    describe('update', () => {
      it('should update user profile', async () => {
        const updates = {
          full_name: 'Updated Name',
          learning_level: 'advanced' as const,
        };

        const updatedUser: UserEntity = {
          ...mockUser,
          ...updates,
          updated_at: '2024-01-02T00:00:00Z',
        };

        mockQueryBuilder.single.mockResolvedValue({
          data: updatedUser,
          error: null,
        });

        const result = await repository.update('user-123', updates);

        expect(result.full_name).toBe('Updated Name');
        expect(result.learning_level).toBe('advanced');
      });
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('email', 'test@example.com');
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should return null when email not found', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle email case sensitivity', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('email', 'TEST@EXAMPLE.COM');
    });

    it('should return null on database error', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
      });

      const result = await repository.findByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateLastActive', () => {
    it('should update last active timestamp', async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      await repository.updateLastActive('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should set current timestamp', async () => {
      let capturedUpdate: any;
      mockQueryBuilder.update.mockImplementation((data: any) => {
        capturedUpdate = data;
        return mockQueryBuilder;
      });

      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const beforeTime = new Date().toISOString();
      await repository.updateLastActive('user-123');
      const afterTime = new Date().toISOString();

      expect(capturedUpdate).toHaveProperty('last_active_at');
      expect(capturedUpdate).toHaveProperty('updated_at');
      expect(capturedUpdate.last_active_at).toBeDefined();
      // Timestamp should be between before and after
      expect(capturedUpdate.last_active_at >= beforeTime).toBe(true);
      expect(capturedUpdate.last_active_at <= afterTime).toBe(true);
    });

    it('should handle update errors silently', async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      await expect(repository.updateLastActive('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('incrementStreak', () => {
    it('should increment current streak by 1', async () => {
      // Mock findById
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      // Mock update
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockUser, current_streak: 6 },
        error: null,
      });

      await repository.incrementStreak('user-123');

      // Verify update was called with correct values
      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.current_streak).toBe(6);
    });

    it('should update longest streak when current exceeds it', async () => {
      const userWithStreak = {
        ...mockUser,
        current_streak: 10,
        longest_streak: 10,
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: userWithStreak,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...userWithStreak, current_streak: 11, longest_streak: 11 },
        error: null,
      });

      await repository.incrementStreak('user-123');

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.current_streak).toBe(11);
      expect(updateCall.longest_streak).toBe(11);
    });

    it('should not update longest streak when current is less', async () => {
      const userWithStreak = {
        ...mockUser,
        current_streak: 5,
        longest_streak: 15,
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: userWithStreak,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...userWithStreak, current_streak: 6 },
        error: null,
      });

      await repository.incrementStreak('user-123');

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.current_streak).toBe(6);
      expect(updateCall.longest_streak).toBe(15);
    });

    it('should handle non-existent user gracefully', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(repository.incrementStreak('nonexistent')).resolves.not.toThrow();
    });

    it('should increment from zero streak', async () => {
      const newUser = {
        ...mockUser,
        current_streak: 0,
        longest_streak: 0,
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: newUser,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...newUser, current_streak: 1, longest_streak: 1 },
        error: null,
      });

      await repository.incrementStreak('user-123');

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.current_streak).toBe(1);
      expect(updateCall.longest_streak).toBe(1);
    });
  });

  describe('addPoints', () => {
    it('should add points to user total', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockUser, total_points: 1100 },
        error: null,
      });

      await repository.addPoints('user-123', 100);

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.total_points).toBe(1100);
    });

    it('should add negative points (deduction)', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockUser, total_points: 900 },
        error: null,
      });

      await repository.addPoints('user-123', -100);

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.total_points).toBe(900);
    });

    it('should handle zero points addition', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      await repository.addPoints('user-123', 0);

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.total_points).toBe(1000);
    });

    it('should handle large point values', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockUser, total_points: 11000 },
        error: null,
      });

      await repository.addPoints('user-123', 10000);

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.total_points).toBe(11000);
    });

    it('should handle non-existent user gracefully', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(repository.addPoints('nonexistent', 100)).resolves.not.toThrow();
    });

    it('should add points to user with zero points', async () => {
      const userWithNoPoints = {
        ...mockUser,
        total_points: 0,
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: userWithNoPoints,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...userWithNoPoints, total_points: 50 },
        error: null,
      });

      await repository.addPoints('user-123', 50);

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.total_points).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with optional fields missing', async () => {
      const minimalUser: UserEntity = {
        id: 'user-456',
        learning_level: 'beginner',
        subscription_status: 'free',
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: minimalUser,
        error: null,
      });

      const result = await repository.findById('user-456');

      expect(result).toEqual(minimalUser);
      expect(result?.email).toBeUndefined();
      expect(result?.full_name).toBeUndefined();
    });

    it('should handle all learning levels', async () => {
      const levels: Array<'beginner' | 'intermediate' | 'advanced'> = [
        'beginner',
        'intermediate',
        'advanced',
      ];

      for (const level of levels) {
        const user = { ...mockUser, learning_level: level };
        mockQueryBuilder.single.mockResolvedValue({
          data: user,
          error: null,
        });

        const result = await repository.findById('user-123');
        expect(result?.learning_level).toBe(level);
      }
    });

    it('should handle all subscription statuses', async () => {
      const statuses: Array<'free' | 'premium' | 'trial'> = ['free', 'premium', 'trial'];

      for (const status of statuses) {
        const user = { ...mockUser, subscription_status: status };
        mockQueryBuilder.single.mockResolvedValue({
          data: user,
          error: null,
        });

        const result = await repository.findById('user-123');
        expect(result?.subscription_status).toBe(status);
      }
    });

    it('should handle special characters in email', async () => {
      const specialEmail = "user+test@example.com";
      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockUser, email: specialEmail },
        error: null,
      });

      const result = await repository.findByEmail(specialEmail);

      expect(result?.email).toBe(specialEmail);
    });

    it('should handle special characters in full name', async () => {
      const specialName = "O'Brien-Smith Jr.";
      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockUser, full_name: specialName },
        error: null,
      });

      const result = await repository.findById('user-123');

      expect(result?.full_name).toBe(specialName);
    });
  });
});
