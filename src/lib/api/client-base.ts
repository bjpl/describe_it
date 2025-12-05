/**
 * Base API Client with Type-Safe Fetch Wrapper
 *
 * Provides low-level HTTP request functionality with:
 * - Result-based error handling
 * - Request/response interceptors
 * - AbortController support
 * - Automatic retries
 */

import { Result, ok, err, createApiError, type ApiError } from './result';

/**
 * API Request Options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout_ms?: number;
  retry?: boolean;
  signal?: AbortSignal;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function
 */
export type ResponseInterceptor<T = unknown> = (
  response: Response,
  data: T
) => T | Promise<T>;

/**
 * Error interceptor function
 */
export type ErrorInterceptor = (
  error: ApiError
) => ApiError | Promise<ApiError>;

/**
 * Internal request configuration
 */
export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Base API Client Configuration
 */
export interface BaseClientConfig {
  base_url: string;
  api_key?: string;
  timeout_ms?: number;
  retry?: {
    max_attempts: number;
    delay_ms: number;
    backoff_factor?: number;
  };
  headers?: Record<string, string>;
  request_interceptors?: RequestInterceptor[];
  response_interceptors?: ResponseInterceptor[];
  error_interceptors?: ErrorInterceptor[];
}

/**
 * Default client configuration
 */
const DEFAULT_CONFIG = {
  base_url: typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api',
  timeout_ms: 30000,
  retry: {
    max_attempts: 3,
    delay_ms: 1000,
    backoff_factor: 2,
  },
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Base API Client
 */
export class BaseApiClient {
  protected config: BaseClientConfig & { headers: Record<string, string> };
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: Partial<BaseClientConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      headers: {
        ...DEFAULT_CONFIG.headers,
        ...config.headers,
      },
      retry: config.retry ? {
        ...DEFAULT_CONFIG.retry,
        ...config.retry,
      } : DEFAULT_CONFIG.retry,
    };

    if (config.request_interceptors) {
      this.requestInterceptors = [...config.request_interceptors];
    }
    if (config.response_interceptors) {
      this.responseInterceptors = [...config.response_interceptors];
    }
    if (config.error_interceptors) {
      this.errorInterceptors = [...config.error_interceptors];
    }
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  protected async request<T>(
    endpoint: string,
    options: Partial<ApiRequestOptions> = {}
  ): Promise<Result<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout_ms = this.config.timeout_ms,
      retry = true,
    } = options;

    const url = `${this.config.base_url}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    try {
      let requestConfig: RequestConfig = {
        url,
        method,
        headers: {
          ...this.config.headers,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      };

      if (this.config.api_key) {
        requestConfig.headers['Authorization'] = `Bearer ${this.config.api_key}`;
      }

      for (const interceptor of this.requestInterceptors) {
        requestConfig = await interceptor(requestConfig);
      }

      const result = retry && this.config.retry
        ? await this.requestWithRetry<T>(requestConfig)
        : await this.executeRequest<T>(requestConfig);

      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return err(
          await this.processError(
            createApiError('TIMEOUT', 'Request timeout', { timeout_ms }, 408)
          )
        );
      }

      if (error instanceof Error) {
        return err(
          await this.processError(
            createApiError('NETWORK_ERROR', error.message, {}, 0)
          )
        );
      }

      return err(
        await this.processError(
          createApiError('UNKNOWN_ERROR', 'An unknown error occurred', {}, 0)
        )
      );
    }
  }

  private async requestWithRetry<T>(config: RequestConfig): Promise<Result<T>> {
    if (!this.config.retry) {
      return this.executeRequest<T>(config);
    }

    const { max_attempts, delay_ms, backoff_factor = 2 } = this.config.retry;
    let lastError: ApiError | null = null;

    for (let attempt = 1; attempt <= max_attempts; attempt++) {
      const result = await this.executeRequest<T>(config);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (result.error.status && result.error.status >= 400 && result.error.status < 500) {
        break;
      }

      if (attempt < max_attempts) {
        await this.delay(delay_ms * Math.pow(backoff_factor, attempt - 1));
      }
    }

    return err(lastError!);
  }

  private async executeRequest<T>(config: RequestConfig): Promise<Result<T>> {
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: config.signal,
      });

      if (!response.ok) {
        const errorData = await this.parseResponseBody(response) as {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
        };

        const apiError = createApiError(
          errorData?.code || 'HTTP_ERROR',
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData?.details || {},
          response.status
        );

        return err(await this.processError(apiError));
      }

      let data = await this.parseResponseBody<T>(response);

      for (const interceptor of this.responseInterceptors) {
        data = await interceptor(response, data);
      }

      return ok(data);
    } catch (error) {
      if (error instanceof Error) {
        return err(
          await this.processError(
            createApiError('REQUEST_FAILED', error.message, {}, 0)
          )
        );
      }

      return err(
        await this.processError(
          createApiError('UNKNOWN_ERROR', 'Request failed', {}, 0)
        )
      );
    }
  }

  private async parseResponseBody<T>(response: Response): Promise<T> {
    const text = await response.text();

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private async processError(error: ApiError): Promise<ApiError> {
    let processedError = error;

    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }

    return processedError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<BaseClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
    };
  }

  setApiKey(apiKey: string): void {
    this.config.api_key = apiKey;
  }
}
