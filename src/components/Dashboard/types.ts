/**
 * Dashboard Type Definitions
 * Centralized types for all dashboard components
 */

export interface DashboardStats {
  totalPoints: number;
  currentStreak: number;
  accuracy: number;
  totalWords: number;
  wordsToday: number;
  averageSessionTime: number;
  completionRate: number;
  vocabularyMastered: number;
}

export interface ProgressAnalytics {
  progressOverTime: Array<{
    date: string;
    points: number;
    wordsLearned: number;
  }>;
  skillBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  completionData: Array<{
    name: string;
    value: number;
  }>;
  weeklyActivity: Array<{
    day: string;
    sessions: number;
    accuracy: number;
  }>;
}

export interface PerformanceMetrics {
  webVitals: {
    LCP: number;
    FID: number;
    CLS: number;
    FCP: number;
    TTFB: number;
    INP: number;
  };
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface UserActivity {
  recentSessions: Array<{
    id: string;
    date: string;
    duration: number;
    wordsLearned: number;
    accuracy: number;
  }>;
  topVocabulary: Array<{
    word: string;
    count: number;
    mastery: number;
  }>;
}

export interface DashboardData {
  stats: DashboardStats;
  analytics: ProgressAnalytics;
  performance: PerformanceMetrics;
  activity: UserActivity;
  lastUpdated: string;
}

export interface DashboardError {
  type: 'fetch' | 'network' | 'validation';
  message: string;
  details?: unknown;
}

export type TimeRange = '24h' | '7d' | '30d' | '90d';

export interface DashboardFilters {
  timeRange: TimeRange;
  category?: string;
  showInactive?: boolean;
}
