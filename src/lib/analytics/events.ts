/**
 * Analytics Event Definitions
 * Centralized event tracking for user behavior and app performance
 */

export interface BaseEvent {
  eventName: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  userTier?: 'free' | 'premium' | 'admin';
  properties?: Record<string, any>;
}

export interface LearningEvent extends BaseEvent {
  eventName: 'learning_session_started' | 'learning_session_ended' | 'vocabulary_learned' | 'quiz_completed';
  properties: {
    sessionDuration?: number;
    wordsLearned?: number;
    accuracy?: number;
    difficulty?: string;
    imageId?: string;
    language?: string;
  };
}

export interface FeatureUsageEvent extends BaseEvent {
  eventName: 'feature_used' | 'feature_clicked' | 'feature_error';
  properties: {
    featureName: string;
    action?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  };
}

export interface ApiUsageEvent extends BaseEvent {
  eventName: 'api_request' | 'api_error' | 'api_limit_reached';
  properties: {
    endpoint: string;
    method: string;
    statusCode?: number;
    responseTime?: number;
    errorType?: string;
    rateLimited?: boolean;
  };
}

export interface PerformanceEvent extends BaseEvent {
  eventName: 'page_load' | 'component_render' | 'api_response_time' | 'web_vitals';
  properties: {
    component?: string;
    loadTime?: number;
    route?: string;
    vitals?: {
      fcp?: number;
      lcp?: number;
      fid?: number;
      cls?: number;
      ttfb?: number;
    };
  };
}

export interface ErrorEvent extends BaseEvent {
  eventName: 'error_occurred' | 'error_boundary_triggered' | 'unhandled_rejection';
  properties: {
    errorMessage: string;
    errorStack?: string;
    errorType: string;
    component?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
  };
}

export interface UserBehaviorEvent extends BaseEvent {
  eventName: 'user_signup' | 'user_login' | 'user_logout' | 'settings_changed' | 'export_data';
  properties: {
    method?: string;
    settingChanged?: string;
    exportFormat?: string;
    dataSize?: number;
  };
}

export type AnalyticsEvent = 
  | LearningEvent 
  | FeatureUsageEvent 
  | ApiUsageEvent 
  | PerformanceEvent 
  | ErrorEvent 
  | UserBehaviorEvent;

// Event builders for type safety
export const EventBuilders = {
  learningSessionStarted: (sessionId: string, userId?: string, userTier?: string): LearningEvent => ({
    eventName: 'learning_session_started',
    timestamp: Date.now(),
    sessionId,
    userId,
    userTier: userTier as any,
    properties: {
      sessionDuration: 0,
    },
  }),

  learningSessionEnded: (
    sessionId: string, 
    duration: number, 
    wordsLearned: number,
    userId?: string,
    userTier?: string
  ): LearningEvent => ({
    eventName: 'learning_session_ended',
    timestamp: Date.now(),
    sessionId,
    userId,
    userTier: userTier as any,
    properties: {
      sessionDuration: duration,
      wordsLearned,
    },
  }),

  vocabularyLearned: (
    sessionId: string,
    word: string,
    difficulty: string,
    imageId?: string,
    userId?: string
  ): LearningEvent => ({
    eventName: 'vocabulary_learned',
    timestamp: Date.now(),
    sessionId,
    userId,
    properties: {
      word,
      difficulty,
      imageId,
    },
  }),

  featureUsed: (
    sessionId: string,
    featureName: string,
    action?: string,
    metadata?: Record<string, any>
  ): FeatureUsageEvent => ({
    eventName: 'feature_used',
    timestamp: Date.now(),
    sessionId,
    properties: {
      featureName,
      action,
      metadata,
    },
  }),

  apiRequest: (
    sessionId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ): ApiUsageEvent => ({
    eventName: 'api_request',
    timestamp: Date.now(),
    sessionId,
    properties: {
      endpoint,
      method,
      statusCode,
      responseTime,
    },
  }),

  apiError: (
    sessionId: string,
    endpoint: string,
    method: string,
    errorType: string,
    statusCode?: number
  ): ApiUsageEvent => ({
    eventName: 'api_error',
    timestamp: Date.now(),
    sessionId,
    properties: {
      endpoint,
      method,
      errorType,
      statusCode,
    },
  }),

  performanceMetric: (
    sessionId: string,
    component: string,
    loadTime: number,
    route?: string
  ): PerformanceEvent => ({
    eventName: 'component_render',
    timestamp: Date.now(),
    sessionId,
    properties: {
      component,
      loadTime,
      route,
    },
  }),

  webVitals: (
    sessionId: string,
    vitals: {
      fcp?: number;
      lcp?: number;
      fid?: number;
      cls?: number;
      ttfb?: number;
    },
    route: string
  ): PerformanceEvent => ({
    eventName: 'web_vitals',
    timestamp: Date.now(),
    sessionId,
    properties: {
      vitals,
      route,
    },
  }),

  errorOccurred: (
    sessionId: string,
    error: Error,
    component?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recoverable: boolean = true
  ): ErrorEvent => ({
    eventName: 'error_occurred',
    timestamp: Date.now(),
    sessionId,
    properties: {
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.name,
      component,
      severity,
      recoverable,
    },
  }),

  userAction: (
    sessionId: string,
    action: 'user_signup' | 'user_login' | 'user_logout' | 'settings_changed' | 'export_data',
    properties?: Record<string, any>
  ): UserBehaviorEvent => ({
    eventName: action,
    timestamp: Date.now(),
    sessionId,
    properties: properties || {},
  }),
};

// Event validation
export function validateEvent(event: AnalyticsEvent): boolean {
  return !!(
    event.eventName &&
    event.timestamp &&
    event.sessionId &&
    event.properties
  );
}

// Event serialization for storage
export function serializeEvent(event: AnalyticsEvent): string {
  return safeStringify(event);
}

export function deserializeEvent(eventString: string): AnalyticsEvent | null {
  try {
    const event = safeParse(eventString);
    return validateEvent(event) ? event : null;
  } catch {
    return null;
  }
}