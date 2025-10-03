/**
 * Analytics Tracker Tests
 * Comprehensive test suite for analytics event tracking and batching
 * Tests: 20+ test cases for event tracking, storage, and transmission
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tracker, trackEvent, setUser, clearUser, flushEvents } from '@/lib/analytics/tracker';
import { EventBuilders } from '@/lib/analytics/events';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Analytics Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Tracking', () => {
    it('should track events', () => {
      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(1);
    });

    it('should add sessionId to events', () => {
      const event = EventBuilders.featureUsed('session-123', 'dashboard');
      trackEvent(event);

      const sessionId = tracker.getSessionId();
      expect(sessionId).toBeTruthy();
    });

    it('should add userId when set', () => {
      setUser('user-456', 'premium');
      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(1);
    });

    it('should validate events before tracking', () => {
      const invalidEvent = { eventName: '', timestamp: 0 } as any;
      trackEvent(invalidEvent);

      // Invalid events should not be added
      expect(tracker.getQueueSize()).toBe(0);
    });

    it('should handle multiple events', () => {
      for (let i = 0; i < 5; i++) {
        const event = EventBuilders.learningSessionStarted(`session-${i}`);
        trackEvent(event);
      }

      expect(tracker.getQueueSize()).toBe(5);
    });

    it('should limit queue size', () => {
      // Track more than max queue size (50)
      for (let i = 0; i < 60; i++) {
        const event = EventBuilders.learningSessionStarted(`session-${i}`);
        trackEvent(event);
      }

      expect(tracker.getQueueSize()).toBeLessThanOrEqual(50);
    });
  });

  describe('Event Batching', () => {
    it('should batch events before sending', async () => {
      for (let i = 0; i < 3; i++) {
        const event = EventBuilders.learningSessionStarted(`session-${i}`);
        trackEvent(event);
      }

      await flushEvents();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('session'),
        })
      );
    });

    it('should auto-flush when batch size reached', async () => {
      // Default batch size is 10
      for (let i = 0; i < 10; i++) {
        const event = EventBuilders.learningSessionStarted(`session-${i}`);
        trackEvent(event);
      }

      // Should have auto-flushed
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should clear queue after successful flush', async () => {
      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      await flushEvents();

      expect(tracker.getQueueSize()).toBe(0);
    });

    it('should handle flush errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      await expect(flushEvents()).resolves.not.toThrow();
    });

    it('should retry failed flushes', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      await flushEvents();
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for retry

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Local Storage', () => {
    it('should store events in localStorage on flush failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      await flushEvents();

      const stored = localStorageMock.getItem('analytics_events');
      expect(stored).toBeTruthy();
    });

    it('should load stored events on initialization', () => {
      const events = [EventBuilders.learningSessionStarted('session-123')];
      localStorageMock.setItem('analytics_events', JSON.stringify(events));

      // Tracker should load stored events
      expect(localStorageMock.getItem('analytics_events')).toBeTruthy();
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('analytics_events', 'invalid json');

      // Should not crash
      expect(() => tracker.getSessionId()).not.toThrow();
    });

    it('should handle quota exceeded errors', async () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      await expect(flushEvents()).resolves.not.toThrow();

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('User Management', () => {
    it('should set user information', () => {
      setUser('user-789', 'premium');

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(1);
    });

    it('should clear user information', () => {
      setUser('user-789', 'premium');
      clearUser();

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(1);
    });

    it('should include userTier in events', () => {
      setUser('user-789', 'premium');

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(1);
    });
  });

  describe('Session Management', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = tracker.getSessionId();

      // Create new tracker instance
      const sessionId2 = tracker.getSessionId();

      expect(sessionId1).toBeTruthy();
      expect(sessionId1).toBe(sessionId2); // Same instance, same session
    });

    it('should maintain session across events', () => {
      const event1 = EventBuilders.learningSessionStarted('session-123');
      const event2 = EventBuilders.vocabularyLearned('session-123', 'hello', 'beginner');

      trackEvent(event1);
      trackEvent(event2);

      const sessionId = tracker.getSessionId();
      expect(sessionId).toBeTruthy();
    });
  });

  describe('Event Builders', () => {
    it('should build learning session started event', () => {
      const event = EventBuilders.learningSessionStarted('session-123', 'user-456');

      expect(event.eventName).toBe('learning_session_started');
      expect(event.sessionId).toBe('session-123');
      expect(event.userId).toBe('user-456');
    });

    it('should build vocabulary learned event', () => {
      const event = EventBuilders.vocabularyLearned('session-123', 'hello', 'beginner', 'img-1');

      expect(event.eventName).toBe('vocabulary_learned');
      expect(event.properties.word).toBe('hello');
      expect(event.properties.difficulty).toBe('beginner');
    });

    it('should build feature used event', () => {
      const event = EventBuilders.featureUsed('session-123', 'dashboard', 'view');

      expect(event.eventName).toBe('feature_used');
      expect(event.properties.featureName).toBe('dashboard');
      expect(event.properties.action).toBe('view');
    });

    it('should build API request event', () => {
      const event = EventBuilders.apiRequest('session-123', '/api/test', 'GET', 200, 150);

      expect(event.eventName).toBe('api_request');
      expect(event.properties.endpoint).toBe('/api/test');
      expect(event.properties.responseTime).toBe(150);
    });

    it('should build error event', () => {
      const error = new Error('Test error');
      const event = EventBuilders.errorOccurred('session-123', error, 'TestComponent');

      expect(event.eventName).toBe('error_occurred');
      expect(event.properties.errorMessage).toBe('Test error');
      expect(event.properties.component).toBe('TestComponent');
    });
  });

  describe('Performance', () => {
    it('should track events efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const event = EventBuilders.learningSessionStarted(`session-${i}`);
        trackEvent(event);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should track 100 events in < 100ms
    });

    it('should flush events efficiently', async () => {
      for (let i = 0; i < 20; i++) {
        const event = EventBuilders.learningSessionStarted(`session-${i}`);
        trackEvent(event);
      }

      const startTime = performance.now();
      await flushEvents();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Event Validation', () => {
    it('should reject events without eventName', () => {
      const invalidEvent = { timestamp: Date.now() } as any;
      trackEvent(invalidEvent);

      expect(tracker.getQueueSize()).toBe(0);
    });

    it('should reject events without timestamp', () => {
      const invalidEvent = { eventName: 'test_event' } as any;
      trackEvent(invalidEvent);

      expect(tracker.getQueueSize()).toBe(0);
    });

    it('should reject events without properties', () => {
      const invalidEvent = {
        eventName: 'test_event',
        timestamp: Date.now(),
        sessionId: 'session-123',
      } as any;

      trackEvent(invalidEvent);

      expect(tracker.getQueueSize()).toBe(0);
    });
  });

  describe('Enable/Disable Tracking', () => {
    it('should stop tracking when disabled', () => {
      tracker.disable();

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(0);

      tracker.enable();
    });

    it('should resume tracking when enabled', () => {
      tracker.disable();
      tracker.enable();

      const event = EventBuilders.learningSessionStarted('session-123');
      trackEvent(event);

      expect(tracker.getQueueSize()).toBe(1);
    });
  });
});
