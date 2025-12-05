/**
 * SessionService Tests
 * Comprehensive unit tests for session service business logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '@/core/services/session.service';
import { SessionRepository, SessionEntity } from '@/core/repositories/session.repository';
import { UserRepository } from '@/core/repositories/user.repository';
import { NotFoundError, ValidationError } from '@/core/errors';

// Mock repositories
const createMockSessionRepository = (): jest.Mocked<SessionRepository> => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByUser: vi.fn(),
  findActiveByUser: vi.fn(),
  update: vi.fn(),
  completeSession: vi.fn(),
  abandonSession: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn(),
} as any);

const createMockUserRepository = (): jest.Mocked<UserRepository> => ({
  exists: vi.fn(),
  updateLastActive: vi.fn(),
  addPoints: vi.fn(),
  incrementStreak: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn(),
} as any);

const mockSession: SessionEntity = {
  id: 'session-123',
  user_id: 'user-123',
  status: 'active',
  started_at: new Date().toISOString(),
  type: 'vocabulary',
  score: 0,
  accuracy: 0,
  time_spent: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepo: jest.Mocked<SessionRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockSessionRepo = createMockSessionRepository();
    mockUserRepo = createMockUserRepository();
    service = new SessionService(mockSessionRepo, mockUserRepo);
  });

  describe('createSession', () => {
    it('should create session for existing user', async () => {
      const sessionData = {
        type: 'vocabulary' as const,
        difficulty: 'intermediate' as const,
      };

      mockUserRepo.exists.mockResolvedValue(true);
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.createSession('user-123', sessionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockUserRepo.exists).toHaveBeenCalledWith('user-123');
      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          type: 'vocabulary',
          status: 'active',
          difficulty: 'intermediate',
        })
      );
      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith('user-123');
    });

    it('should return error when user does not exist', async () => {
      mockUserRepo.exists.mockResolvedValue(false);

      const result = await service.createSession('nonexistent', { type: 'vocabulary' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with id \'nonexistent\' not found');
      expect(mockSessionRepo.create).not.toHaveBeenCalled();
    });

    it('should set default status to active', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockSessionRepo.create.mockResolvedValue(mockSession);

      await service.createSession('user-123', { type: 'flashcard' });

      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should set started_at timestamp', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const beforeTime = Date.now();
      await service.createSession('user-123', { type: 'vocabulary' });
      const afterTime = Date.now();

      const createCall = mockSessionRepo.create.mock.calls[0][0];
      expect(createCall.started_at).toBeDefined();

      const startedAtTime = new Date(createCall.started_at).getTime();
      expect(startedAtTime).toBeGreaterThanOrEqual(beforeTime);
      expect(startedAtTime).toBeLessThanOrEqual(afterTime);
    });

    it('should track user activity on session creation', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockSessionRepo.create.mockResolvedValue(mockSession);

      await service.createSession('user-123', { type: 'vocabulary' });

      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith('user-123');
    });

    it('should handle creation errors', async () => {
      mockUserRepo.exists.mockResolvedValue(true);
      mockSessionRepo.create.mockRejectedValue(new Error('Creation failed'));

      const result = await service.createSession('user-123', { type: 'vocabulary' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
    });
  });

  describe('getSession', () => {
    it('should return session when found', async () => {
      mockSessionRepo.findById.mockResolvedValue(mockSession);

      const result = await service.getSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockSessionRepo.findById).toHaveBeenCalledWith('session-123');
    });

    it('should return error when session not found', async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const result = await service.getSession('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session with id \'nonexistent\' not found');
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should handle repository errors', async () => {
      mockSessionRepo.findById.mockRejectedValue(new Error('Database error'));

      const result = await service.getSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions with default limit', async () => {
      const sessions = [mockSession, { ...mockSession, id: 'session-456' }];
      mockSessionRepo.findByUser.mockResolvedValue(sessions);

      const result = await service.getUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sessions);
      expect(mockSessionRepo.findByUser).toHaveBeenCalledWith('user-123', 10);
    });

    it('should respect custom limit', async () => {
      mockSessionRepo.findByUser.mockResolvedValue([]);

      await service.getUserSessions('user-123', 20);

      expect(mockSessionRepo.findByUser).toHaveBeenCalledWith('user-123', 20);
    });

    it('should return empty array when no sessions exist', async () => {
      mockSessionRepo.findByUser.mockResolvedValue([]);

      const result = await service.getUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      mockSessionRepo.findByUser.mockRejectedValue(new Error('Fetch failed'));

      const result = await service.getUserSessions('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch failed');
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions', async () => {
      const activeSessions = [mockSession];
      mockSessionRepo.findActiveByUser.mockResolvedValue(activeSessions);

      const result = await service.getActiveSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(activeSessions);
      expect(mockSessionRepo.findActiveByUser).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no active sessions', async () => {
      mockSessionRepo.findActiveByUser.mockResolvedValue([]);

      const result = await service.getActiveSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('completeSession', () => {
    const completionData = {
      score: 85,
      accuracy: 0.9,
      time_spent: 1800,
    };

    it('should complete active session', async () => {
      const completedSession = { ...mockSession, ...completionData, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      const result = await service.completeSession('session-123', completionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(completedSession);
      expect(mockSessionRepo.completeSession).toHaveBeenCalledWith('session-123', completionData);
    });

    it('should award points based on score', async () => {
      const completedSession = { ...mockSession, ...completionData, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      await service.completeSession('session-123', completionData);

      expect(mockUserRepo.addPoints).toHaveBeenCalledWith('user-123', 85);
    });

    it('should not award points for zero score', async () => {
      const noScoreData = { ...completionData, score: 0 };
      const completedSession = { ...mockSession, ...noScoreData, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      await service.completeSession('session-123', noScoreData);

      expect(mockUserRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should not award points when score not provided', async () => {
      const noScoreData = { accuracy: 0.9, time_spent: 1800 };
      const completedSession = { ...mockSession, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      await service.completeSession('session-123', noScoreData);

      expect(mockUserRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should round down fractional points', async () => {
      const dataWithFractionalScore = { ...completionData, score: 85.7 };
      const completedSession = { ...mockSession, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      await service.completeSession('session-123', dataWithFractionalScore);

      expect(mockUserRepo.addPoints).toHaveBeenCalledWith('user-123', 85);
    });

    it('should update user streak', async () => {
      const completedSession = { ...mockSession, ...completionData, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      await service.completeSession('session-123', completionData);

      expect(mockUserRepo.incrementStreak).toHaveBeenCalledWith('user-123');
    });

    it('should return error when session not found', async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const result = await service.completeSession('nonexistent', completionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session with id \'nonexistent\' not found');
    });

    it('should return error when session is not active', async () => {
      const completedSession = { ...mockSession, status: 'completed' as const };
      mockSessionRepo.findById.mockResolvedValue(completedSession);

      const result = await service.completeSession('session-123', completionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not active');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle completion errors', async () => {
      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockRejectedValue(new Error('Completion failed'));

      const result = await service.completeSession('session-123', completionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completion failed');
    });
  });

  describe('abandonSession', () => {
    it('should abandon active session', async () => {
      const abandonedSession = { ...mockSession, status: 'abandoned' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.abandonSession.mockResolvedValue(abandonedSession);

      const result = await service.abandonSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(abandonedSession);
      expect(mockSessionRepo.abandonSession).toHaveBeenCalledWith('session-123');
    });

    it('should return error when session not found', async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const result = await service.abandonSession('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session with id \'nonexistent\' not found');
    });

    it('should return error when session is not active', async () => {
      const completedSession = { ...mockSession, status: 'completed' as const };
      mockSessionRepo.findById.mockResolvedValue(completedSession);

      const result = await service.abandonSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not active');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle abandonment errors', async () => {
      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.abandonSession.mockRejectedValue(new Error('Abandon failed'));

      const result = await service.abandonSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Abandon failed');
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent session completions', async () => {
      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue({ ...mockSession, status: 'completed' });

      const operations = [
        service.completeSession('session-123', { score: 80 }),
        service.completeSession('session-456', { score: 90 }),
        service.completeSession('session-789', { score: 95 }),
      ];

      const results = await Promise.all(operations);

      expect(results.every(r => r.success)).toBe(true);
      expect(mockSessionRepo.completeSession).toHaveBeenCalledTimes(3);
    });

    it('should handle negative scores gracefully', async () => {
      const completedSession = { ...mockSession, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      await service.completeSession('session-123', { score: -10 });

      // Negative scores should not award points
      expect(mockUserRepo.addPoints).not.toHaveBeenCalled();
    });

    it('should handle very high time_spent values', async () => {
      const longSession = { score: 100, accuracy: 1.0, time_spent: 86400 }; // 24 hours
      const completedSession = { ...mockSession, ...longSession, status: 'completed' as const };

      mockSessionRepo.findById.mockResolvedValue(mockSession);
      mockSessionRepo.completeSession.mockResolvedValue(completedSession);

      const result = await service.completeSession('session-123', longSession);

      expect(result.success).toBe(true);
      expect(mockSessionRepo.completeSession).toHaveBeenCalledWith('session-123', longSession);
    });
  });
});
