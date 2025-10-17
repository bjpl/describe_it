/**
 * Progress Tracking Integration Tests
 * Tests progress/stats, progress/streak, and progress/analytics endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js modules
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      headers: init?.headers || {},
      json: () => Promise.resolve(body),
    }),
  },
}));

// Mock authentication
vi.mock('@/lib/middleware/withAuth', () => ({
  withBasicAuth: (handler: any) => handler,
}));

// Mock DatabaseService
const mockDatabaseService = {
  getUser: vi.fn(),
  getUserSessions: vi.fn(),
  getLearningProgress: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  DatabaseService: mockDatabaseService,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Progress Tracking API Integration Tests', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================
  // PROGRESS STATS ENDPOINT TESTS
  // ==============================================

  describe('GET /api/progress/stats', () => {
    it('should return comprehensive progress statistics', async () => {
      const mockUser = {
        id: testUserId,
        total_points: 1500,
        current_streak: 10,
        longest_streak: 15,
        last_active_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockSessions = [
        {
          id: 'session-1',
          user_id: testUserId,
          session_type: 'flashcard',
          started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          time_spent: 1200, // 20 minutes in seconds
          accuracy: 85,
          score: 450,
        },
        {
          id: 'session-2',
          user_id: testUserId,
          session_type: 'quiz',
          started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          time_spent: 900, // 15 minutes
          accuracy: 90,
          score: 500,
        },
      ];

      const mockLearningProgress = Array.from({ length: 100 }, (_, i) => ({
        id: `progress-${i}`,
        user_id: testUserId,
        phrase_id: `phrase-${i}`,
        mastery_level: i < 50 ? 0.9 : i < 80 ? 0.5 : 0.2,
        created_at: new Date().toISOString(),
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);
      mockDatabaseService.getLearningProgress.mockResolvedValue(mockLearningProgress);

      // Import the handler
      const { GET } = await import('@/app/api/progress/stats/route');

      const mockRequest = {
        user: { id: testUserId },
      };

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total_points');
      expect(data.data).toHaveProperty('completion_rate');
      expect(data.data).toHaveProperty('this_week');
      expect(data.data).toHaveProperty('achievements');
      expect(data.data).toHaveProperty('improvement_trend');
      expect(data.data).toHaveProperty('next_milestones');

      // Verify calculation accuracy
      expect(data.data.total_points).toBe(1500);
      expect(data.data.this_week.sessions_completed).toBe(2);
      expect(data.data.achievements).toBeInstanceOf(Array);
    });

    it('should calculate weekly statistics correctly', async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const mockUser = {
        id: testUserId,
        total_points: 500,
        current_streak: 5,
        longest_streak: 7,
      };

      const mockSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        user_id: testUserId,
        session_type: 'practice',
        started_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        time_spent: 600,
        accuracy: 75 + i * 2,
        score: 200 + i * 10,
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);
      mockDatabaseService.getLearningProgress.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/stats/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.this_week.sessions_completed).toBeGreaterThan(0);
      expect(data.data.this_week.time_spent_minutes).toBeGreaterThan(0);
      expect(data.data.this_week.accuracy).toBeGreaterThan(0);
    });

    it('should generate appropriate achievements', async () => {
      const mockUser = {
        id: testUserId,
        total_points: 1200,
        current_streak: 8,
        longest_streak: 10,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockLearningProgress = Array.from({ length: 55 }, (_, i) => ({
        id: `progress-${i}`,
        mastery_level: 0.85,
        created_at: new Date().toISOString(),
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue([]);
      mockDatabaseService.getLearningProgress.mockResolvedValue(mockLearningProgress);

      const { GET } = await import('@/app/api/progress/stats/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.achievements).toBeInstanceOf(Array);
      expect(data.data.achievements.length).toBeGreaterThan(0);

      // Should have "Week Warrior" achievement (7+ day streak)
      const weekWarrior = data.data.achievements.find((a: any) => a.id === 'streak_7');
      expect(weekWarrior).toBeDefined();

      // Should have "Point Master" achievement (1000+ points)
      const pointMaster = data.data.achievements.find((a: any) => a.id === 'points_1000');
      expect(pointMaster).toBeDefined();

      // Should have "Vocabulary Builder" achievement (50+ mastered)
      const vocabBuilder = data.data.achievements.find((a: any) => a.id === 'phrases_50');
      expect(vocabBuilder).toBeDefined();
    });

    it('should handle users with no activity', async () => {
      mockDatabaseService.getUser.mockResolvedValue({
        id: testUserId,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
      });
      mockDatabaseService.getUserSessions.mockResolvedValue([]);
      mockDatabaseService.getLearningProgress.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/stats/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.total_points).toBe(0);
      expect(data.data.this_week.sessions_completed).toBe(0);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const { GET } = await import('@/app/api/progress/stats/route');

      const mockRequest = { user: null };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  // ==============================================
  // STREAK ENDPOINT TESTS
  // ==============================================

  describe('GET /api/progress/streak', () => {
    it('should return current and longest streak', async () => {
      const mockUser = {
        id: testUserId,
        current_streak: 12,
        longest_streak: 20,
        last_active_at: new Date().toISOString(),
      };

      const mockSessions = Array.from({ length: 15 }, (_, i) => ({
        id: `session-${i}`,
        user_id: testUserId,
        started_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        score: 300,
        time_spent: 900,
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);

      const { GET } = await import('@/app/api/progress/streak/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('current_streak');
      expect(data.data).toHaveProperty('longest_streak');
      expect(data.data).toHaveProperty('today_completed');
      expect(data.data).toHaveProperty('streak_history');
      expect(data.data).toHaveProperty('next_milestone');
    });

    it('should detect if today has activity', async () => {
      const mockUser = {
        id: testUserId,
        current_streak: 5,
        longest_streak: 10,
      };

      const todaySession = {
        id: 'today-session',
        user_id: testUserId,
        started_at: new Date().toISOString(),
        status: 'completed',
        score: 400,
      };

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue([todaySession]);

      const { GET } = await import('@/app/api/progress/streak/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.today_completed).toBe(true);
    });

    it('should provide 30-day streak history', async () => {
      const mockUser = {
        id: testUserId,
        current_streak: 8,
        longest_streak: 12,
      };

      const mockSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        user_id: testUserId,
        started_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        score: 250 + i * 10,
        time_spent: 600,
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);

      const { GET } = await import('@/app/api/progress/streak/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.streak_history).toBeInstanceOf(Array);
      expect(data.data.streak_history.length).toBe(30);

      // Each day should have required properties
      data.data.streak_history.forEach((day: any) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('sessions');
        expect(day).toHaveProperty('points_earned');
      });
    });

    it('should calculate next milestone correctly', async () => {
      const mockUser = {
        id: testUserId,
        current_streak: 5,
        longest_streak: 8,
      };

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/streak/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.next_milestone.target_days).toBeGreaterThan(5);
      expect(data.data.next_milestone.days_remaining).toBeGreaterThan(0);
      expect(data.data.next_milestone.target_days).toBe(7); // Next milestone after 5 is 7
    });
  });

  // ==============================================
  // ANALYTICS ENDPOINT TESTS
  // ==============================================

  describe('GET /api/progress/analytics', () => {
    it('should return detailed learning analytics', async () => {
      const mockUser = {
        id: testUserId,
        learning_level: 'intermediate',
      };

      const mockLearningProgress = Array.from({ length: 100 }, (_, i) => ({
        id: `progress-${i}`,
        mastery_level: i < 60 ? 0.9 : i < 85 ? 0.5 : 0.2,
        created_at: new Date().toISOString(),
      }));

      const mockSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        session_type: i % 3 === 0 ? 'flashcard' : i % 3 === 1 ? 'quiz' : 'practice',
        started_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        score: 300 + i * 5,
        accuracy: 70 + i * 2,
        time_spent: 600,
        vocabulary_items: Array(5).fill({}),
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getLearningProgress.mockResolvedValue(mockLearningProgress);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);

      const { GET } = await import('@/app/api/progress/analytics/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('skill_breakdown');
      expect(data.data).toHaveProperty('recent_activity');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('performance_trends');
    });

    it('should calculate skill breakdown correctly', async () => {
      const mockUser = { id: testUserId };

      const mockLearningProgress = [
        ...Array.from({ length: 40 }, (_, i) => ({
          id: `mastered-${i}`,
          mastery_level: 0.85,
        })),
        ...Array.from({ length: 35 }, (_, i) => ({
          id: `learning-${i}`,
          mastery_level: 0.5,
        })),
        ...Array.from({ length: 25 }, (_, i) => ({
          id: `new-${i}`,
          mastery_level: 0.15,
        })),
      ];

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getLearningProgress.mockResolvedValue(mockLearningProgress);
      mockDatabaseService.getUserSessions.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/analytics/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      const vocab = data.data.skill_breakdown.vocabulary;
      expect(vocab.total).toBe(100);
      expect(vocab.mastered).toBe(40);
      expect(vocab.learning).toBe(35);
      expect(vocab.new).toBe(25);
    });

    it('should provide personalized recommendations', async () => {
      const mockUser = {
        id: testUserId,
        learning_level: 'beginner',
      };

      const mockSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        accuracy: 90 + i, // High accuracy
        score: 400,
        vocabulary_items: Array(5).fill({}),
        started_at: new Date().toISOString(),
      }));

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);
      mockDatabaseService.getLearningProgress.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/analytics/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.recommendations).toHaveProperty('focus_areas');
      expect(data.data.recommendations).toHaveProperty('suggested_difficulty');
      expect(data.data.recommendations).toHaveProperty('daily_goal_suggestion');
      expect(data.data.recommendations).toHaveProperty('next_topics');

      // High accuracy should suggest moving to intermediate
      expect(data.data.recommendations.suggested_difficulty).toBe('intermediate');
    });

    it('should track performance trends', async () => {
      const mockUser = { id: testUserId };

      const mockSessions = Array.from({ length: 30 }, (_, i) => {
        const hour = 9 + (i % 12); // Distribute across morning/afternoon
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(hour);

        return {
          id: `session-${i}`,
          started_at: date.toISOString(),
          status: 'completed',
          score: 300 + i * 5,
          session_type: i % 2 === 0 ? 'flashcard' : 'quiz',
        };
      });

      mockDatabaseService.getUser.mockResolvedValue(mockUser);
      mockDatabaseService.getUserSessions.mockResolvedValue(mockSessions);
      mockDatabaseService.getLearningProgress.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/analytics/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.data.performance_trends).toHaveProperty('weekly_average');
      expect(data.data.performance_trends).toHaveProperty('monthly_average');
      expect(data.data.performance_trends).toHaveProperty('best_time_of_day');
      expect(data.data.performance_trends).toHaveProperty('best_session_type');
    });

    it('should handle errors gracefully', async () => {
      mockDatabaseService.getUser.mockRejectedValue(new Error('Database error'));

      const { GET } = await import('@/app/api/progress/analytics/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ==============================================
  // CACHING AND PERFORMANCE TESTS
  // ==============================================

  describe('Caching and Performance', () => {
    it('should include cache headers in responses', async () => {
      mockDatabaseService.getUser.mockResolvedValue({ id: testUserId });
      mockDatabaseService.getUserSessions.mockResolvedValue([]);
      mockDatabaseService.getLearningProgress.mockResolvedValue([]);

      const { GET } = await import('@/app/api/progress/stats/route');

      const mockRequest = { user: { id: testUserId } };
      const response = await GET(mockRequest as any);

      expect(response.headers['Cache-Control']).toBeDefined();
    });

    it('should complete within reasonable time', async () => {
      mockDatabaseService.getUser.mockResolvedValue({ id: testUserId });
      mockDatabaseService.getUserSessions.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          id: `session-${i}`,
          status: 'completed',
          score: 300,
        }))
      );
      mockDatabaseService.getLearningProgress.mockResolvedValue(
        Array.from({ length: 500 }, (_, i) => ({
          id: `progress-${i}`,
          mastery_level: 0.5,
        }))
      );

      const { GET } = await import('@/app/api/progress/analytics/route');

      const startTime = performance.now();
      const mockRequest = { user: { id: testUserId } };
      await GET(mockRequest as any);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
