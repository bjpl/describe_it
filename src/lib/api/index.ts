// API Services Index
// Centralized exports for all API services

// Services
export { unsplashService } from "./unsplash";
export { APIError } from "../../types/api";
export { openAIService } from "./openai";
export { supabaseService } from "./supabase";
export { vercelKvCache } from "./vercel-kv";

// Import for internal use
import type { DescriptionStyle } from "../../types/api";

// Types
export type {
  UnsplashImage,
  UnsplashSearchResponse,
  UnsplashSearchParams,
  ProcessedImage,
  DescriptionStyle,
  DescriptionRequest,
  GeneratedDescription,
  QAGeneration,
  PhraseCategories,
  TranslationRequest,
  CacheEntry,
  RateLimitInfo,
  APIError as APIErrorType,
  RetryConfig,
  ServiceConfig,
  Database,
} from "../../types/api";

// Utility functions and constants
export const API_CONSTANTS = {
  MAX_IMAGES_PER_PAGE: 30,
  DEFAULT_CACHE_TTL: 3600, // 1 hour
  MAX_DESCRIPTION_LENGTH: 500,
  SUPPORTED_LANGUAGES: ["es", "en"] as const,
  DESCRIPTION_STYLES: [
    "narrativo",
    "poetico",
    "academico",
    "conversacional",
    "infantil",
  ] as const,
  UNSPLASH_ORIENTATIONS: ["landscape", "portrait", "squarish"] as const,
  UNSPLASH_COLORS: [
    "black_and_white",
    "black",
    "white",
    "yellow",
    "orange",
    "red",
    "purple",
    "magenta",
    "green",
    "teal",
    "blue",
  ] as const,
} as const;

// Helper functions for API integration
export const apiHelpers = {
  /**
   * Validate environment variables for all services
   */
  validateEnvironment(): {
    unsplash: boolean;
    openai: boolean;
    supabase: boolean;
    vercelKv: boolean;
  } {
    return {
      unsplash: !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      vercelKv: !!(
        process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
      ),
    };
  },

  /**
   * Check health of all services
   */
  async checkServicesHealth(): Promise<{
    unsplash: boolean;
    openai: boolean;
    supabase: boolean;
    vercelKv: boolean;
  }> {
    const results = await Promise.allSettled([
      // Unsplash doesn't have a dedicated health check, so we'll assume it's healthy if configured
      Promise.resolve(!!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
      Promise.resolve(true), // OpenAI service health check stub
      Promise.resolve(true), // Supabase service health check stub
      Promise.resolve(true), // Vercel KV cache health check stub
    ]);

    return {
      unsplash: results[0].status === "fulfilled" ? results[0].value : false,
      openai: results[1].status === "fulfilled" ? results[1].value : false,
      supabase: results[2].status === "fulfilled" ? results[2].value : false,
      vercelKv: results[3].status === "fulfilled" ? results[3].value : false,
    };
  },

  /**
   * Format error messages consistently
   */
  formatError(error: unknown): {
    message: string;
    code: string;
    status: number;
  } {
    if (error instanceof Error && 'code' in error) {
      return {
        message: error.message,
        code: (error as any).code || 'UNKNOWN',
        status: (error as any).status || 500,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: "UNKNOWN_ERROR",
        status: 500,
      };
    }

    return {
      message: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
      status: 500,
    };
  },

  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate image URL format
   */
  isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        ["http:", "https:"].includes(urlObj.protocol) &&
        /\.(jpg|jpeg|png|webp|gif)$/i.test(urlObj.pathname)
      );
    } catch {
      return false;
    }
  },

  /**
   * Validate description style
   */
  isValidDescriptionStyle(style: string): style is DescriptionStyle {
    return API_CONSTANTS.DESCRIPTION_STYLES.includes(style as DescriptionStyle);
  },

  /**
   * Validate supported language
   */
  isValidLanguage(language: string): language is "es" | "en" {
    return API_CONSTANTS.SUPPORTED_LANGUAGES.includes(language as "es" | "en");
  },

  /**
   * Sanitize search query
   */
  sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .slice(0, 100); // Limit length
  },

  /**
   * Calculate cache TTL based on data type
   */
  calculateCacheTTL(
    dataType: "image" | "description" | "translation" | "search",
  ): number {
    const ttls = {
      image: 3600, // 1 hour
      description: 86400, // 24 hours
      translation: 604800, // 7 days
      search: 600, // 10 minutes
    };

    return ttls[dataType] || API_CONSTANTS.DEFAULT_CACHE_TTL;
  },

  /**
   * Debounce function for API calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Retry wrapper with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  },
};

// ============================================================================
// NEW TYPE-SAFE API CLIENT (Result-based pattern)
// ============================================================================

// Main API Client
export { ApiClient as TypeSafeApiClient, createApiClient as createTypeSafeClient, apiClient as typeSafeClient } from './api-client';
export type { ApiClientConfig as TypeSafeClientConfig } from './api-client';

// Result Type and Utilities
export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  createApiError,
} from './result';
export type { Result, ApiError as ApiErrorResult } from './result';

// Base Client
export { BaseApiClient } from './client-base';
export type {
  BaseClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RequestConfig,
} from './client-base';

// Individual API Modules
export { VocabularyApi } from './vocabulary';
export type {
  VocabularyListParams,
  CreateVocabularyDTO,
  UpdateVocabularyDTO,
  BulkCreateVocabularyDTO,
  VocabularySearchParams,
} from './vocabulary';

export { DescriptionsApi } from './descriptions';
export type {
  DescriptionListParams,
  GenerateDescriptionDTO,
  CreateDescriptionDTO,
  UpdateDescriptionDTO,
  GeneratedDescription,
} from './descriptions';

export { SessionsApi } from './sessions';
export type {
  SessionEntity,
  SessionListParams,
  CreateSessionDTO,
  UpdateSessionDTO,
  CompleteSessionDTO,
  SessionStats,
} from './sessions';

// Validation
export { validate, validateArray, sanitizeString, sanitizeObject, rules } from './validation';
export type { ValidationRule, Schema, ValidationErrorDetails } from './validation';

// Endpoints
export { API_ENDPOINTS as TYPE_SAFE_ENDPOINTS, buildQueryString } from './endpoints';
