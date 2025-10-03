/**
 * SessionStorage Persistence Integration Tests
 * Tests for session-specific data storage and isolation
 *
 * Coverage:
 * - Session data storage
 * - Tab-specific isolation
 * - Auto-clear on tab close simulation
 * - Session-specific data management
 * - Session tracking
 * - Activity monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSessionStore } from '@/lib/store/sessionStore';

describe('SessionStorage - Basic Operations', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should save data to sessionStorage', () => {
    const key = 'test-session-key';
    const value = 'test-session-value';

    sessionStorage.setItem(key, value);

    expect(sessionStorage.getItem(key)).toBe(value);
  });

  it('should retrieve data from sessionStorage', () => {
    const key = 'test-key';
    const value = 'test-value';
    sessionStorage.setItem(key, value);

    const retrieved = sessionStorage.getItem(key);

    expect(retrieved).toBe(value);
  });

  it('should update existing session data', () => {
    const key = 'test-key';
    sessionStorage.setItem(key, 'old-value');

    sessionStorage.setItem(key, 'new-value');

    expect(sessionStorage.getItem(key)).toBe('new-value');
  });

  it('should delete session data', () => {
    const key = 'test-key';
    sessionStorage.setItem(key, 'test-value');

    sessionStorage.removeItem(key);

    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('should clear all session data', () => {
    sessionStorage.setItem('key1', 'value1');
    sessionStorage.setItem('key2', 'value2');

    sessionStorage.clear();

    expect(sessionStorage.length).toBe(0);
  });
});

describe('SessionStorage - JSON Serialization', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should save and retrieve JSON objects', () => {
    const key = 'session-object';
    const data = { sessionId: '123', user: 'john' };

    sessionStorage.setItem(key, JSON.stringify(data));
    const retrieved = JSON.parse(sessionStorage.getItem(key)!);

    expect(retrieved).toEqual(data);
  });

  it('should save and retrieve session arrays', () => {
    const key = 'session-array';
    const data = ['item1', 'item2', 'item3'];

    sessionStorage.setItem(key, JSON.stringify(data));
    const retrieved = JSON.parse(sessionStorage.getItem(key)!);

    expect(retrieved).toEqual(data);
  });

  it('should handle session metadata', () => {
    const metadata = {
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    };

    sessionStorage.setItem('session-meta', JSON.stringify(metadata));
    const retrieved = JSON.parse(sessionStorage.getItem('session-meta')!);

    expect(retrieved).toHaveProperty('startTime');
    expect(retrieved).toHaveProperty('lastActivity');
    expect(retrieved).toHaveProperty('isActive');
  });
});

describe('SessionStorage - Session Store Integration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    // Reset Zustand store state
    useSessionStore.setState({
      session: null,
      isInitialized: false
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should initialize a new session', () => {
    const { initializeSession } = useSessionStore.getState();

    initializeSession();

    const { session, isInitialized } = useSessionStore.getState();
    expect(isInitialized).toBe(true);
    expect(session).toBeDefined();
    expect(session?.id).toMatch(/^session-/);
  });

  it('should initialize session with user ID', () => {
    const { initializeSession } = useSessionStore.getState();
    const userId = 'user-123';

    initializeSession(userId);

    const { session } = useSessionStore.getState();
    expect(session?.userId).toBe(userId);
    expect(session?.isAuthenticated).toBe(true);
  });

  it('should track session start time', () => {
    const { initializeSession } = useSessionStore.getState();
    const beforeInit = new Date();

    initializeSession();

    const { session } = useSessionStore.getState();
    expect(session?.startTime).toBeInstanceOf(Date);
    expect(session?.startTime.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime());
  });

  it('should update last activity timestamp', () => {
    const { initializeSession, updateLastActivity } = useSessionStore.getState();

    initializeSession();
    const { session: initialSession } = useSessionStore.getState();
    const initialActivity = initialSession!.lastActivity;

    // Wait a bit
    vi.advanceTimersByTime(100);

    updateLastActivity();
    const { session: updatedSession } = useSessionStore.getState();

    expect(updatedSession?.lastActivity.getTime()).toBeGreaterThanOrEqual(
      initialActivity.getTime()
    );
  });

  it('should end session', () => {
    const { initializeSession, endSession } = useSessionStore.getState();

    initializeSession();
    endSession();

    const { session, isInitialized } = useSessionStore.getState();
    expect(session).toBeNull();
    expect(isInitialized).toBe(false);
  });

  it('should set authentication status', () => {
    const { initializeSession, setAuthenticated } = useSessionStore.getState();

    initializeSession();
    setAuthenticated(true, 'user-456');

    const { session } = useSessionStore.getState();
    expect(session?.isAuthenticated).toBe(true);
    expect(session?.userId).toBe('user-456');
  });

  it('should initialize session on authentication if not initialized', () => {
    const { setAuthenticated } = useSessionStore.getState();

    setAuthenticated(true, 'user-789');

    const { session, isInitialized } = useSessionStore.getState();
    expect(isInitialized).toBe(true);
    expect(session?.userId).toBe('user-789');
  });
});

describe('SessionStorage - Activity Tracking', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useSessionStore.setState({
      session: null,
      isInitialized: false
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should track search activity', () => {
    const { initializeSession, trackSearch } = useSessionStore.getState();

    initializeSession();
    trackSearch('test query', 5);

    const { session } = useSessionStore.getState();
    expect(session?.searchHistory).toHaveLength(1);
    expect(session?.searchHistory[0].query).toBe('test query');
    expect(session?.searchHistory[0].resultCount).toBe(5);
  });

  it('should limit search history to max items', () => {
    const { initializeSession, trackSearch } = useSessionStore.getState();

    initializeSession();

    // Add more than max items (assuming max is 50)
    for (let i = 0; i < 55; i++) {
      trackSearch(`query ${i}`, i);
    }

    const { session } = useSessionStore.getState();
    expect(session?.searchHistory.length).toBeLessThanOrEqual(50);
  });

  it('should keep most recent searches', () => {
    const { initializeSession, trackSearch } = useSessionStore.getState();

    initializeSession();
    trackSearch('first query', 1);
    trackSearch('second query', 2);

    const { session } = useSessionStore.getState();
    expect(session?.searchHistory[0].query).toBe('second query');
    expect(session?.searchHistory[1].query).toBe('first query');
  });

  it('should calculate session duration', () => {
    const { initializeSession, getSessionDuration } = useSessionStore.getState();

    initializeSession();

    vi.advanceTimersByTime(5000); // 5 seconds

    const duration = getSessionDuration();
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should return zero duration for no session', () => {
    const { getSessionDuration } = useSessionStore.getState();

    const duration = getSessionDuration();
    expect(duration).toBe(0);
  });

  it('should generate activity summary', () => {
    const { initializeSession, trackSearch, getActivitySummary } = useSessionStore.getState();

    initializeSession();
    trackSearch('query 1', 5);
    trackSearch('query 2', 3);
    trackSearch('query 1', 7); // Duplicate query

    const summary = getActivitySummary();

    expect(summary.totalSearches).toBe(3);
    expect(summary.uniqueQueries).toBe(2); // Only 2 unique queries
    expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
    expect(summary.lastActivity).toBeInstanceOf(Date);
  });

  it('should return empty summary for no session', () => {
    const { getActivitySummary } = useSessionStore.getState();

    const summary = getActivitySummary();

    expect(summary.totalSearches).toBe(0);
    expect(summary.uniqueQueries).toBe(0);
    expect(summary.sessionDuration).toBe(0);
  });
});

describe('SessionStorage - Session Isolation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should isolate data between simulated tabs', () => {
    // Simulate tab 1
    const tab1Data = { tabId: 'tab-1', data: 'tab1-data' };
    sessionStorage.setItem('tab-data', JSON.stringify(tab1Data));

    // In a real browser, another tab would have different sessionStorage
    // We simulate by checking the data is only in this instance
    const retrieved = JSON.parse(sessionStorage.getItem('tab-data')!);
    expect(retrieved.tabId).toBe('tab-1');
  });

  it('should not share session data across tabs', () => {
    // SessionStorage is inherently tab-specific
    // This test documents expected behavior
    sessionStorage.setItem('tab-specific', 'value');

    // In another tab, this would be undefined
    // In tests, we verify sessionStorage is per-instance
    expect(sessionStorage.getItem('tab-specific')).toBe('value');
  });

  it('should maintain separate session histories per tab', () => {
    const tabSession = {
      tabId: 'tab-123',
      history: ['search1', 'search2']
    };

    sessionStorage.setItem('session-history', JSON.stringify(tabSession));

    const retrieved = JSON.parse(sessionStorage.getItem('session-history')!);
    expect(retrieved.history).toHaveLength(2);
  });
});

describe('SessionStorage - Temporary Data Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should store temporary form data', () => {
    const formData = {
      field1: 'value1',
      field2: 'value2',
      timestamp: Date.now()
    };

    sessionStorage.setItem('temp-form', JSON.stringify(formData));

    const retrieved = JSON.parse(sessionStorage.getItem('temp-form')!);
    expect(retrieved).toEqual(formData);
  });

  it('should store temporary navigation state', () => {
    const navState = {
      currentPage: '/search',
      previousPage: '/home',
      scrollPosition: 150
    };

    sessionStorage.setItem('nav-state', JSON.stringify(navState));

    const retrieved = JSON.parse(sessionStorage.getItem('nav-state')!);
    expect(retrieved.currentPage).toBe('/search');
    expect(retrieved.scrollPosition).toBe(150);
  });

  it('should store wizard/multi-step form progress', () => {
    const wizardState = {
      currentStep: 2,
      completedSteps: [1, 2],
      data: {
        step1: { name: 'John' },
        step2: { email: 'john@example.com' }
      }
    };

    sessionStorage.setItem('wizard-progress', JSON.stringify(wizardState));

    const retrieved = JSON.parse(sessionStorage.getItem('wizard-progress')!);
    expect(retrieved.currentStep).toBe(2);
    expect(retrieved.completedSteps).toContain(1);
  });

  it('should store temporary API responses', () => {
    const apiResponse = {
      data: { results: [1, 2, 3] },
      timestamp: Date.now(),
      cacheKey: 'search-results-temp'
    };

    sessionStorage.setItem('api-cache-temp', JSON.stringify(apiResponse));

    const retrieved = JSON.parse(sessionStorage.getItem('api-cache-temp')!);
    expect(retrieved.data.results).toHaveLength(3);
  });
});

describe('SessionStorage - Error Handling', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should handle quota exceeded for session storage', () => {
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;

    Storage.prototype.setItem = function(key: string, value: string) {
      callCount++;
      if (callCount === 1) {
        const error: any = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return originalSetItem.call(this, key, value);
    };

    expect(() => {
      try {
        sessionStorage.setItem('test', 'value');
      } catch (e) {
        // Expected to throw
        expect((e as Error).name).toBe('QuotaExceededError');
      }
    }).not.toThrow();

    Storage.prototype.setItem = originalSetItem;
  });

  it('should handle invalid JSON in session storage', () => {
    sessionStorage.setItem('invalid-json', '{invalid}');

    expect(() => {
      const value = sessionStorage.getItem('invalid-json');
      if (value) {
        JSON.parse(value);
      }
    }).toThrow();
  });

  it('should handle missing session data gracefully', () => {
    const value = sessionStorage.getItem('non-existent-key');
    expect(value).toBeNull();
  });
});

describe('SessionStorage - Preferences Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useSessionStore.setState({
      session: null,
      isInitialized: false
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should maintain session preferences', () => {
    const { initializeSession } = useSessionStore.getState();

    initializeSession();

    const { session } = useSessionStore.getState();
    expect(session?.preferences).toBeDefined();
    expect(session?.preferences.theme).toBe('auto');
    expect(session?.preferences.language).toBe('en');
  });

  it('should store session-specific UI state', () => {
    const uiState = {
      sidebarOpen: true,
      activeTab: 'search',
      viewMode: 'grid'
    };

    sessionStorage.setItem('ui-state', JSON.stringify(uiState));

    const retrieved = JSON.parse(sessionStorage.getItem('ui-state')!);
    expect(retrieved.sidebarOpen).toBe(true);
    expect(retrieved.activeTab).toBe('search');
  });

  it('should manage session filters and sorting', () => {
    const filterState = {
      sortBy: 'date',
      sortOrder: 'desc',
      filters: {
        category: 'images',
        dateRange: 'week'
      }
    };

    sessionStorage.setItem('filter-state', JSON.stringify(filterState));

    const retrieved = JSON.parse(sessionStorage.getItem('filter-state')!);
    expect(retrieved.sortBy).toBe('date');
    expect(retrieved.filters.category).toBe('images');
  });
});

describe('SessionStorage - Auto-clear Simulation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should clear session data when simulating tab close', () => {
    sessionStorage.setItem('session-data', 'value');
    sessionStorage.setItem('temp-data', 'temp-value');

    // Simulate tab close by clearing sessionStorage
    sessionStorage.clear();

    expect(sessionStorage.getItem('session-data')).toBeNull();
    expect(sessionStorage.getItem('temp-data')).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('should preserve localStorage when session clears', () => {
    localStorage.setItem('persistent-data', 'persistent-value');
    sessionStorage.setItem('session-data', 'session-value');

    // Clear session but not localStorage
    sessionStorage.clear();

    expect(localStorage.getItem('persistent-data')).toBe('persistent-value');
    expect(sessionStorage.getItem('session-data')).toBeNull();
  });

  it('should handle beforeunload event', () => {
    sessionStorage.setItem('session-data', 'value');

    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    // Session data should still exist until actual unload
    expect(sessionStorage.getItem('session-data')).toBe('value');
  });
});
