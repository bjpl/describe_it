/**
 * API Client types for Describe It Application
 *
 * Comprehensive type definitions for the API client including:
 * - Request/Response types
 * - Configuration types
 * - Error types
 * - Type guards
 * - Constants
 */

import type { ApiResponse } from './response-types';
import type { CategorizedPhrase } from './response-types';

/**
 * HTTP Methods
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Error Response Types
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  timestamp: string;
  retry?: boolean;
}

export interface ValidationErrorResponse extends ErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Unsplash Image Type (defined here for self-containment)
 */
export interface UnsplashImage {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description?: string;
  alt_description?: string;
  likes: number;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
    small_s3?: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    first_name: string;
    last_name?: string | null;
    instagram_username?: string | null;
    twitter_username?: string | null;
    portfolio_url?: string | null;
    bio?: string;
    location?: string;
    total_likes: number;
    total_photos: number;
    accepted_tos: boolean;
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
    };
  };
}

/**
 * Image Search Types
 */
export interface ImageSearchParams {
  query: string;
  page?: number;
  per_page?: number;
  order_by?: 'latest' | 'relevant' | 'popular';
  color?: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  content_filter?: 'low' | 'high';
  collections?: string;
}

export interface ProcessedImage extends UnsplashImage {
  canonicalUrl: string;
  isDuplicate: boolean;
  duplicateOf?: string;
}

