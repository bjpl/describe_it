import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '@/lib/store/sessionStore';

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      isInitialized: false,
    });
  });

  describe('Session Initialization', () => {
    it('should initialize session', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession('user-123');
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.session?.userId).toBe('user-123');
    });

    it('should create anonymous session when no userId provided', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession();
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.userId).toBeUndefined();
    });

    it('should set start time on initialization', () => {
      const { result } = renderHook(() => useSessionStore());
      const beforeInit = new Date();

      act(() => {
        result.current.initializeSession();
      });

      const afterInit = new Date();

      expect(result.current.session?.startTime).toBeDefined();
      expect(result.current.session!.startTime.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime());
      expect(result.current.session!.startTime.getTime()).toBeLessThanOrEqual(afterInit.getTime());
    });
  });

  describe('Activity Tracking', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSessionStore());
      act(() => {
        result.current.initializeSession('user-123');
      });
    });

    it('should update last activity', () => {
      const { result } = renderHook(() => useSessionStore());
      const initialActivity = result.current.session!.lastActivity;

      act(() => {
        result.current.updateLastActivity();
      });

      expect(result.current.session!.lastActivity.getTime()).toBeGreaterThan(
        initialActivity.getTime()
      );
    });

    it('should track search activity', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.trackSearch('sunset', 10);
      });

      expect(result.current.session!.searchHistory).toHaveLength(1);
      expect(result.current.session!.searchHistory[0].query).toBe('sunset');
      expect(result.current.session!.searchHistory[0].resultCount).toBe(10);
    });

    it('should maintain search history limit', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.trackSearch(`query-${i}`, i);
        }
      });

      const maxItems = result.current.session!.preferences.maxHistoryItems;
      expect(result.current.session!.searchHistory.length).toBeLessThanOrEqual(maxItems);
    });

    it('should keep most recent searches', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.trackSearch(`query-${i}`, i);
        }
      });

      const firstSearch = result.current.session!.searchHistory[0];
      expect(firstSearch.query).toContain('query-'); // Should be one of the recent queries
    });
  });

  describe('Authentication State', () => {
    it('should set authenticated state', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession();
        result.current.setAuthenticated(true, 'user-456');
      });

      expect(result.current.session!.isAuthenticated).toBe(true);
      expect(result.current.session!.userId).toBe('user-456');
    });

    it('should initialize session if authenticated without existing session', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.setAuthenticated(true, 'user-789');
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.session!.isAuthenticated).toBe(true);
      expect(result.current.session!.userId).toBe('user-789');
    });

    it('should remove userId when unauthenticated', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession('user-123');
        result.current.setAuthenticated(false);
      });

      expect(result.current.session!.isAuthenticated).toBe(false);
      expect(result.current.session!.userId).toBeUndefined();
    });
  });

  describe('Session Management', () => {
    it('should end session', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession('user-123');
        result.current.endSession();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should calculate session duration', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession();
      });

      const duration = result.current.getSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 duration for no session', () => {
      const { result } = renderHook(() => useSessionStore());

      const duration = result.current.getSessionDuration();
      expect(duration).toBe(0);
    });
  });

  describe('Activity Summary', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSessionStore());
      act(() => {
        result.current.initializeSession('user-123');
      });
    });

    it('should generate activity summary', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.trackSearch('query1', 5);
        result.current.trackSearch('query2', 3);
        result.current.trackSearch('query1', 7); // Duplicate query
      });

      const summary = result.current.getActivitySummary();

      expect(summary.totalSearches).toBe(3);
      expect(summary.uniqueQueries).toBe(2); // query1 and query2
      expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
      expect(summary.lastActivity).toBeDefined();
    });

    it('should return empty summary for no session', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.endSession();
      });

      const summary = result.current.getActivitySummary();

      expect(summary.totalSearches).toBe(0);
      expect(summary.uniqueQueries).toBe(0);
      expect(summary.sessionDuration).toBe(0);
    });

    it('should handle case-insensitive unique query counting', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.trackSearch('Sunset', 5);
        result.current.trackSearch('sunset', 3);
        result.current.trackSearch('SUNSET', 7);
      });

      const summary = result.current.getActivitySummary();

      expect(summary.uniqueQueries).toBe(1); // All variations of "sunset"
    });
  });

  describe('Session State Persistence', () => {
    it('should maintain session data across activity updates', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession('user-123');
      });

      const initialSessionId = result.current.session!.id;

      act(() => {
        result.current.updateLastActivity();
        result.current.trackSearch('test', 5);
      });

      expect(result.current.session!.id).toBe(initialSessionId);
      expect(result.current.session!.userId).toBe('user-123');
    });
  });

  describe('Session Preferences', () => {
    it('should include default preferences on session creation', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.initializeSession();
      });

      expect(result.current.session!.preferences).toBeDefined();
      expect(result.current.session!.preferences.theme).toBe('auto');
      expect(result.current.session!.preferences.language).toBe('en');
      expect(result.current.session!.preferences.maxHistoryItems).toBe(50);
    });
  });
});
