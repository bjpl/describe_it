/**
 * Tests for SessionRepository
 * Comprehensive coverage of session management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionRepository, SessionEntity } from '@/core/repositories/session.repository';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockSupabase: any;
  let mockQueryBuilder: any;

  const mockSession: SessionEntity = {
    id: 'session-123',
    user_id: 'user-456',
    session_type: 'flashcards',
    status: 'active',
    vocabulary_items: ['word1', 'word2', 'word3'],
    score: 85,
    accuracy: 0.85,
    time_spent: 300,
    session_data: { difficulty: 'medium' },
    device_info: { platform: 'web', browser: 'chrome' },
    started_at: '2024-01-01T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
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

    repository = new SessionRepository(mockSupabase);
  });

  describe('Inherited Methods', () => {
    describe('findById', () => {
      it('should find session by ID', async () => {
        mockQueryBuilder.single.mockResolvedValue({
          data: mockSession,
          error: null,
        });

        const result = await repository.findById('session-123');

        expect(result).toEqual(mockSession);
        expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
      });
    });

    describe('create', () => {
      it('should create new session', async () => {
        const newSession = {
          user_id: 'user-456',
          session_type: 'quiz' as const,
          status: 'active' as const,
          started_at: '2024-01-02T10:00:00Z',
        };

        const createdSession: SessionEntity = {
          id: 'session-new',
          ...newSession,
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        };

        mockQueryBuilder.single.mockResolvedValue({
          data: createdSession,
          error: null,
        });

        const result = await repository.create(newSession);

        expect(result).toEqual(createdSession);
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(newSession);
      });
    });
  });

  describe('findActiveByUser', () => {
    it('should find all active sessions for user', async () => {
      const activeSessions: SessionEntity[] = [
        { ...mockSession, id: 'session-1' },
        { ...mockSession, id: 'session-2' },
      ];

      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: activeSessions, error: null });
        }),
      });

      const result = await repository.findActiveByUser('user-456');

      expect(result).toEqual(activeSessions);
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-456');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('started_at', { ascending: false });
    });

    it('should return empty array when no active sessions', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: null, error: null });
        }),
      });

      const result = await repository.findActiveByUser('user-456');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: null, error: { message: 'Database error' } });
        }),
      });

      const result = await repository.findActiveByUser('user-456');

      expect(result).toEqual([]);
    });

    it('should order by started_at descending', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      });

      await repository.findActiveByUser('user-456');

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('started_at', { ascending: false });
    });
  });

  describe('findByUser', () => {
    it('should find sessions for user with default limit', async () => {
      const userSessions: SessionEntity[] = [
        { ...mockSession, id: 'session-1' },
        { ...mockSession, id: 'session-2' },
      ];

      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: userSessions, error: null });
        }),
      });

      const result = await repository.findByUser('user-456');

      expect(result).toEqual(userSessions);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-456');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should find sessions with custom limit', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      });

      await repository.findByUser('user-456', 25);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
    });

    it('should order by started_at descending', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      });

      await repository.findByUser('user-456');

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('started_at', { ascending: false });
    });

    it('should return empty array when no sessions', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: null, error: null });
        }),
      });

      const result = await repository.findByUser('user-456');

      expect(result).toEqual([]);
    });

    it('should handle limit of 1', async () => {
      const singleSession = [mockSession];

      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: singleSession, error: null });
        }),
      });

      const result = await repository.findByUser('user-456', 1);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    it('should handle large limit values', async () => {
      Object.assign(mockQueryBuilder, {
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      });

      await repository.findByUser('user-456', 1000);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1000);
    });
  });

  describe('completeSession', () => {
    it('should complete session with full data', async () => {
      const completionData = {
        score: 90,
        accuracy: 0.9,
        time_spent: 450,
      };

      const completedSession: SessionEntity = {
        ...mockSession,
        ...completionData,
        status: 'completed',
        completed_at: '2024-01-01T10:30:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: completedSession,
        error: null,
      });

      const result = await repository.completeSession('session-123', completionData);

      expect(result.status).toBe('completed');
      expect(result.score).toBe(90);
      expect(result.accuracy).toBe(0.9);
      expect(result.time_spent).toBe(450);
      expect(result.completed_at).toBeDefined();
    });

    it('should complete session with partial data', async () => {
      const completionData = {
        score: 75,
      };

      const completedSession: SessionEntity = {
        ...mockSession,
        score: 75,
        status: 'completed',
        completed_at: '2024-01-01T10:30:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: completedSession,
        error: null,
      });

      const result = await repository.completeSession('session-123', completionData);

      expect(result.status).toBe('completed');
      expect(result.score).toBe(75);
    });

    it('should set completed_at timestamp', async () => {
      let capturedUpdate: any;
      mockQueryBuilder.update.mockImplementation((data: any) => {
        capturedUpdate = data;
        return mockQueryBuilder;
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      await repository.completeSession('session-123', { score: 100 });

      expect(capturedUpdate).toHaveProperty('completed_at');
      expect(capturedUpdate.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(capturedUpdate.status).toBe('completed');
    });

    it('should complete session with zero score', async () => {
      const completionData = {
        score: 0,
        accuracy: 0,
        time_spent: 100,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockSession, ...completionData, status: 'completed' },
        error: null,
      });

      const result = await repository.completeSession('session-123', completionData);

      expect(result.score).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('should complete session with only time_spent', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockSession, time_spent: 200, status: 'completed' },
        error: null,
      });

      const result = await repository.completeSession('session-123', { time_spent: 200 });

      expect(result.time_spent).toBe(200);
      expect(result.status).toBe('completed');
    });
  });

  describe('abandonSession', () => {
    it('should abandon session and set completed_at', async () => {
      const abandonedSession: SessionEntity = {
        ...mockSession,
        status: 'abandoned',
        completed_at: '2024-01-01T10:15:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: abandonedSession,
        error: null,
      });

      const result = await repository.abandonSession('session-123');

      expect(result.status).toBe('abandoned');
      expect(result.completed_at).toBeDefined();
    });

    it('should set completed_at timestamp', async () => {
      let capturedUpdate: any;
      mockQueryBuilder.update.mockImplementation((data: any) => {
        capturedUpdate = data;
        return mockQueryBuilder;
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      await repository.abandonSession('session-123');

      expect(capturedUpdate).toHaveProperty('completed_at');
      expect(capturedUpdate.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(capturedUpdate.status).toBe('abandoned');
    });

    it('should handle abandoning already completed session', async () => {
      const alreadyCompleted: SessionEntity = {
        ...mockSession,
        status: 'completed',
        completed_at: '2024-01-01T10:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: { ...alreadyCompleted, status: 'abandoned' },
        error: null,
      });

      const result = await repository.abandonSession('session-123');

      expect(result.status).toBe('abandoned');
    });
  });

  describe('Session Types', () => {
    const sessionTypes: Array<SessionEntity['session_type']> = [
      'practice',
      'flashcards',
      'quiz',
      'matching',
      'writing',
    ];

    sessionTypes.forEach((type) => {
      it(`should handle ${type} session type`, async () => {
        const session: SessionEntity = {
          ...mockSession,
          session_type: type,
        };

        mockQueryBuilder.single.mockResolvedValue({
          data: session,
          error: null,
        });

        const result = await repository.findById('session-123');

        expect(result?.session_type).toBe(type);
      });
    });
  });

  describe('Session Statuses', () => {
    const statuses: Array<SessionEntity['status']> = ['active', 'completed', 'abandoned'];

    statuses.forEach((status) => {
      it(`should handle ${status} status`, async () => {
        const session: SessionEntity = {
          ...mockSession,
          status,
        };

        mockQueryBuilder.single.mockResolvedValue({
          data: session,
          error: null,
        });

        const result = await repository.findById('session-123');

        expect(result?.status).toBe(status);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with no vocabulary items', async () => {
      const session: SessionEntity = {
        ...mockSession,
        vocabulary_items: undefined,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: session,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.vocabulary_items).toBeUndefined();
    });

    it('should handle session with empty vocabulary array', async () => {
      const session: SessionEntity = {
        ...mockSession,
        vocabulary_items: [],
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: session,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.vocabulary_items).toEqual([]);
    });

    it('should handle session without optional fields', async () => {
      const minimalSession: SessionEntity = {
        id: 'session-minimal',
        user_id: 'user-456',
        session_type: 'practice',
        status: 'active',
        started_at: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: minimalSession,
        error: null,
      });

      const result = await repository.findById('session-minimal');

      expect(result).toEqual(minimalSession);
      expect(result?.score).toBeUndefined();
      expect(result?.accuracy).toBeUndefined();
      expect(result?.time_spent).toBeUndefined();
    });

    it('should handle session with complex session_data', async () => {
      const complexData = {
        difficulty: 'hard',
        categories: ['nouns', 'verbs'],
        settings: { timed: true, hints_enabled: false },
        metadata: { version: '2.0' },
      };

      const session: SessionEntity = {
        ...mockSession,
        session_data: complexData,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: session,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.session_data).toEqual(complexData);
    });

    it('should handle session with complex device_info', async () => {
      const deviceInfo = {
        platform: 'mobile',
        os: 'iOS',
        version: '15.0',
        browser: 'Safari',
        screen_size: '375x667',
      };

      const session: SessionEntity = {
        ...mockSession,
        device_info: deviceInfo,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: session,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.device_info).toEqual(deviceInfo);
    });

    it('should handle very long session duration', async () => {
      const longSession: SessionEntity = {
        ...mockSession,
        time_spent: 86400, // 24 hours in seconds
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: longSession,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.time_spent).toBe(86400);
    });

    it('should handle perfect score and accuracy', async () => {
      const perfectSession: SessionEntity = {
        ...mockSession,
        score: 100,
        accuracy: 1.0,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: perfectSession,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.score).toBe(100);
      expect(result?.accuracy).toBe(1.0);
    });

    it('should handle zero score and accuracy', async () => {
      const zeroSession: SessionEntity = {
        ...mockSession,
        score: 0,
        accuracy: 0,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: zeroSession,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.score).toBe(0);
      expect(result?.accuracy).toBe(0);
    });

    it('should handle fractional accuracy values', async () => {
      const fractionalSession: SessionEntity = {
        ...mockSession,
        accuracy: 0.856789,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: fractionalSession,
        error: null,
      });

      const result = await repository.findById('session-123');

      expect(result?.accuracy).toBeCloseTo(0.856789);
    });
  });
});