export interface ImageSearchResponse {
  success: boolean;
  data: {
    images: ProcessedImage[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Description Generation Types
 */
export interface DescriptionGenerateRequest {
  imageUrl: string;
  style?: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
  language?: 'es' | 'en';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeContext?: boolean;
  userId?: string;
}

export interface DescriptionResponse {
  success: boolean;
  data: {
    description: string;
    style: string;
    language: string;
    difficulty: string;
    imageUrl: string;
    metadata?: {
      wordCount?: number;
      readabilityScore?: number;
      generatedAt: string;
    };
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Q&A Generation Types
 */
export interface QAGenerateRequest {
  description: string;
  imageUrl?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  numberOfQuestions?: number;
  language?: 'es' | 'en';
  userId?: string;
}

export interface QAResponse extends ApiResponse<{
  questions: Array<{
    id: string;
    question: string;
    answer: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    type: 'open' | 'multiple_choice' | 'true_false';
    options?: string[];
    explanation?: string;
  }>;
  metadata?: {
    totalQuestions: number;
    generatedAt: string;
  };
}> {}

/**
 * Phrase Extraction Types
 */
export interface PhraseExtractionRequest {
  text: string;
  language?: 'es' | 'en';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  maxPhrases?: number;
  includeDefinitions?: boolean;
  includeContext?: boolean;
  userId?: string;
}

export interface PhraseExtractionResponse {
  success: boolean;
  data: {
    phrases: CategorizedPhrase[];
    metadata?: {
      totalPhrases: number;
      categories: string[];
      extractedAt: string;
    };
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Vocabulary Management Types
 */
export interface VocabularySaveRequest {
  userId: string;
  phrase: Omit<CategorizedPhrase, 'id' | 'createdAt'>;
}

export interface VocabularyBulkSaveRequest {
  userId: string;
  phrases: Array<Omit<CategorizedPhrase, 'id' | 'createdAt'>>;
}

export interface VocabularySaveResponse {
  success: boolean;
  data: {
    saved: CategorizedPhrase[];
    failed?: Array<{
      phrase: string;
      error: string;
    }>;
    totalSaved: number;
    totalFailed?: number;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

export interface VocabularyQueryParams {
  userId?: string;
  category?: string | string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | Array<'beginner' | 'intermediate' | 'advanced'>;
  partOfSpeech?: string | string[];
  saved?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'phrase' | 'difficulty' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface VocabularyListResponse {
  success: boolean;
  data: {
    phrases: CategorizedPhrase[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Progress Tracking Types
 */
export interface ProgressTrackRequest {
  userId: string;
  eventType: 'phrase_learned' | 'quiz_completed' | 'image_viewed' | 'description_generated' | 'custom';
  eventData: {
    phraseId?: string;
    quizId?: string;
    imageId?: string;
    score?: number;
    timeSpent?: number;
    correct?: boolean;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    [key: string]: any;
  };
  timestamp?: string;
}

export interface ProgressTrackResponse {
  success: boolean;
  data: {
    eventId: string;
    recorded: boolean;
    timestamp: string;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ProgressQueryParams {
  userId?: string;
  eventType?: string | string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ProgressDataResponse {
  success: boolean;
  data: {
    events: Array<{
      id: string;
      userId: string;
      eventType: string;
      eventData: any;
      timestamp: string;
    }>;
    summary?: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      dateRange: {
        start: string;
        end: string;
      };
    };
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * User Settings Types
 */
export interface UserSettingsRequest {
  userId: string;
  settings: {
    language?: 'es' | 'en';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    theme?: 'light' | 'dark' | 'auto';
    notifications?: {
      email?: boolean;
      push?: boolean;
      reminders?: boolean;
    };
    preferences?: {
      descriptionStyle?: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
      imageOrientation?: 'landscape' | 'portrait' | 'squarish';
      autoSavePhrases?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface UserSettingsResponse {
  success: boolean;
  data: {
    userId: string;
    settings: {
      language: 'es' | 'en';
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      theme: 'light' | 'dark' | 'auto';
      notifications: {
        email: boolean;
        push: boolean;
        reminders: boolean;
      };
      preferences: {
        descriptionStyle: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
        imageOrientation?: 'landscape' | 'portrait' | 'squarish';
        autoSavePhrases: boolean;
        [key: string]: any;
      };
      [key: string]: any;
    };
    updatedAt: string;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

export interface SettingsQueryParams {
  userId?: string;
  section?: string | string[];
}

/**
 * Data Export Types
 */
export interface ExportRequest {
  userId: string;
  format: 'json' | 'csv' | 'xlsx';
  dataTypes: Array<'vocabulary' | 'progress' | 'settings' | 'all'>;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    category?: string[];
    difficulty?: Array<'beginner' | 'intermediate' | 'advanced'>;
    [key: string]: any;
  };
}

export interface ExportResponse {
  success: boolean;
  data: {
    exportId: string;
    filename: string;
    format: 'json' | 'csv' | 'xlsx';
    downloadUrl: string;
    expiresAt: string;
    size?: number;
    recordCount?: number;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Health Check Types
 */
export interface HealthCheckResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    timestamp: string;
    uptime: number;
    checks?: {
      database?: { status: 'ok' | 'error'; latency?: number };
      cache?: { status: 'ok' | 'error'; latency?: number };
      ai?: { status: 'ok' | 'error'; latency?: number };
      storage?: { status: 'ok' | 'error'; latency?: number };
    };
  };
  error?: string;
  message?: string;
  timestamp: string;
}

export interface StatusResponse {
  success: boolean;
  demo: boolean; // Top-level demo field for quick access
  data: {
    status: 'online' | 'maintenance' | 'offline';
    version: string;
    demo: boolean;
    features: {
      imageSearch: boolean;
      descriptionGeneration: boolean;
      qaGeneration: boolean;
      phraseExtraction: boolean;
      vocabularyManagement: boolean;
      progressTracking: boolean;
      dataExport: boolean;
    };
    limits?: {
      maxImagesPerSearch: number;
      maxPhrasesPerExtraction: number;
      maxQuestionsPerGeneration: number;
      requestsPerMinute: number;
    };
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface RequestOptions {
  method?: ApiMethod;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

/**
 * API Endpoints Constants
 */
export const API_ENDPOINTS = {
  IMAGES: {
    SEARCH: '/images/search',
  },
  DESCRIPTIONS: {
    GENERATE: '/descriptions/generate',
  },
  QA: {
    GENERATE: '/qa/generate',
  },
  PHRASES: {
    EXTRACT: '/phrases/extract',
  },
  VOCABULARY: {
    SAVE: '/vocabulary',
  },
  PROGRESS: {
    TRACK: '/progress',
  },
  SETTINGS: {
    SAVE: '/settings',
  },
  EXPORT: {
    GENERATE: '/export',
  },
  HEALTH: '/health',
  STATUS: '/status',
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Type Guards
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    response.success === false &&
    typeof response.error === 'string'
  );
}

export function isValidationErrorResponse(
  response: ErrorResponse
): response is ValidationErrorResponse {
  return (
    isErrorResponse(response) &&
    'errors' in response &&
    Array.isArray(response.errors) &&
    response.errors.length > 0 &&
    response.errors.every(
      (err: any) =>
        typeof err === 'object' &&
        typeof err.field === 'string' &&
        typeof err.message === 'string' &&
        typeof err.code === 'string'
    )
  );
}

/**
 * Rate Limit Info (extended from response-types)
 * Used by Unsplash service for tracking API rate limits
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  isBlocked: boolean;
}

/**
 * Unsplash-specific types (for backward compatibility)
 */
export interface UnsplashSearchParams {
  query: string;
  page?: number;
  per_page?: number;
  order_by?: 'latest' | 'relevant' | 'popular';
  color?: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  content_filter?: 'low' | 'high';
  collections?: string;
}

export interface UnsplashSearchResponse {
  results: UnsplashImage[];
  total: number;
  total_pages: number;
}

/**
 * Cache Types
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  expires?: number;
}

/**
 * Service Configuration
 */
export interface ServiceConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * Database types for compatibility
 */
export interface Database {
  connected: boolean;
  type: 'supabase' | 'postgres' | 'sqlite' | 'memory';
  url?: string;
}
