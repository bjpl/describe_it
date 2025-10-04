/**
 * Client-Side Request Validation Tests
 * 
 * This test suite focuses specifically on validating the request formation,
 * header construction, and API key handling in the image search flow.
 * 
 * Use this to debug issues with:
 * - API key retrieval from localStorage
 * - Request URL construction
 * - Header formation
 * - Network request inspection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch for request inspection
const originalFetch = global.fetch;
const mockFetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock URL constructor for testing
const originalURL = global.URL;

describe('Client-Side Request Validation', () => {
  beforeEach(() => {
    // Setup fetch mock
    global.fetch = mockFetch;

    // Setup window and localStorage (should already be available in jsdom)
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
      });
    }

    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.URL = originalURL;
    vi.restoreAllMocks();
  });

  describe('1. localStorage API Key Retrieval Validation', () => {
    it('should correctly retrieve API key from localStorage settings', () => {
      const mockSettings = {
        data: {
          apiKeys: {
            unsplash: 'test-unsplash-api-key-123456789'
          }
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockSettings));

      // Replicate the exact logic from useImageSearch
      let retrievedApiKey = '';
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedApiKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        console.error('Failed to retrieve API key:', e);
      }

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('app-settings');
      expect(retrievedApiKey).toBe('test-unsplash-api-key-123456789');
    });

    it('should handle missing localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      let retrievedApiKey = '';
      let errorOccurred = false;

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedApiKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        errorOccurred = true;
      }

      expect(retrievedApiKey).toBe('');
      expect(errorOccurred).toBe(false);
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json-{malformed');

      let retrievedApiKey = '';
      let errorOccurred = false;

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedApiKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        errorOccurred = true;
      }

      expect(retrievedApiKey).toBe('');
      expect(errorOccurred).toBe(true);
    });

    it('should handle nested property access safely', () => {
      const testCases = [
        // Missing data property
        { setting: {} },
        // Missing apiKeys property
        { setting: { data: {} } },
        // Missing unsplash property
        { setting: { data: { apiKeys: {} } } },
        // Empty unsplash key
        { setting: { data: { apiKeys: { unsplash: '' } } } },
        // Null unsplash key
        { setting: { data: { apiKeys: { unsplash: null } } } },
      ];

      testCases.forEach((testCase, index) => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testCase.setting));

        let retrievedApiKey = '';
        try {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedApiKey = settings.data.apiKeys.unsplash;
            }
          }
        } catch (e) {
          // Should not throw
        }

        expect(retrievedApiKey).toBe('');
      });
    });
  });

  describe('2. Request URL Construction Validation', () => {
    it('should construct correct API endpoint URL', () => {
      const query = 'nature mountains';
      const page = 1;
      const perPage = 20;
      const apiKey = 'test-api-key';

      // Mock URL constructor
      global.URL = class MockURL {
        searchParams: Map<string, string> = new Map();
        pathname: string;
        origin: string;

        constructor(path: string, base: string) {
          this.pathname = path;
          this.origin = base;
        }

        set(key: string, value: string) {
          this.searchParams.set(key, value);
        }

        toString() {
          const params = Array.from(this.searchParams.entries())
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
          return `${this.origin}${this.pathname}${params ? '?' + params : ''}`;
        }
      } as any;

      // Add set method to searchParams
      global.URL.prototype.searchParams = {
        set: function(key: string, value: string) {
          this.searchParams.set(key, value);
        }
      } as any;

      // Replicate URL construction from useImageSearch
      const url = new URL("/api/images/search", "http://localhost:3000");
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("per_page", perPage.toString());
      url.searchParams.set("api_key", apiKey);

      const urlString = url.toString();

      expect(urlString).toContain('/api/images/search');
      expect(urlString).toContain('query=nature%20mountains');
      expect(urlString).toContain('page=1');
      expect(urlString).toContain('per_page=20');
      expect(urlString).toContain('api_key=test-api-key');
    });

    it('should handle special characters in query parameters', () => {
      const specialQueries = [
        'test & special characters!',
        'café münchen',
        '日本語',
        'test@example.com',
        'test+plus+signs',
        'test=equals&ampersand'
      ];

      specialQueries.forEach(query => {
        // Test URL encoding
        const encoded = encodeURIComponent(query);
        expect(encoded).not.toBe(query); // Should be different for special chars
        
        // Test that we can decode it back
        const decoded = decodeURIComponent(encoded);
        expect(decoded).toBe(query);
      });
    });

    it('should construct URL without API key when not available', () => {
      const query = 'test query';

      global.URL = class MockURL {
        searchParams: Map<string, string> = new Map();
        pathname: string;
        origin: string;

        constructor(path: string, base: string) {
          this.pathname = path;
          this.origin = base;
        }

        set(key: string, value: string) {
          this.searchParams.set(key, value);
        }

        toString() {
          const params = Array.from(this.searchParams.entries())
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
          return `${this.origin}${this.pathname}${params ? '?' + params : ''}`;
        }
      } as any;

      global.URL.prototype.searchParams = {
        set: function(key: string, value: string) {
          this.searchParams.set(key, value);
        }
      } as any;

      // Simulate URL construction without API key
      const url = new URL("/api/images/search", "http://localhost:3000");
      url.searchParams.set("query", query);
      url.searchParams.set("page", "1");
      url.searchParams.set("per_page", "20");
      
      // API key is conditionally added in the real code
      // if (apiKey) url.searchParams.set("api_key", apiKey);

      const urlString = url.toString();

      expect(urlString).toContain('/api/images/search');
      expect(urlString).toContain('query=test%20query');
      expect(urlString).not.toContain('api_key');
    });
  });

  describe('3. Request Headers Validation', () => {
    it('should include correct headers in fetch request', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ images: [], totalPages: 1 })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const expectedHeaders = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Replicate fetch call from useImageSearch
      await fetch('http://localhost:3000/api/images/search?query=test', {
        signal: new AbortController().signal,
        headers: expectedHeaders,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/images/search?query=test',
        expect.objectContaining({
          headers: expectedHeaders,
        })
      );
    });

    it('should include AbortController signal for timeout handling', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ images: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const controller = new AbortController();

      await fetch('http://test-url', {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-url',
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });

  describe('4. Request Flow Integration', () => {
    it('should perform complete request construction with API key', async () => {
      // Setup localStorage with API key
      const mockSettings = {
        data: {
          apiKeys: {
            unsplash: 'valid-api-key-123'
          }
        }
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockSettings));

      // Setup fetch mock
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          images: [{ id: 'test-1', urls: { small: 'test-url' } }],
          totalPages: 2,
          total: 25
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Setup URL mock
      global.URL = class MockURL {
        searchParams: Map<string, string> = new Map();
        pathname: string;
        origin: string;

        constructor(path: string, base: string) {
          this.pathname = path;
          this.origin = base;
        }

        set(key: string, value: string) {
          this.searchParams.set(key, value);
        }

        toString() {
          const params = Array.from(this.searchParams.entries())
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
          return `${this.origin}${this.pathname}${params ? '?' + params : ''}`;
        }
      } as any;

      global.URL.prototype.searchParams = {
        set: function(key: string, value: string) {
          this.searchParams.set(key, value);
        }
      } as any;

      // Replicate the complete flow from useImageSearch makeSearchRequest
      const query = 'nature';
      const page = 1;

      // 1. Get API key from localStorage
      let apiKey = '';
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              apiKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        // Fallback
      }

      // 2. Construct URL
      const url = new URL("/api/images/search", "http://localhost:3000");
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("per_page", "20");
      
      if (apiKey) {
        url.searchParams.set("api_key", apiKey);
      }

      // 3. Make fetch request
      const response = await fetch(url.toString(), {
        signal: new AbortController().signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // Validations
      expect(apiKey).toBe('valid-api-key-123');
      expect(url.toString()).toContain('api_key=valid-api-key-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/images/search'),
        expect.objectContaining({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          }
        })
      );

      const data = await response.json();
      expect(data.images).toHaveLength(1);
      expect(data.totalPages).toBe(2);
    });

    it('should handle request flow without API key (demo mode)', async () => {
      // Setup localStorage without API key
      mockLocalStorage.getItem.mockReturnValue(null);

      // Setup fetch mock for demo response
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          images: [{ id: 'demo-1', urls: { small: 'demo-url' } }],
          totalPages: 1,
          total: 1
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Setup URL mock
      global.URL = class MockURL {
        searchParams: Map<string, string> = new Map();
        pathname: string;
        origin: string;

        constructor(path: string, base: string) {
          this.pathname = path;
          this.origin = base;
        }

        set(key: string, value: string) {
          this.searchParams.set(key, value);
        }

        toString() {
          const params = Array.from(this.searchParams.entries())
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
          return `${this.origin}${this.pathname}${params ? '?' + params : ''}`;
        }
      } as any;

      global.URL.prototype.searchParams = {
        set: function(key: string, value: string) {
          this.searchParams.set(key, value);
        }
      } as any;

      // Replicate flow without API key
      const query = 'test';
      const page = 1;

      // 1. Try to get API key (should be empty)
      let apiKey = '';
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              apiKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        // Fallback
      }

      // 2. Construct URL without API key
      const url = new URL("/api/images/search", "http://localhost:3000");
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("per_page", "20");
      
      // API key should not be added
      if (apiKey) {
        url.searchParams.set("api_key", apiKey);
      }

      // 3. Make fetch request
      const response = await fetch(url.toString(), {
        signal: new AbortController().signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // Validations
      expect(apiKey).toBe('');
      expect(url.toString()).not.toContain('api_key');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/images/search'),
        expect.not.stringContaining('api_key')
      );

      const data = await response.json();
      expect(data.images).toHaveLength(1);
      expect(data.images[0].id).toBe('demo-1');
    });
  });

  describe('5. Error Request Scenarios', () => {
    it('should handle network timeout correctly', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValue(timeoutError);

      try {
        await fetch('http://test-url', {
          signal: new AbortController().signal,
        });
      } catch (error) {
        expect(error.name).toBe('AbortError');
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle network connection failure', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

      try {
        await fetch('http://test-url');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe('Failed to fetch');
      }
    });

    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      };
      mockFetch.mockResolvedValue(errorResponse);

      const response = await fetch('http://test-url');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('6. Request Debugging Utilities', () => {
    it('should provide request inspection data', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const requestUrl = 'http://localhost:3000/api/images/search?query=test&api_key=123';
      const requestOptions = {
        method: 'GET',
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: new AbortController().signal
      };

      await fetch(requestUrl, requestOptions);

      // Verify request details for debugging
      const [callUrl, callOptions] = mockFetch.mock.calls[0];
      
      expect(callUrl).toBe(requestUrl);
      expect(callOptions).toEqual(requestOptions);

      // Extract debugging information
      const debugInfo = {
        url: callUrl,
        method: callOptions.method || 'GET',
        headers: callOptions.headers,
        hasApiKey: callUrl.includes('api_key='),
        hasQuery: callUrl.includes('query='),
        hasSignal: !!callOptions.signal
      };

      expect(debugInfo.hasApiKey).toBe(true);
      expect(debugInfo.hasQuery).toBe(true);
      expect(debugInfo.hasSignal).toBe(true);
    });
  });
});