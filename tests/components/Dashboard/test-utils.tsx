/**
 * Dashboard Component Test Utilities
 * Mock data generators and custom assertions for Dashboard tests
 */

import { vi } from 'vitest';
import type { UserProgress, StudySession } from '@/types/database';

// Mock Recharts components
export const mockRechartsComponents = () => {
  vi.mock('recharts', () => ({
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    Area: () => <div data-testid="area" />,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    Legend: () => <div data-testid="legend" />,
  }));
};

// Mock data generators
export const generateMockUserProgress = (count: number = 10): UserProgress[] => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => ({
    id: `progress-${i}`,
    user_id: 'test-user-id',
    vocabulary_item_id: `vocab-${i}`,
    mastery_level: Math.floor(Math.random() * 100),
    times_reviewed: Math.floor(Math.random() * 20) + 1,
    times_correct: Math.floor(Math.random() * 15),
    last_reviewed: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(now.getTime() - (i + 30) * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

export const generateMockStudySessions = (count: number = 5): StudySession[] => {
  const now = new Date();
  const sessionTypes = ['flashcards', 'quiz', 'matching', 'writing'] as const;

  return Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    user_id: 'test-user-id',
    session_type: sessionTypes[i % sessionTypes.length],
    vocabulary_items: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, j) => `vocab-${j}`),
    score: Math.floor(Math.random() * 30) + 70,
    accuracy: Math.floor(Math.random() * 20) + 75,
    time_spent: Math.floor(Math.random() * 600) + 300, // 5-15 minutes in seconds
    started_at: new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(now.getTime() - i * 12 * 60 * 60 * 1000 + 600000).toISOString(),
    created_at: new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString(),
  }));
};

export const generateMockActivityItems = (count: number = 10) => {
  const now = new Date();
  const types = ['study_session', 'word_learned', 'achievement', 'description_saved', 'quiz_completed', 'streak_milestone'] as const;

  return Array.from({ length: count }, (_, i) => ({
    id: `activity-${i}`,
    type: types[i % types.length],
    title: `Activity ${i + 1}`,
    description: `Description for activity ${i + 1}`,
    timestamp: new Date(now.getTime() - i * 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      score: Math.floor(Math.random() * 30) + 70,
      accuracy: Math.floor(Math.random() * 20) + 75,
      wordsCount: Math.floor(Math.random() * 15) + 5,
    },
    icon: 'study_session',
    color: 'bg-blue-100 text-blue-800',
    priority: 'medium' as const,
  }));
};

// Mock Supabase DatabaseService
export const createMockDatabaseService = () => ({
  getLearningProgress: vi.fn().mockResolvedValue(generateMockUserProgress()),
  getUserSessions: vi.fn().mockResolvedValue(generateMockStudySessions()),
});

// Mock analytics tracking
export const createMockAnalytics = () => ({
  track: vi.fn(),
  page: vi.fn(),
  identify: vi.fn(),
});

// Custom assertions
export const expectChartToBeRendered = (container: HTMLElement, chartType: string) => {
  const chart = container.querySelector(`[data-testid="${chartType}-chart"]`);
  expect(chart).toBeInTheDocument();
};

export const expectLoadingState = (container: HTMLElement) => {
  const skeletons = container.querySelectorAll('[data-testid*="skeleton"]');
  expect(skeletons.length).toBeGreaterThan(0);
};

export const expectErrorState = (container: HTMLElement, errorMessage?: string) => {
  const errorElement = container.querySelector('[class*="destructive"]');
  expect(errorElement).toBeInTheDocument();

  if (errorMessage) {
    expect(container.textContent).toContain(errorMessage);
  }
};

export const expectEmptyState = (container: HTMLElement) => {
  expect(container.textContent).toMatch(/no.*activity|no.*data/i);
};

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => Promise<any>) => {
  const start = performance.now();
  await renderFn();
  return performance.now() - start;
};

// Accessibility testing helpers
export const checkAccessibility = (container: HTMLElement) => {
  // Check for proper ARIA labels
  const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
  interactiveElements.forEach(element => {
    const hasAriaLabel = element.hasAttribute('aria-label') ||
                         element.hasAttribute('aria-labelledby') ||
                         element.textContent?.trim();
    expect(hasAriaLabel).toBeTruthy();
  });
};
