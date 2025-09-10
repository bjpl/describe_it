/**
 * Analytics Tracker Implementation
 * Handles event collection, batching, and storage
 */

import { supabase } from '@/lib/supabase';
import { AnalyticsEvent, validateEvent, serializeEvent } from './events';

interface TrackerConfig {
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  enableLocalStorage: boolean;
  enableConsoleLogging: boolean;
}

class AnalyticsTracker {
  private config: TrackerConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;
  private userId?: string;
  private userTier?: string;
  private isEnabled: boolean;

  constructor(config: Partial<TrackerConfig> = {}) {
    this.config = {
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      enableLocalStorage: true,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.ENABLE_ANALYTICS !== 'false';

    if (this.isEnabled) {
      this.initializeTracker();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracker() {
    // Load stored events from localStorage
    if (typeof window !== 'undefined' && this.config.enableLocalStorage) {
      this.loadStoredEvents();
    }

    // Set up periodic flushing
    this.scheduleFlush();

    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });

      // Handle visibility change (mobile apps, tab switching)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  private loadStoredEvents() {
    try {
      const stored = localStorage.getItem('analytics_events');
      if (stored) {
        const events = JSON.parse(stored);
        this.eventQueue.push(...events);
        localStorage.removeItem('analytics_events');
      }
    } catch (error) {
      console.warn('Failed to load stored analytics events:', error);
    }
  }

  private storeEvents() {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('analytics_events', JSON.stringify(this.eventQueue));
    } catch (error) {
      console.warn('Failed to store analytics events:', error);
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
      this.scheduleFlush();
    }, this.config.flushInterval);
  }

  public setUser(userId: string, userTier?: string) {
    this.userId = userId;
    this.userTier = userTier;
  }

  public clearUser() {
    this.userId = undefined;
    this.userTier = undefined;
  }

  public track(event: Omit<AnalyticsEvent, 'sessionId' | 'userId' | 'userTier'>) {
    if (!this.isEnabled) {
      return;
    }

    const fullEvent: AnalyticsEvent = {
      ...event,
      sessionId: this.sessionId,
      userId: this.userId,
      userTier: this.userTier as any,
    };

    if (!validateEvent(fullEvent)) {
      console.warn('Invalid analytics event:', fullEvent);
      return;
    }

    this.eventQueue.push(fullEvent);

    if (this.config.enableConsoleLogging) {
      console.log('Analytics Event:', fullEvent);
    }

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  public async flush(sync: boolean = false): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    if (sync && typeof window !== 'undefined') {
      // Store events locally for sync sending
      this.storeEvents();
      
      // Use sendBeacon for synchronous sending
      const data = JSON.stringify({ events: eventsToSend });
      navigator.sendBeacon('/api/analytics', data);
      return;
    }

    try {
      await this.sendEvents(eventsToSend);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      
      // Re-queue failed events for retry
      this.eventQueue.unshift(...eventsToSend);
      
      // Store locally as backup
      this.storeEvents();
    }
  }

  private async sendEvents(events: AnalyticsEvent[], retryCount: number = 0): Promise<void> {
    try {
      // Send to Supabase
      const { error } = await supabase
        .from('analytics_events')
        .insert(
          events.map(event => ({
            event_name: event.eventName,
            event_data: event,
            session_id: event.sessionId,
            user_id: event.userId,
            user_tier: event.userTier,
            timestamp: new Date(event.timestamp).toISOString(),
          }))
        );

      if (error) {
        throw error;
      }

      // Also send to API endpoint for real-time processing
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        // Exponential backoff retry
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this.sendEvents(events, retryCount + 1);
        }, delay);
      } else {
        throw error;
      }
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getQueueSize(): number {
    return this.eventQueue.length;
  }

  public enable() {
    this.isEnabled = true;
    this.initializeTracker();
  }

  public disable() {
    this.isEnabled = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  public destroy() {
    this.disable();
    this.flush(true);
  }
}

// Global tracker instance
export const tracker = new AnalyticsTracker();

// Convenience methods
export const trackEvent = (event: Omit<AnalyticsEvent, 'sessionId' | 'userId' | 'userTier'>) => {
  tracker.track(event);
};

export const setUser = (userId: string, userTier?: string) => {
  tracker.setUser(userId, userTier);
};

export const clearUser = () => {
  tracker.clearUser();
};

export const flushEvents = () => {
  return tracker.flush();
};

export const getSessionId = () => {
  return tracker.getSessionId();
};

export default tracker;