/**
 * API Client for Describe It Application
 * 
 * Provides a comprehensive TypeScript client for interacting with the Describe It API.
 * Includes automatic retry logic, error handling, caching, and demo mode support.
 */

import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import {
  ApiResponse,
  ErrorResponse,
  ValidationErrorResponse,
  ImageSearchParams,
  ImageSearchResponse,
  DescriptionGenerateRequest,
  DescriptionResponse,
  QAGenerateRequest,
  QAResponse,
  PhraseExtractionRequest,
  PhraseExtractionResponse,
  VocabularySaveRequest,
  VocabularyBulkSaveRequest,
  VocabularySaveResponse,
  VocabularyQueryParams,
  VocabularyListResponse,
  ProgressTrackRequest,
  ProgressTrackResponse,
  ProgressQueryParams,
  ProgressDataResponse,
  UserSettingsRequest,
  UserSettingsResponse,
  SettingsQueryParams,
  ExportRequest,
  ExportResponse,
  HealthCheckResponse,
  StatusResponse,
  ApiClientConfig,
  ApiClientOptions,
  ApiMethod,
  RequestOptions,
  API_ENDPOINTS,
  HTTP_STATUS,
  isErrorResponse,
  isValidationErrorResponse,
} from '@/types/api';

/**
 * Default configuration for the API client
 */
const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseUrl: typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api',
  apiKey: '',
  timeout: 30000, // 30 seconds
  retries: 3,
};

