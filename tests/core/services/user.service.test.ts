/**
 * UserService Tests
 * Comprehensive unit tests for user service business logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/core/services/user.service';
import { UserRepository, UserEntity } from '@/core/repositories/user.repository';
import { NotFoundError, ValidationError } from '@/core/errors';

// Mock UserRepository
const createMockUserRepository = (): jest.Mocked<UserRepository> => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  exists: vi.fn(),
  update: vi.fn(),
  updateLastActive: vi.fn(),
  addPoints: vi.fn(),
  incrementStreak: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn(),
} as any);

const mockUser: UserEntity = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  points: 100,
  level: 5,
  streak: 7,
  lastActive: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepo = createMockUserRepository();
    service = new UserService(mockUserRepo);
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getUser('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeUndefined();
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return error when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.getUser('nonexistent');

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe('User with id \'nonexistent\' not found');
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database connection failed');
      mockUserRepo.findById.mockRejectedValue(dbError);

      const result = await service.getUser('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should validate email format', async () => {
      const result = await service.getUserByEmail('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
    });

    it('should reject empty email', async () => {
      const result = await service.getUserByEmail('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should return error when user not found by email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const result = await service.getUserByEmail('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.code).toBe('NOT_FOUND');
    });
  });

  describe('updateUser', () => {
    it('should update user when exists', async () => {
      const updates = { displayName: 'New Name', points: 200 };
      const updatedUser = { ...mockUser, ...updates };

      mockUserRepo.exists.mockResolvedValue(true);
      mockUserRepo.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('user-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(mockUserRepo.exists).toHaveBeenCalledWith('user-123');
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', updates);
      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith('user-123');
    });

    it('should return error when user does not exist', async () => {
      mockUserRepo.exists.mockResolvedValue(false);

      const result = await service.updateUser('nonexistent', { displayName: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with id \'nonexistent\' not found');
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('should update lastActive timestamp', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockUserRepo.update.mockResolvedValue(mockUser);

      await service.updateUser('user-123', { displayName: 'Test' });

      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith('user-123');
    });

    it('should handle update errors', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockUserRepo.update.mockRejectedValue(new Error('Update failed'));

      const result = await service.updateUser('user-123', { displayName: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('trackActivity', () => {
    it('should update user last active timestamp', async () => {
      mockUserRepo.updateLastActive.mockResolvedValue(undefined);

      const result = await service.trackActivity('user-123');

      expect(result.success).toBe(true);
      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith('user-123');
    });

    it('should handle tracking errors', async () => {
      mockUserRepo.updateLastActive.mockRejectedValue(new Error('Tracking failed'));

      const result = await service.trackActivity('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tracking failed');
    });
  });

  describe('awardPoints', () => {
    it('should award points to user', async () => {
      const updatedUser = { ...mockUser, points: mockUser.points + 50 };

      mockUserRepo.addPoints.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue(updatedUser);

      const result = await service.awardPoints('user-123', 50);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(mockUserRepo.addPoints).toHaveBeenCalledWith('user-123', 50);
    });

    it('should reject zero or negative points', async () => {
      const result = await service.awardPoints('user-123', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Points must be positive');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(mockUserRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should reject negative points', async () => {
      const result = await service.awardPoints('user-123', -10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Points must be positive');
    });

    it('should handle user not found after awarding', async () => {
      mockUserRepo.addPoints.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.awardPoints('user-123', 50);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with id \'user-123\' not found');
    });

    it('should handle points award errors', async () => {
      mockUserRepo.addPoints.mockRejectedValue(new Error('Award failed'));

      const result = await service.awardPoints('user-123', 50);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Award failed');
    });
  });

  describe('updateStreak', () => {
    it('should increment user streak', async () => {
      const updatedUser = { ...mockUser, streak: mockUser.streak + 1 };

      mockUserRepo.incrementStreak.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue(updatedUser);

      const result = await service.updateStreak('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(mockUserRepo.incrementStreak).toHaveBeenCalledWith('user-123');
    });

    it('should handle user not found after updating streak', async () => {
      mockUserRepo.incrementStreak.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.updateStreak('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with id \'user-123\' not found');
    });

    it('should handle streak update errors', async () => {
      mockUserRepo.incrementStreak.mockRejectedValue(new Error('Streak update failed'));

      const result = await service.updateStreak('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Streak update failed');
    });
  });

  describe('error handling', () => {
    it('should catch and wrap NotFoundError', async () => {
      const error = new NotFoundError('User', 'user-123');
      mockUserRepo.findById.mockRejectedValue(error);

      const result = await service.getUser('user-123');

      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should catch and wrap ValidationError', async () => {
      const error = new ValidationError('Invalid input');
      mockUserRepo.update.mockRejectedValue(error);
      mockUserRepo.exists.mockResolvedValue(true);

      const result = await service.updateUser('user-123', {});

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle generic errors', async () => {
      mockUserRepo.findById.mockRejectedValue(new Error('Unexpected error'));

      const result = await service.getUser('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent updates', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockUserRepo.update.mockResolvedValue(mockUser);

      const updates = [
        service.updateUser('user-123', { displayName: 'Name1' }),
        service.updateUser('user-123', { displayName: 'Name2' }),
        service.updateUser('user-123', { displayName: 'Name3' }),
      ];

      const results = await Promise.all(updates);

      expect(results.every(r => r.success)).toBe(true);
      expect(mockUserRepo.update).toHaveBeenCalledTimes(3);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail(longEmail);

      expect(result.success).toBe(true);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(longEmail);
    });

    it('should handle large point awards', async () => {
      mockUserRepo.addPoints.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue({ ...mockUser, points: 1000000 });

      const result = await service.awardPoints('user-123', 999900);

      expect(result.success).toBe(true);
      expect(result.data?.points).toBe(1000000);
    });
  });
});
