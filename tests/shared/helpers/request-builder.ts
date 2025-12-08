/**
 * Type-safe API Request Builder
 * Provides fluent interface for building and executing HTTP requests
 */

import type { ApiMethod } from '@/types/api/client-types';

export interface RequestOptions {
  method?: ApiMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  signal?: AbortSignal;
}

export class APIRequestBuilder {
  private baseURL: string;
  private headers: Record<string, string> = {};
  private body: any;
  private method: ApiMethod = 'GET';
  private timeout: number = 10000;
  private signal?: AbortSignal;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * Set authorization token
   */
  auth(token: string): this {
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  /**
   * Set API key header
   */
  withApiKey(key: string): this {
    this.headers['X-API-Key'] = key;
    return this;
  }

  /**
   * Set custom header
   */
  withHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /**
   * Set JSON body
   */
  json(data: any): this {
    this.body = JSON.stringify(data);
    this.headers['Content-Type'] = 'application/json';
    return this;
  }

  /**
   * Set form data body
   */
  formData(data: Record<string, any>): this {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    this.body = formData;
    this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return this;
  }

  /**
   * Set request timeout
   */
  withTimeout(timeout: number): this {
    this.timeout = timeout;
    return this;
  }

  /**
   * Set abort signal
   */
  withSignal(signal: AbortSignal): this {
    this.signal = signal;
    return this;
  }

  /**
   * Execute GET request
   */
  async get(path: string): Promise<TestResponse> {
    this.method = 'GET';
    return this.execute(path);
  }

  /**
   * Execute POST request
   */
  async post(path: string): Promise<TestResponse> {
    this.method = 'POST';
    return this.execute(path);
  }

  /**
   * Execute PUT request
   */
  async put(path: string): Promise<TestResponse> {
    this.method = 'PUT';
    return this.execute(path);
  }

  /**
   * Execute PATCH request
   */
  async patch(path: string): Promise<TestResponse> {
    this.method = 'PATCH';
    return this.execute(path);
  }

  /**
   * Execute DELETE request
   */
  async delete(path: string): Promise<TestResponse> {
    this.method = 'DELETE';
    return this.execute(path);
  }

  /**
   * Execute the request
   */
  private async execute(path: string): Promise<TestResponse> {
    const url = `${this.baseURL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: this.method,
        headers: this.headers,
        body: this.method !== 'GET' && this.method !== 'HEAD' ? this.body : undefined,
        signal: this.signal || controller.signal,
      });

      clearTimeout(timeoutId);
      return new TestResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    } finally {
      // Reset state for next request
      this.reset();
    }
  }

  /**
   * Reset builder state
   */
  private reset(): void {
    this.headers = {};
    this.body = undefined;
    this.method = 'GET';
    this.timeout = 10000;
    this.signal = undefined;
  }
}

/**
 * Test Response Wrapper
 * Provides fluent assertions for HTTP responses
 */
export class TestResponse {
  private response: Response;
  private _data: any;
  private _text: string | null = null;

  constructor(response: Response) {
    this.response = response;
  }

  /**
   * Get response status code
   */
  get status(): number {
    return this.response.status;
  }

  /**
   * Get response headers
   */
  get headers(): Headers {
    return this.response.headers;
  }

  /**
   * Get parsed JSON data
   */
  async getData(): Promise<any> {
    if (this._data === undefined) {
      try {
        this._data = await this.response.clone().json();
      } catch {
        this._data = null;
      }
    }
    return this._data;
  }

  /**
   * Get response text
   */
  async getText(): Promise<string> {
    if (this._text === null) {
      this._text = await this.response.clone().text();
    }
    return this._text;
  }

  /**
   * Assert status code
   */
  async expectStatus(expected: number): Promise<this> {
    if (this.status !== expected) {
      const text = await this.getText();
      throw new Error(
        `Expected status ${expected}, got ${this.status}. Response: ${text}`
      );
    }
    return this;
  }

  /**
   * Assert successful response (2xx)
   */
  async expectSuccess(): Promise<this> {
    if (this.status < 200 || this.status >= 300) {
      const text = await this.getText();
      throw new Error(
        `Expected successful response (2xx), got ${this.status}. Response: ${text}`
      );
    }
    return this;
  }

  /**
   * Assert error response (4xx or 5xx)
   */
  async expectError(): Promise<this> {
    if (this.status < 400) {
      throw new Error(`Expected error response (4xx or 5xx), got ${this.status}`);
    }
    return this;
  }

  /**
   * Assert JSON content type
   */
  async expectJson(): Promise<this> {
    const contentType = this.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON content type, got ${contentType}`);
    }
    return this;
  }

  /**
   * Assert response has property
   */
  async expectProperty(key: string): Promise<this> {
    const data = await this.getData();
    if (!(key in data)) {
      throw new Error(`Expected response to have property "${key}"`);
    }
    return this;
  }

  /**
   * Assert response property value
   */
  async expectPropertyValue(key: string, value: any): Promise<this> {
    const data = await this.getData();
    if (data[key] !== value) {
      throw new Error(
        `Expected ${key} to be ${value}, got ${data[key]}`
      );
    }
    return this;
  }

  /**
   * Assert response matches schema
   */
  async expectSchema(validator: (data: any) => boolean): Promise<this> {
    const data = await this.getData();
    if (!validator(data)) {
      throw new Error('Response does not match expected schema');
    }
    return this;
  }

  /**
   * Get the underlying Response object
   */
  getRawResponse(): Response {
    return this.response;
  }
}

/**
 * Factory function for creating request builder
 */
export function request(baseURL?: string): APIRequestBuilder {
  return new APIRequestBuilder(baseURL);
}