/**
 * API Client Class
 * 
 * Main client for interacting with the Describe It API. Provides methods for all
 * available endpoints with automatic error handling, retries, and type safety.
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(config: ApiClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set API key for authenticated requests
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Clear cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async request<T>(
    endpoint: string,
    options: Partial<RequestOptions & ApiClientOptions> = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retries = this.config.retries,
      signal,
    } = options;

    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = `${method}:${url}:${body || ''}`;

    // Check cache for GET requests
    if (method === 'GET') {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add API key if available
    if (this.config.apiKey) {
      requestHeaders['X-API-Key'] = this.config.apiKey;
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body: body,
      signal: signal || AbortSignal.timeout(timeout),
    };

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        // Handle different response types
        if (response.status === HTTP_STATUS.NOT_MODIFIED) {
          // Return cached version for 304 responses
          const cached = this.getCachedResponse<T>(cacheKey);
          if (cached) return cached;
        }

        const responseText = await response.text();
        let responseData: any;

        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch {
          // Handle non-JSON responses (like downloads)
          if (response.ok) {
            return responseText as unknown as T;
          }
          throw new Error(`Invalid JSON response: ${responseText}`);
        }

        if (!response.ok) {
          const error: ErrorResponse = {
            success: false,
            error: responseData.error || 'Request failed',
            message: responseData.message || `HTTP ${response.status}`,
            timestamp: new Date().toISOString(),
            retry: attempt < retries + 1,
          };

          if (response.status === HTTP_STATUS.BAD_REQUEST && responseData.errors) {
            (error as ValidationErrorResponse).errors = responseData.errors;
          }

          throw new ApiError(error, response.status);
        }

        // Cache successful GET responses
        if (method === 'GET' && response.ok) {
          this.setCachedResponse(cacheKey, responseData, this.getTTLFromHeaders(response));
        }

        return responseData as T;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (
          error instanceof ApiError &&
          (error.status === HTTP_STATUS.BAD_REQUEST ||
           error.status === HTTP_STATUS.FORBIDDEN ||
           error.status === HTTP_STATUS.NOT_FOUND)
        ) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt <= retries) {
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Cache response with TTL
   */
  private setCachedResponse(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Extract TTL from response headers
   */
  private getTTLFromHeaders(response: Response): number {
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl) {
      const maxAge = cacheControl.match(/max-age=(\d+)/);
      if (maxAge) {
        return parseInt(maxAge[1]) * 1000;
      }
    }
    return 5 * 60 * 1000; // Default 5 minutes
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== IMAGE SEARCH =====

  /**
   * Search for images using Unsplash API or demo images
   */
  async searchImages(
    params: ImageSearchParams,
    options?: ApiClientOptions
  ): Promise<ImageSearchResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<ImageSearchResponse>(
      `${API_ENDPOINTS.IMAGES.SEARCH}?${searchParams.toString()}`,
      { method: 'GET', ...options }
    );
  }

  // ===== DESCRIPTION GENERATION =====

  /**
   * Generate AI-powered descriptions for images
   */
  async generateDescriptions(
    request: DescriptionGenerateRequest,
    options?: ApiClientOptions
  ): Promise<DescriptionResponse> {
    return this.request<DescriptionResponse>(
      API_ENDPOINTS.DESCRIPTIONS.GENERATE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Get description generation service info
   */
  async getDescriptionServiceInfo(options?: ApiClientOptions): Promise<any> {
    return this.request(API_ENDPOINTS.DESCRIPTIONS.GENERATE, {
      method: 'GET',
      ...options,
    });
  }

  // ===== Q&A GENERATION =====

  /**
   * Generate question and answer pairs from descriptions
   */
  async generateQA(
    request: QAGenerateRequest,
    options?: ApiClientOptions
  ): Promise<QAResponse> {
    return this.request<QAResponse>(
      API_ENDPOINTS.QA.GENERATE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Get Q&A generation endpoint info
   */
  async getQAServiceInfo(options?: ApiClientOptions): Promise<any> {
    return this.request(API_ENDPOINTS.QA.GENERATE, {
      method: 'GET',
      ...options,
    });
  }

  // ===== PHRASE EXTRACTION =====

  /**
   * Extract key phrases from descriptions
   */
  async extractPhrases(
    request: PhraseExtractionRequest,
    options?: ApiClientOptions
  ): Promise<PhraseExtractionResponse> {
    return this.request<PhraseExtractionResponse>(
      API_ENDPOINTS.PHRASES.EXTRACT,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  // ===== VOCABULARY MANAGEMENT =====

  /**
   * Save single vocabulary item
   */
  async saveVocabulary(
    request: VocabularySaveRequest,
    options?: ApiClientOptions
  ): Promise<VocabularySaveResponse> {
    return this.request<VocabularySaveResponse>(
      API_ENDPOINTS.VOCABULARY.SAVE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Save multiple vocabulary items
   */
  async saveBulkVocabulary(
    request: VocabularyBulkSaveRequest,
    options?: ApiClientOptions
  ): Promise<VocabularySaveResponse> {
    return this.request<VocabularySaveResponse>(
      API_ENDPOINTS.VOCABULARY.SAVE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Retrieve vocabulary items with filtering and pagination
   */
  async getVocabulary(
    params: VocabularyQueryParams = {},
    options?: ApiClientOptions
  ): Promise<VocabularyListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return this.request<VocabularyListResponse>(
      `${API_ENDPOINTS.VOCABULARY.SAVE}?${searchParams.toString()}`,
      { method: 'GET', ...options }
    );
  }

  // ===== PROGRESS TRACKING =====

  /**
   * Track learning progress event
   */
  async trackProgress(
    request: ProgressTrackRequest,
    options?: ApiClientOptions
  ): Promise<ProgressTrackResponse> {
    return this.request<ProgressTrackResponse>(
      API_ENDPOINTS.PROGRESS.TRACK,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Get user progress data
   */
  async getProgress(
    params: ProgressQueryParams = {},
    options?: ApiClientOptions
  ): Promise<ProgressDataResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return this.request<ProgressDataResponse>(
      `${API_ENDPOINTS.PROGRESS.TRACK}?${searchParams.toString()}`,
      { method: 'GET', ...options }
    );
  }

  // ===== USER SETTINGS =====

  /**
   * Save user settings
   */
  async saveSettings(
    request: UserSettingsRequest,
    options?: ApiClientOptions
  ): Promise<UserSettingsResponse> {
    return this.request<UserSettingsResponse>(
      API_ENDPOINTS.SETTINGS.SAVE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Get user settings
   */
  async getSettings(
    params: SettingsQueryParams = {},
    options?: ApiClientOptions
  ): Promise<UserSettingsResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<UserSettingsResponse>(
      `${API_ENDPOINTS.SETTINGS.SAVE}?${searchParams.toString()}`,
      { method: 'GET', ...options }
    );
  }

  /**
   * Reset user settings
   */
  async resetSettings(
    userId: string,
    sections?: string[],
    options?: ApiClientOptions
  ): Promise<UserSettingsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('userId', userId);
    
    if (sections) {
      sections.forEach(section => searchParams.append('section', section));
    }

    return this.request<UserSettingsResponse>(
      `${API_ENDPOINTS.SETTINGS.SAVE}?${searchParams.toString()}`,
      { method: 'DELETE', ...options }
    );
  }

  // ===== DATA EXPORT =====

  /**
   * Generate data export
   */
  async generateExport(
    request: ExportRequest,
    options?: ApiClientOptions
  ): Promise<ExportResponse> {
    return this.request<ExportResponse>(
      API_ENDPOINTS.EXPORT.GENERATE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        ...options,
      }
    );
  }

  /**
   * Download export file
   */
  async downloadExport(
    filename: string,
    format: 'attachment' | 'inline' = 'attachment',
    options?: ApiClientOptions
  ): Promise<string> {
    const searchParams = new URLSearchParams();
    searchParams.append('filename', filename);
    searchParams.append('format', format);

    return this.request<string>(
      `${API_ENDPOINTS.EXPORT.GENERATE}?${searchParams.toString()}`,
      { method: 'GET', ...options }
    );
  }

  // ===== SYSTEM HEALTH =====

  /**
   * Perform health check
   */
  async checkHealth(
    detailed: boolean = false,
    options?: ApiClientOptions
  ): Promise<HealthCheckResponse> {
    const searchParams = new URLSearchParams();
    if (detailed) {
      searchParams.append('detailed', 'true');
    }

    return this.request<HealthCheckResponse>(
      `${API_ENDPOINTS.HEALTH}?${searchParams.toString()}`,
      { method: 'GET', ...options }
    );
  }

  /**
   * Get system status
   */
  async getStatus(options?: ApiClientOptions): Promise<StatusResponse> {
    return this.request<StatusResponse>(API_ENDPOINTS.STATUS, {
      method: 'GET',
      ...options,
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if the client is in demo mode
   */
  async isDemoMode(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.demo;
    } catch {
      return true; // Assume demo mode on error
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getStatus();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API version info
   */
  async getVersion(): Promise<string> {
    try {
      const info = await this.getDescriptionServiceInfo();
      return info.data?.version || '2.0.0';
    } catch {
      return '2.0.0';
    }
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly response: ErrorResponse;
  public readonly status: number;

  constructor(response: ErrorResponse, status: number) {
    super(response.message || response.error);
    this.name = 'ApiError';
    this.response = response;
    this.status = status;
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): this is ApiError & { response: ValidationErrorResponse } {
    return isValidationErrorResponse(this.response);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.response.retry === true;
  }

  /**
   * Get validation errors if available
   */
  getValidationErrors(): Array<{ field: string; message: string; code: string }> {
    if (this.isValidationError()) {
      return this.response.errors;
    }
    return [];
  }
}

/**
 * Create default API client instance
 */
export const createApiClient = (config?: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};

/**
 * Default API client instance
 */
export const apiClient = createApiClient();

/**
 * Hook for React components
 */
export const useApiClient = (config?: ApiClientConfig): ApiClient => {
  if (config) {
    return createApiClient(config);
  }
  return apiClient;
};

export default ApiClient;