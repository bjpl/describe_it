/**
 * Error Retry Utility with Exponential Backoff
 * Epsilon-5 Integration Component
 */

import { createLogger } from '@/lib/logger';

const retryLogger = createLogger('ErrorRetry');

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RetryResult<T> {
  data?: T;
  success: boolean;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 2,
  baseDelay: 2000, // 2 seconds
  maxDelay: 10000, // 10 seconds max
  backoffFactor: 2,
  shouldRetry: (error: Error, attempt: number) => {
    // Retry for network errors, 5xx errors, and timeouts
    const retryableErrors = [
      "NetworkError",
      "TimeoutError",
      "NETWORK_ERROR",
      "TIMEOUT",
      "ERR_NETWORK",
      "ERR_TIMEOUT",
    ];

    const errorMessage = error.message.toLowerCase();
    const isNetworkError = retryableErrors.some((errType) =>
      errorMessage.includes(errType.toLowerCase()),
    );

    // Check if it's a HTTP 5xx error
    const is5xxError =
      errorMessage.includes("50") || errorMessage.includes("server error");

    // Don't retry on 4xx client errors (except 429 rate limit)
    const is4xxError =
      errorMessage.includes("40") && !errorMessage.includes("429");

    return (isNetworkError || is5xxError) && !is4xxError && attempt < 3;
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();

  let lastError: Error | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      const data = await fn();
      return {
        data,
        success: true,
        attempts,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt or if shouldRetry returns false
      if (
        attempt === finalConfig.maxRetries ||
        !finalConfig.shouldRetry(lastError, attempt)
      ) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt),
        finalConfig.maxDelay,
      );

      // Add some jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      retryLogger.warn('Retry attempt failed, waiting before retry', {
        attempt: attempt + 1,
        delay: jitteredDelay,
        error: lastError.message
      });

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attempts,
    totalTime: Date.now() - startTime,
  };
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {},
): Promise<RetryResult<Response>> {
  return withRetry(async () => {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response;
  }, retryConfig);
}

export async function apiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  fallbackData?: T,
  retryConfig: RetryConfig = {},
): Promise<T> {
  const result = await withRetry(apiCall, retryConfig);

  if (result.success && result.data !== undefined) {
    return result.data;
  }

  if (fallbackData !== undefined) {
    retryLogger.warn('API call failed, using fallback data', {
      error: result.error?.message
    });
    return fallbackData;
  }

  throw result.error || new Error("API call failed without fallback");
}

// Specific retry configurations for different operations
export const RETRY_CONFIGS = {
  imageSearch: {
    maxRetries: 2,
    baseDelay: 1500,
    shouldRetry: (error: Error) => !error.message.includes("400"),
  },

  descriptionGeneration: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    shouldRetry: (error: Error) =>
      !error.message.includes("400") &&
      !error.message.includes("invalid image"),
  },

  qaGeneration: {
    maxRetries: 1, // Q&A is less critical, retry once
    baseDelay: 2000,
    shouldRetry: (error: Error) => !error.message.includes("400"),
  },

  vocabularyExtraction: {
    maxRetries: 2,
    baseDelay: 1000,
    shouldRetry: (error: Error) => !error.message.includes("400"),
  },
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  network: "Connection problem. Please check your internet connection.",
  timeout: "Request timed out. The server might be busy.",
  server: "Server error. Please try again in a moment.",
  rateLimit: "Too many requests. Please wait a moment before trying again.",
  notFound: "The requested resource was not found.",
  unauthorized: "Authentication required. Please refresh the page.",
  forbidden: "Access denied to this resource.",
  default: "Something went wrong. Please try again.",
} as const;

export function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("network") || message.includes("fetch")) {
    return ERROR_MESSAGES.network;
  }

  if (message.includes("timeout") || message.includes("aborted")) {
    return ERROR_MESSAGES.timeout;
  }

  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503")
  ) {
    return ERROR_MESSAGES.server;
  }

  if (message.includes("429")) {
    return ERROR_MESSAGES.rateLimit;
  }

  if (message.includes("404")) {
    return ERROR_MESSAGES.notFound;
  }

  if (message.includes("401")) {
    return ERROR_MESSAGES.unauthorized;
  }

  if (message.includes("403")) {
    return ERROR_MESSAGES.forbidden;
  }

  return ERROR_MESSAGES.default;
}
