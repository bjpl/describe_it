/**
 * API Helper
 *
 * Provides utilities for API interactions in E2E tests:
 * - API request helpers
 * - Response validation
 * - Mock API responses
 * - Test data setup via API
 */

import { Page, APIResponse } from '@playwright/test';

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export class APIHelper {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.BASE_URL || 'http://localhost:3000'
  ) {}

  /**
   * Make API request
   */
  async request(endpoint: string, options: APIRequestOptions = {}): Promise<APIResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';

    const requestOptions: any = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.data) {
      requestOptions.data = options.data;
    }

    if (options.params) {
      const params = new URLSearchParams(options.params);
      return await this.page.request[method.toLowerCase() as 'get'](
        `${url}?${params.toString()}`,
        requestOptions
      );
    }

    return await this.page.request[method.toLowerCase() as 'get'](url, requestOptions);
  }

  /**
   * GET request
   */
  async get(endpoint: string, params?: Record<string, string>): Promise<APIResponse> {
    return await this.request(endpoint, { method: 'GET', params });
  }

  /**
   * POST request
   */
  async post(endpoint: string, data: any): Promise<APIResponse> {
    return await this.request(endpoint, { method: 'POST', data });
  }

  /**
   * PUT request
   */
  async put(endpoint: string, data: any): Promise<APIResponse> {
    return await this.request(endpoint, { method: 'PUT', data });
  }

  /**
   * DELETE request
   */
  async delete(endpoint: string): Promise<APIResponse> {
    return await this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Validate response status
   */
  async validateResponse(response: APIResponse, expectedStatus: number = 200): Promise<any> {
    if (response.status() !== expectedStatus) {
      const body = await response.text();
      throw new Error(
        `API request failed: ${response.status()} ${response.statusText()}\n${body}`
      );
    }

    return await response.json();
  }

  /**
   * Wait for API call to complete
   */
  async waitForAPI(
    urlPattern: string | RegExp,
    options?: { method?: string; status?: number; timeout?: number }
  ): Promise<APIResponse> {
    return await this.page.waitForResponse(
      (response) => {
        const url = response.url();
        const matchesPattern =
          typeof urlPattern === 'string'
            ? url.includes(urlPattern)
            : urlPattern.test(url);

        if (!matchesPattern) return false;

        if (options?.method && response.request().method() !== options.method) {
          return false;
        }

        if (options?.status && response.status() !== options.status) {
          return false;
        }

        return true;
      },
      { timeout: options?.timeout || 30000 }
    );
  }

  /**
   * Mock API response
   */
  async mockResponse(
    urlPattern: string | RegExp,
    response: { status?: number; body: any; headers?: Record<string, string> }
  ): Promise<void> {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        headers: response.headers,
        body: JSON.stringify(response.body),
      });
    });
  }

  /**
   * Create vocabulary via API
   */
  async createVocabulary(vocabularyData: any): Promise<any> {
    const response = await this.post('/api/vocabulary', vocabularyData);
    return await this.validateResponse(response, 201);
  }

  /**
   * Update vocabulary via API
   */
  async updateVocabulary(id: string, updates: any): Promise<any> {
    const response = await this.put(`/api/vocabulary/${id}`, updates);
    return await this.validateResponse(response);
  }

  /**
   * Delete vocabulary via API
   */
  async deleteVocabulary(id: string): Promise<void> {
    const response = await this.delete(`/api/vocabulary/${id}`);
    await this.validateResponse(response);
  }

  /**
   * Get user vocabulary list via API
   */
  async getVocabularyList(): Promise<any[]> {
    const response = await this.get('/api/vocabulary');
    return await this.validateResponse(response);
  }

  /**
   * Search images via API
   */
  async searchImages(query: string): Promise<any[]> {
    const response = await this.get('/api/images/search', { q: query });
    return await this.validateResponse(response);
  }

  /**
   * Get user progress via API
   */
  async getUserProgress(): Promise<any> {
    const response = await this.get('/api/progress');
    return await this.validateResponse(response);
  }

  /**
   * Batch create vocabulary items
   */
  async batchCreateVocabulary(items: any[]): Promise<any[]> {
    const results = [];

    for (const item of items) {
      const result = await this.createVocabulary(item);
      results.push(result);
    }

    return results;
  }

  /**
   * Clear test data (for cleanup)
   */
  async clearTestData(userId?: string): Promise<void> {
    // Delete all vocabulary for test user
    const vocabulary = await this.getVocabularyList();

    for (const item of vocabulary) {
      await this.deleteVocabulary(item.id);
    }
  }

  /**
   * Setup test data
   */
  async setupTestVocabulary(count: number = 5): Promise<any[]> {
    const testWords = [
      { word: 'hola', translation: 'hello', difficulty: 'beginner' },
      { word: 'adiós', translation: 'goodbye', difficulty: 'beginner' },
      { word: 'gracias', translation: 'thank you', difficulty: 'beginner' },
      { word: 'por favor', translation: 'please', difficulty: 'beginner' },
      { word: 'perdón', translation: 'sorry', difficulty: 'beginner' },
      { word: 'hermoso', translation: 'beautiful', difficulty: 'intermediate' },
      { word: 'difícil', translation: 'difficult', difficulty: 'intermediate' },
      { word: 'rápido', translation: 'fast', difficulty: 'intermediate' },
      { word: 'increíble', translation: 'incredible', difficulty: 'advanced' },
      { word: 'extraordinario', translation: 'extraordinary', difficulty: 'advanced' },
    ];

    const itemsToCreate = testWords.slice(0, count);
    return await this.batchCreateVocabulary(itemsToCreate);
  }

  /**
   * Intercept and capture API calls
   */
  async captureAPICalls(urlPattern: string | RegExp): Promise<APIResponse[]> {
    const capturedCalls: APIResponse[] = [];

    await this.page.route(urlPattern, async (route) => {
      const response = await route.fetch();
      capturedCalls.push(response);
      await route.fulfill({ response });
    });

    return capturedCalls;
  }

  /**
   * Mock API error
   */
  async mockAPIError(
    urlPattern: string | RegExp,
    status: number = 500,
    message: string = 'Internal Server Error'
  ): Promise<void> {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: message,
          success: false,
        }),
      });
    });
  }

  /**
   * Simulate slow API response
   */
  async mockSlowAPI(urlPattern: string | RegExp, delayMs: number = 3000): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      await this.page.waitForTimeout(delayMs);
      const response = await route.fetch();
      await route.fulfill({ response });
    });
  }

  /**
   * Get response from cached API call
   */
  async getCachedResponse(urlPattern: string): Promise<any | null> {
    const responses = await this.page.evaluate((pattern) => {
      const cache = (window as any).__apiCache || {};
      return cache[pattern] || null;
    }, urlPattern);

    return responses;
  }
}
