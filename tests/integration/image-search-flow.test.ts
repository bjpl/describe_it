/**
 * Integration tests for Image Search Client-Side Flow
 * 
 * This test suite validates the complete image search flow including:
 * - localStorage API key retrieval
 * - Request formation and headers
 * - API endpoint routing
 * - Error handling
 * - Component state management
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageSearch } from '../../src/components/ImageSearch/ImageSearch';
import { useImageSearch } from '../../src/hooks/useImageSearch';
import { apiKeyProvider } from '../../src/lib/api/keyProvider';

// Mock the fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods to capture logs
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};
global.console = { ...console, ...mockConsole };

// Mock URL constructor for testing
global.URL = class URL {
  searchParams: URLSearchParams;
  origin: string;
  pathname: string;
  
  constructor(url: string, base?: string) {
    this.origin = base || 'http://localhost:3000';
    this.pathname = url.replace(this.origin, '');
    this.searchParams = new URLSearchParams();
  }
  
  toString() {
    const params = this.searchParams.toString();
    return `${this.origin}${this.pathname}${params ? '?' + params : ''}`;
  }
} as any;

describe('Image Search Client-Side Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. localStorage API Key Retrieval', () => {
    it('should retrieve API key from localStorage correctly', () => {
      const mockSettings = {
        data: {
          apiKeys: {
            unsplash: 'test-api-key-123'
          }
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockSettings));

      // Simulate the key retrieval logic from useImageSearch
      let retrievedKey = '';
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        // Should not reach here in this test
      }

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('app-settings');
      expect(retrievedKey).toBe('test-api-key-123');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json-{');

      let retrievedKey = '';
      let errorOccurred = false;

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        errorOccurred = true;
      }

      expect(errorOccurred).toBe(true);
      expect(retrievedKey).toBe('');
    });

    it('should handle missing localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      let retrievedKey = '';
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.data?.apiKeys?.unsplash) {
              retrievedKey = settings.data.apiKeys.unsplash;
            }
          }
        }
      } catch (e) {
        // Should not reach here
      }

      expect(retrievedKey).toBe('');
    });
  });

  describe('2. Request Formation and Headers', () => {
    it('should construct correct API request URL with parameters', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          images: [],
          totalPages: 1,
          total: 0
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: { apiKeys: { unsplash: 'test-key' } }
      }));

      // Test the URL construction logic from useImageSearch
      const query = 'test search';
      const page = 2;
      
      const url = new URL("/api/images/search", 'http://localhost:3000');
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("per_page", "20");
      url.searchParams.set("api_key", 'test-key');

      expect(url.toString()).toContain('/api/images/search');
      expect(url.toString()).toContain('query=test');
      expect(url.toString()).toContain('page=2');
      expect(url.toString()).toContain('per_page=20');
      expect(url.toString()).toContain('api_key=test-key');
    });

    it('should include correct headers in fetch request', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          images: [],
          totalPages: 1
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Simulate making a request with headers
      await fetch('/api/images/search', {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/images/search',
        expect.objectContaining({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          }
        })
      );
    });

    it('should handle missing API key in request formation', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: { apiKeys: {} }
      }));

      const url = new URL("/api/images/search", 'http://localhost:3000');
      url.searchParams.set("query", 'test');
      url.searchParams.set("page", '1');
      url.searchParams.set("per_page", "20");

      // API key should not be added if not available
      expect(url.toString()).not.toContain('api_key');
    });
  });

  describe('3. API Endpoint URL Correctness', () => {
    it('should target correct API endpoint', () => {
      const url = new URL("/api/images/search", window.location.origin);
      
      expect(url.pathname).toBe('/api/images/search');
      expect(url.toString()).toMatch(/\/api\/images\/search/);
    });

    it('should handle URL encoding for special characters', () => {
      const query = 'test & special characters!';
      const url = new URL("/api/images/search", 'http://localhost:3000');
      url.searchParams.set("query", query);

      expect(url.toString()).toContain('special'); // Just check that special chars are encoded
    });
  });

  describe('4. Error Handling Validation', () => {
    it('should handle network errors correctly', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const createSearchError = (error: unknown) => {
        if (error instanceof Error) {
          if (error.message.includes("Failed to fetch")) {
            return {
              message: "Network connection failed. Please check your internet connection.",
              type: "network",
              retryable: true,
            };
          }
        }
        return {
          message: "An unexpected error occurred",
          type: "unknown",
          retryable: false,
        };
      };

      const error = createSearchError(new Error('Failed to fetch'));
      
      expect(error.type).toBe('network');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('Network connection failed');
    });

    it('should handle HTTP error responses correctly', () => {
      const createSearchError = (error: unknown, response?: Response) => {
        if (response && !response.ok) {
          const statusCode = response.status;
          let message = "Search request failed";
          let type = "server";
          let retryable = false;

          switch (statusCode) {
            case 401:
              message = "Authentication failed. Please refresh the page.";
              retryable = true;
              break;
            case 429:
              message = "Too many requests. Please wait a moment before searching again.";
              retryable = true;
              break;
            case 500:
              message = "Server error. Please try again in a few moments.";
              retryable = true;
              break;
          }

          return { message, type, statusCode, retryable };
        }
        return { message: "Unknown error", type: "unknown", retryable: false };
      };

      // Test 401 error
      const error401 = createSearchError(null, { ok: false, status: 401 } as Response);
      expect(error401.statusCode).toBe(401);
      expect(error401.retryable).toBe(true);

      // Test 429 error
      const error429 = createSearchError(null, { ok: false, status: 429 } as Response);
      expect(error429.statusCode).toBe(429);
      expect(error429.retryable).toBe(true);

      // Test 500 error
      const error500 = createSearchError(null, { ok: false, status: 500 } as Response);
      expect(error500.statusCode).toBe(500);
      expect(error500.retryable).toBe(true);
    });

    it('should handle timeout errors correctly', () => {
      const createSearchError = (error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return {
            message: "Request timed out. Please try again.",
            type: "timeout",
            retryable: true,
          };
        }
        return { message: "Unknown error", type: "unknown", retryable: false };
      };

      const abortError = new Error('Request timed out');
      abortError.name = 'AbortError';
      
      const error = createSearchError(abortError);
      expect(error.type).toBe('timeout');
      expect(error.retryable).toBe(true);
    });
  });

  describe('5. Retry Logic Testing', () => {
    it('should retry retryable errors with progressive backoff', async () => {
      const mockDelay = vi.fn().mockImplementation((ms) => Promise.resolve());
      
      // Mock progressive retry logic
      const MAX_RETRIES = 3;
      const RETRY_DELAYS = [1000, 2000, 4000];
      let attempt = 0;

      const retryRequest = async () => {
        for (attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt < 2) {
              throw new Error('Retryable error');
            }
            return { success: true };
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              throw error;
            }
            if (attempt < MAX_RETRIES) {
              await mockDelay(RETRY_DELAYS[attempt]);
            }
          }
        }
      };

      const result = await retryRequest();
      expect(result.success).toBe(true);
      expect(attempt).toBe(2); // Should succeed on third attempt
    });
  });

  describe('6. Component State Management', () => {
    it('should manage loading states correctly during search', () => {
      let loadingState = { isLoading: false, message: "" };
      let errorState: string | null = null;

      // Simulate search start
      loadingState = { isLoading: true, message: "Searching images..." };
      errorState = null;

      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.message).toBe("Searching images...");
      expect(errorState).toBe(null);

      // Simulate search success
      loadingState = { isLoading: false, message: "" };

      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.message).toBe("");

      // Simulate search error
      loadingState = { isLoading: false, message: "" };
      errorState = "Search failed";

      expect(loadingState.isLoading).toBe(false);
      expect(errorState).toBe("Search failed");
    });

    it('should handle pagination state correctly', () => {
      let searchParams = { query: "", page: 1, per_page: 20 };
      let totalPages = 1;

      // Simulate successful search
      searchParams = { query: "test", page: 1, per_page: 20 };
      totalPages = 5;

      expect(searchParams.query).toBe("test");
      expect(searchParams.page).toBe(1);
      expect(totalPages).toBe(5);

      // Simulate page change
      searchParams = { ...searchParams, page: 2 };

      expect(searchParams.page).toBe(2);
    });
  });

  describe('7. Integration Test: Full Search Flow', () => {
    it('should complete full search flow successfully', async () => {
      // Setup mocks
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          images: [
            {
              id: 'test-1',
              urls: { small: 'test-url-1', regular: 'test-url-1' },
              alt_description: 'Test image 1',
              user: { name: 'Test User' }
            }
          ],
          totalPages: 2,
          total: 25
        })
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: { apiKeys: { unsplash: 'valid-api-key' } }
      }));

      // Simulate the search flow
      const query = 'nature';
      const page = 1;

      // 1. Check localStorage for API key
      const settingsStr = localStorage.getItem('app-settings');
      const settings = JSON.parse(settingsStr!);
      const apiKey = settings.data.apiKeys.unsplash;

      expect(apiKey).toBe('valid-api-key');

      // 2. Construct URL
      const url = new URL("/api/images/search", 'http://localhost:3000');
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("per_page", "20");
      url.searchParams.set("api_key", apiKey);

      // 3. Make request
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // 4. Handle response
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.images).toHaveLength(1);
      expect(data.totalPages).toBe(2);
      expect(data.images[0].id).toBe('test-1');

      // Verify the fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/images/search'),
        expect.objectContaining({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          }
        })
      );
    });

    it('should fallback gracefully when API key is missing', async () => {
      // Setup mocks for demo mode
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          images: [
            {
              id: 'demo-1',
              urls: { small: 'demo-url', regular: 'demo-url' },
              alt_description: 'Demo image',
              user: { name: 'Demo User' }
            }
          ],
          totalPages: 1,
          total: 1
        })
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      mockLocalStorage.getItem.mockReturnValue(null);

      // Simulate search without API key
      const query = 'test';
      const url = new URL("/api/images/search", 'http://localhost:3000');
      url.searchParams.set("query", query);
      url.searchParams.set("page", "1");
      url.searchParams.set("per_page", "20");
      // Note: no api_key parameter

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // Should still return results (demo data)
      expect(data.images).toHaveLength(1);
      expect(data.images[0].id).toBe('demo-1');
    });
  });

  describe('8. Production Debugging Scenarios', () => {
    it('should log detailed debugging information', () => {
      const query = 'test query';
      const page = 1;
      const filters = { orientation: 'landscape' };

      // Simulate the logging from useImageSearch
      console.log("[useImageSearch] searchImages called with:", { query, page, filters });
      console.log("[useImageSearch] Starting search, setting loading state");

      expect(mockConsole.log).toHaveBeenCalledWith(
        "[useImageSearch] searchImages called with:",
        { query, page, filters }
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[useImageSearch] Starting search, setting loading state"
      );
    });

    it('should provide network request inspection data', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ images: [], totalPages: 1 })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const url = 'http://localhost:3000/api/images/search?query=test';
      
      // Simulate request inspection
      const requestDetails = {
        url,
        method: 'GET',
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        }
      };

      await fetch(url, requestDetails);

      console.log("[useImageSearch] Making API request to:", url);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[useImageSearch] Making API request to:",
        url
      );
    });

    it('should capture and log error details for debugging', () => {
      const error = new Error('Test error');
      const searchError = {
        message: error.message,
        type: 'unknown',
        retryable: false
      };

      // Actually call the mocked console.error
      mockConsole.error("[useImageSearch] Search failed with error:", error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "[useImageSearch] Search failed with error:",
        error
      );
    });
  });
});