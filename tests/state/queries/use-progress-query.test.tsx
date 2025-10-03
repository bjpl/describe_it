import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProgressStats,
  useStreakInfo,
  useLearningAnalytics,
  useProgressSummary,
  updateProgress,
} from '@/hooks/useProgressTracking';
import { ReactNode } from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useProgressStats - Data Loading', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load progress stats', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.total_points).toBeGreaterThanOrEqual(0);
  });

  it('should calculate completion rate', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.completion_rate).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.completion_rate).toBeLessThanOrEqual(100);
  });

  it('should track improvement trend', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.improvement_trend).toMatch(/improving|stable|declining/);
  });

  it('should provide weekly stats', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.this_week).toBeDefined();
    expect(result.current.data?.this_week.points).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.this_week.sessions).toBeGreaterThanOrEqual(0);
  });

  it('should list achievements', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(Array.isArray(result.current.data?.achievements)).toBe(true);
  });

  it('should show next milestones', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.next_milestones).toBeDefined();
  });
});

describe('useStreakInfo - Streak Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load streak information', async () => {
    const { result } = renderHook(
      () => useStreakInfo(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.current).toBeGreaterThanOrEqual(0);
  });

  it('should track current streak', async () => {
    const { result } = renderHook(
      () => useStreakInfo(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.data?.current).toBe('number');
  });

  it('should track longest streak', async () => {
    const { result } = renderHook(
      () => useStreakInfo(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.data?.longest).toBe('number');
    expect(result.current.data!.longest).toBeGreaterThanOrEqual(result.current.data!.current);
  });

  it('should track if today is completed', async () => {
    const { result } = renderHook(
      () => useStreakInfo(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.data?.today_completed).toBe('boolean');
  });
});

describe('useLearningAnalytics - Analytics Data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load learning analytics', async () => {
    const { result } = renderHook(
      () => useLearningAnalytics(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should provide skill breakdown', async () => {
    const { result } = renderHook(
      () => useLearningAnalytics(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.skill_breakdown).toBeDefined();
    expect(typeof result.current.data?.skill_breakdown).toBe('object');
  });

  it('should track recent activity', async () => {
    const { result } = renderHook(
      () => useLearningAnalytics(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.recent_activity).toBeDefined();
    expect(result.current.data?.recent_activity.sessions_last_week).toBeGreaterThanOrEqual(0);
  });

  it('should provide recommendations', async () => {
    const { result } = renderHook(
      () => useLearningAnalytics(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.recommendations).toBeDefined();
    expect(Array.isArray(result.current.data?.recommendations.focus_areas)).toBe(true);
  });
});

describe('useProgressSummary - Summary Data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load progress summary', async () => {
    const { result } = renderHook(
      () => useProgressSummary(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should track total sessions', async () => {
    const { result } = renderHook(
      () => useProgressSummary(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.total_sessions).toBeGreaterThanOrEqual(0);
  });

  it('should track total descriptions', async () => {
    const { result } = renderHook(
      () => useProgressSummary(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.total_descriptions).toBeGreaterThanOrEqual(0);
  });

  it('should calculate accuracy rate', async () => {
    const { result } = renderHook(
      () => useProgressSummary(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.accuracy_rate).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.accuracy_rate).toBeLessThanOrEqual(100);
  });

  it('should track vocabulary mastered', async () => {
    const { result } = renderHook(
      () => useProgressSummary(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.vocabulary_mastered).toBeGreaterThanOrEqual(0);
  });
});

describe('updateProgress - Progress Updates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should update session progress', async () => {
    const { result } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialPoints = result.current.data?.total_points || 0;

    updateProgress('session');

    const { result: updatedResult } = renderHook(
      () => useProgressStats(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(updatedResult.current.isLoading).toBe(false);
    });

    expect(updatedResult.current.data?.total_points).toBeGreaterThan(initialPoints);
  });

  it('should update description progress', () => {
    updateProgress('description');

    const sessionData = JSON.parse(
      localStorage.getItem('describe_it_session_data') || '{}'
    );

    expect(sessionData.total_descriptions).toBeGreaterThan(0);
  });

  it('should update phrase progress', () => {
    updateProgress('phrase', { text: 'hola' });

    const sessionData = JSON.parse(
      localStorage.getItem('describe_it_session_data') || '{}'
    );

    expect(sessionData.vocabulary_mastered).toBeGreaterThan(0);
  });

  it('should update quiz progress with correct answer', () => {
    updateProgress('quiz', { correct: true });

    const sessionData = JSON.parse(
      localStorage.getItem('describe_it_session_data') || '{}'
    );

    expect(sessionData.total_correct).toBe(1);
    expect(sessionData.total_attempts).toBe(1);
  });

  it('should update quiz progress with incorrect answer', () => {
    updateProgress('quiz', { correct: false });

    const sessionData = JSON.parse(
      localStorage.getItem('describe_it_session_data') || '{}'
    );

    expect(sessionData.total_correct).toBe(0);
    expect(sessionData.total_attempts).toBe(1);
  });

  it('should update streak on session completion', () => {
    updateProgress('session');

    const streakInfo = JSON.parse(
      localStorage.getItem('describe_it_streak_info') || '{}'
    );

    expect(streakInfo.current).toBeGreaterThan(0);
    expect(streakInfo.today_completed).toBe(true);
  });

  it('should reset daily progress on new day', () => {
    // Set progress for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    localStorage.setItem(
      'describe_it_daily_progress',
      JSON.stringify({
        date: yesterday.toDateString(),
        points: 100,
        sessions: 5,
      })
    );

    updateProgress('session');

    const dailyProgress = JSON.parse(
      localStorage.getItem('describe_it_daily_progress') || '{}'
    );

    expect(dailyProgress.date).toBe(new Date().toDateString());
    expect(dailyProgress.sessions).toBe(1);
  });
});
