/**
 * Mock Data Generators
 *
 * Provides consistent mock data for testing components
 */

import type { User } from '@/types/comprehensive';

/**
 * Create a mock user with default or custom properties
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
    tier: 'free',
    credits: 100,
    ...overrides,
  };
}

/**
 * Create a mock description result
 */
export function createMockDescription(overrides?: any) {
  return {
    id: 'desc-123',
    title: 'Sample Product',
    description: 'This is a sample product description for testing purposes.',
    category: 'electronics',
    tags: ['test', 'sample', 'electronics'],
    created_at: new Date('2024-01-01').toISOString(),
    user_id: 'user-123',
    ...overrides,
  };
}

/**
 * Create mock learning progress data
 */
export function createMockProgress(overrides?: any) {
  return {
    user_id: 'user-123',
    level: 5,
    xp: 450,
    total_descriptions: 15,
    streak_days: 7,
    achievements: ['first_description', 'week_streak'],
    last_activity: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock activity data
 */
export function createMockActivity(overrides?: any) {
  return {
    id: 'activity-123',
    user_id: 'user-123',
    type: 'description_created',
    description: 'Created a new product description',
    metadata: {
      description_id: 'desc-123',
      category: 'electronics',
    },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock activities
 */
export function createMockActivities(count: number = 5): any[] {
  const types = [
    'description_created',
    'level_up',
    'achievement_unlocked',
    'streak_milestone',
  ];

  return Array.from({ length: count }, (_, i) =>
    createMockActivity({
      id: `activity-${i}`,
      type: types[i % types.length],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    })
  );
}

/**
 * Create mock achievement data
 */
export function createMockAchievement(overrides?: any) {
  return {
    id: 'achievement-123',
    name: 'First Steps',
    description: 'Create your first description',
    icon: '🎯',
    category: 'milestone',
    points: 10,
    unlocked: false,
    unlocked_at: null,
    ...overrides,
  };
}

/**
 * Create multiple mock achievements
 */
export function createMockAchievements(count: number = 10): any[] {
  const achievements = [
    { name: 'First Steps', description: 'Create your first description', icon: '🎯' },
    { name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥' },
    { name: 'Description Master', description: 'Create 50 descriptions', icon: '📝' },
    { name: 'Quality Expert', description: 'Get 10 high-quality ratings', icon: '⭐' },
    { name: 'Explorer', description: 'Try all description categories', icon: '🗺️' },
    { name: 'Speedster', description: 'Create 5 descriptions in one day', icon: '⚡' },
    { name: 'Perfectionist', description: 'Get 100% quality score', icon: '💎' },
    { name: 'Early Bird', description: 'Join during beta', icon: '🐦' },
    { name: 'Contributor', description: 'Share feedback 5 times', icon: '💬' },
    { name: 'Legend', description: 'Reach level 50', icon: '👑' },
  ];

  return achievements.slice(0, count).map((achievement, i) =>
    createMockAchievement({
      id: `achievement-${i}`,
      ...achievement,
      unlocked: i < 3, // First 3 are unlocked
      unlocked_at: i < 3 ? new Date(Date.now() - i * 86400000).toISOString() : null,
    })
  );
}

/**
 * Create mock API key data
 */
export function createMockApiKey(overrides?: any) {
  return {
    id: 'key-123',
    user_id: 'user-123',
    name: 'Development Key',
    key: 'sk-test-123456789',
    prefix: 'sk-test',
    last_used: new Date().toISOString(),
    created_at: new Date('2024-01-01').toISOString(),
    ...overrides,
  };
}

/**
 * Create mock analytics data
 */
export function createMockAnalytics(overrides?: any) {
  return {
    total_descriptions: 150,
    total_users: 1200,
    active_users_today: 45,
    average_quality_score: 8.5,
    popular_categories: [
      { category: 'electronics', count: 45 },
      { category: 'fashion', count: 38 },
      { category: 'home', count: 32 },
    ],
    usage_by_day: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 10,
    })),
    ...overrides,
  };
}

/**
 * Create mock form state
 */
export function createMockFormState(overrides?: any) {
  return {
    productName: '',
    category: '',
    features: [''],
    targetAudience: '',
    tone: 'professional',
    length: 'medium',
    keywords: [],
    errors: {},
    touched: {},
    isSubmitting: false,
    ...overrides,
  };
}

/**
 * Create mock error response
 */
export function createMockError(overrides?: any) {
  return {
    message: 'An error occurred',
    code: 'UNKNOWN_ERROR',
    status: 500,
    details: {},
    ...overrides,
  };
}

/**
 * Create mock API response
 */
export function createMockApiResponse<T>(data: T, overrides?: any) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    ...overrides,
  };
}

/**
 * Create mock notification
 */
export function createMockNotification(overrides?: any) {
  return {
    id: 'notification-123',
    type: 'success',
    message: 'Operation completed successfully',
    duration: 3000,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Create mock file
 */
export function createMockFile(
  name: string = 'test.txt',
  content: string = 'test content',
  type: string = 'text/plain'
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

/**
 * Create mock image file
 */
export function createMockImageFile(
  name: string = 'test.png',
  width: number = 100,
  height: number = 100
): File {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, width, height);
  }

  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], name, { type: 'image/png' }));
      }
    });
  }) as any;
}

/**
 * Create mock local storage
 */
export function createMockLocalStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] || null,
    length: Object.keys(store).length,
  };
}
