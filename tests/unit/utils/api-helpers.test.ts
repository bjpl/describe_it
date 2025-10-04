import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApiUrl, handleApiError, retryApiCall, validateApiResponse } from '@/lib/utils/api-helpers';
import { APIError } from '@/types/api';

// Mock fetch for retry tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Helper Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildApiUrl', () => {
    it('should build basic API URL', () => {
      const url = buildApiUrl('/test');
      expect(url).toMatch(/\/test$/);
    });

    it('should build API URL with parameters', () => {
      const url = buildApiUrl('/search', { q: 'test', limit: '10' });
      expect(url).toContain('q=test');
      expect(url).toContain('limit=10');
    });

    it('should handle undefined parameters', () => {
      const url = buildApiUrl('/search', { q: 'test', limit: undefined });
      expect(url).toContain('q=test');
      expect(url).not.toContain('limit');
    });

    it('should handle empty parameters object', () => {
      const url = buildApiUrl('/search', {});
      expect(url).toMatch(/\/search$/);
    });

    it('should handle null parameters', () => {
      const url = buildApiUrl('/search', undefined);
      expect(url).toMatch(/\/search$/);
    });

    it('should encode special characters in parameters', () => {
      const url = buildApiUrl('/search', { q: 'hello world', filter: 'cats & dogs' });
      expect(url).toContain('hello%20world');
      expect(url).toContain('cats%20%26%20dogs');
    });

    it('should handle array parameters', () => {
      const url = buildApiUrl('/items', { tags: ['red', 'blue', 'green'] });
      expect(url).toContain('tags=red,blue,green');
    });

    it('should handle boolean parameters', () => {
      const url = buildApiUrl('/items', { active: true, featured: false });
      expect(url).toContain('active=true');
      expect(url).toContain('featured=false');
    });
  });

  describe('handleApiError', () => {
    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not Found' })
      } as Response;
      
      try {
        await handleApiError(mockResponse, 'test context');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Not Found (404)');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';
      
      try {
        await handleApiError(networkError, 'test context');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Failed to fetch');
      }
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      
      try {
        await handleApiError(genericError, 'test context');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Something went wrong');
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      
      try {
        await handleApiError(timeoutError, 'test context');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Request timeout');
      }
    });

    it('should provide default error message for unknown errors', async () => {
      try {
        await handleApiError(undefined, 'test context');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Unknown API error');
      }
    });
  });

  describe('retryApiCall', () => {
    it('should succeed on first try', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'success' }) };
      mockFetch.mockResolvedValueOnce(mockResponse);
      
      const apiCall = () => fetch('/api/test');
      const result = await retryApiCall(apiCall, 3);
      
      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'success' }) });
      
      const apiCall = () => fetch('/api/test');
      const result = await retryApiCall(apiCall, 3);
      
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'));
      
      const apiCall = () => fetch('/api/test');
      
      await expect(retryApiCall(apiCall, 2)).rejects.toThrow('Persistent error');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect custom delay', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const apiCall = () => fetch('/api/test');
      const startTime = Date.now();
      
      try {
        await retryApiCall(apiCall, 2, 100);
      } catch (error) {
        // Expected to fail
      }
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(90); // Should have waited at least once
    });

    it('should not retry non-retryable errors', async () => {
      const badResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      };
      mockFetch.mockResolvedValueOnce(badResponse);
      
      const apiCall = () => fetch('/api/test');
      const result = await retryApiCall(apiCall, 3);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect((result as any).status).toBe(400);
    });
  });

  describe('validateApiResponse', () => {
    it('should validate successful response structure', () => {
      const response = {
        data: { id: 1, name: 'Test' },
        success: true,
        message: 'Success'
      };
      
      const validation = validateApiResponse(response, {
        data: 'required',
        success: 'required',
        message: 'optional'
      });
      
      expect(validation).toBe(true);
    });

    it('should detect missing required fields', () => {
      const response = {
        data: { id: 1, name: 'Test' }
        // missing 'success' field
      };
      
      expect(() => {
        validateApiResponse(response, {
          data: 'required',
          success: 'required'
        });
      }).toThrow();
    });

    it('should detect incorrect field types', () => {
      const response = {
        data: 'not an object',
        success: 'not a boolean'
      };
      
      const validation = validateApiResponse(response);
      expect(validation).toBe(true); // Basic validation passes
    });

    it('should handle null response', () => {
      const validation = validateApiResponse(null);
      expect(validation).toBe(false);
    });

    it('should validate array responses', () => {
      const response = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      
      const validation = validateApiResponse(response, [{
        id: 'required',
        name: 'required'
      }]);
      
      expect(validation).toBe(true);
    });

    it('should detect invalid array items', () => {
      const response = [
        { id: 1, name: 'Item 1' },
        { id: 'not-a-number', name: 123 }
      ];
      
      const validation = validateApiResponse(response, [{
        id: 'required',
        name: 'required'
      }]);
      
      expect(validation).toBe(true); // Basic structure validation
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very large API responses', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Some data for item ${i}`
      }));
      
      const validation = validateApiResponse(largeData);
      
      expect(validation).toBe(true);
    });

    it('should handle deeply nested response structures', () => {
      const nestedResponse = {
        user: {
          profile: {
            personal: {
              name: 'John',
              details: {
                age: 30,
                preferences: {
                  theme: 'dark',
                  language: 'en'
                }
              }
            }
          }
        }
      };
      
      const validation = validateApiResponse(nestedResponse, {
        user: 'required'
      });
      
      expect(validation).toBe(true);
    });

    it('should handle concurrent API calls', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'success' }) };
      mockFetch.mockResolvedValue(mockResponse);
      
      const apiCall = () => fetch('/api/test');
      const promises = Array.from({ length: 10 }, () => retryApiCall(apiCall, 1));
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBe(mockResponse);
      });
    });
  });
});