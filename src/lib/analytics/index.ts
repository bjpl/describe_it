/**
 * Analytics Module Entry Point
 * Exports all analytics functionality for easy importing
 */

// Core analytics functionality
export { default as tracker, trackEvent, setUser, clearUser, flushEvents, getSessionId } from './tracker';
export { EventBuilders, validateEvent, serializeEvent, deserializeEvent } from './events';
export { default as performanceMonitor, usePerformanceTracking, withPerformanceTracking } from './performance';

// Type exports
export type { 
  AnalyticsEvent, 
  LearningEvent, 
  FeatureUsageEvent, 
  ApiUsageEvent, 
  PerformanceEvent, 
  ErrorEvent, 
  UserBehaviorEvent 
} from './events';

// Convenience hooks and utilities
import { useEffect, useRef } from 'react';
import { trackEvent, getSessionId } from './tracker';
import { EventBuilders } from './events';
import { logger } from '@/lib/logger';

/**
 * React hook for tracking component lifecycle events
 */
export function useAnalytics(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const sessionId = getSessionId();

  useEffect(() => {
    // Track component mount
    trackEvent({
      eventName: 'component_render',
      timestamp: Date.now(),
      properties: {
        component: componentName,
        action: 'mount',
        route: typeof window !== 'undefined' ? window.location.pathname : '',
      },
    });

    return () => {
      // Track component unmount with duration
      const duration = Date.now() - mountTime.current;
      trackEvent({
        eventName: 'component_render',
        timestamp: Date.now(),
        properties: {
          component: componentName,
          action: 'unmount',
          duration,
          route: typeof window !== 'undefined' ? window.location.pathname : '',
        },
      });
    };
  }, [componentName]);

  return {
    trackFeatureUsage: (featureName: string, action?: string, metadata?: Record<string, any>) => {
      trackEvent(EventBuilders.featureUsed(sessionId, featureName, action, metadata));
    },
    
    trackUserAction: (action: string, properties?: Record<string, any>) => {
      trackEvent({
        eventName: 'user_action',
        timestamp: Date.now(),
        properties: {
          action,
          component: componentName,
          ...properties,
        },
      });
    },
    
    trackError: (error: Error, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
      trackEvent(EventBuilders.errorOccurred(sessionId, error, componentName, severity));
    },
  };
}

/**
 * Higher-order component for automatic analytics tracking
 */
export function withAnalytics<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
  
  const AnalyticsTrackedComponent = (props: P) => {
    useAnalytics(displayName);
    return React.createElement(WrappedComponent, props);
  };
  
  AnalyticsTrackedComponent.displayName = `withAnalytics(${displayName})`;
  
  return AnalyticsTrackedComponent;
}

/**
 * Track learning session events
 */
export const LearningAnalytics = {
  startSession: (userId?: string, userTier?: string) => {
    const sessionId = getSessionId();
    trackEvent(EventBuilders.learningSessionStarted(sessionId, userId, userTier));
    return sessionId;
  },

  endSession: (sessionId: string, duration: number, wordsLearned: number, userId?: string, userTier?: string) => {
    trackEvent(EventBuilders.learningSessionEnded(sessionId, duration, wordsLearned, userId, userTier));
  },

  vocabularyLearned: (word: string, difficulty: string, imageId?: string, userId?: string) => {
    const sessionId = getSessionId();
    trackEvent(EventBuilders.vocabularyLearned(sessionId, word, difficulty, imageId, userId));
  },

  quizCompleted: (accuracy: number, timeSpent: number, questionsCount: number) => {
    const sessionId = getSessionId();
    trackEvent({
      eventName: 'quiz_completed',
      timestamp: Date.now(),
      properties: {
        accuracy,
        timeSpent,
        questionsCount,
      },
    });
  },
};

/**
 * Track API usage and performance
 */
export const ApiAnalytics = {
  trackRequest: (endpoint: string, method: string, startTime: number, statusCode: number) => {
    const sessionId = getSessionId();
    const responseTime = Date.now() - startTime;
    trackEvent(EventBuilders.apiRequest(sessionId, endpoint, method, statusCode, responseTime));
  },

  trackError: (endpoint: string, method: string, errorType: string, statusCode?: number) => {
    const sessionId = getSessionId();
    trackEvent(EventBuilders.apiError(sessionId, endpoint, method, errorType, statusCode));
  },

  trackLimitReached: (endpoint: string, userId?: string) => {
    const sessionId = getSessionId();
    trackEvent({
      eventName: 'api_limit_reached',
      timestamp: Date.now(),
      properties: {
        endpoint,
        userId,
      },
    });
  },
};

/**
 * Initialize analytics system
 */
export function initializeAnalytics(config?: {
  enableConsoleLogging?: boolean;
  enableLocalStorage?: boolean;
  batchSize?: number;
  flushInterval?: number;
}) {
  // Analytics is initialized automatically when tracker is imported
  // This function is provided for explicit initialization with custom config
  logger.info('Analytics system initialized', config);
}