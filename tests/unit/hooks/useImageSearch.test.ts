import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageSearch } from '@/hooks/useImageSearch';
import { createMockApiResponse, mockFetch, mockFetchError } from '../../utils/test-utils';

// Mock fetch globally
global.fetch = vi.fn();

const mockSearchResponse = {
  results: [
    {
      id: 'test-1',
      urls: {
        raw: 'https://example.com/raw1.jpg',
        full: 'https://example.com/full1.jpg',
        regular: 'https://example.com/regular1.jpg',
        small: 'https://example.com/small1.jpg',
        thumb: 'https://example.com/thumb1.jpg'
      },
      alt_description: 'Test image 1',
      description: 'First test image',
      user: { name: 'User 1', username: 'user1' },
      width: 1920,
      height: 1080,
      likes: 10
    },
    {
      id: 'test-2',
      urls: {
        raw: 'https://example.com/raw2.jpg',
        full: 'https://example.com/full2.jpg',
        regular: 'https://example.com/regular2.jpg',
        small: 'https://example.com/small2.jpg',
        thumb: 'https://example.com/thumb2.jpg'
      },
      alt_description: 'Test image 2',
      description: 'Second test image',
      user: { name: 'User 2', username: 'user2' },
      width: 1280,
      height: 720,
      likes: 25
    }
  ],
  total: 1000,
  total_pages: 50
};

describe('useImageSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch(mockSearchResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useImageSearch());

      expect(result.current.images).toEqual([]);
      expect(result.current.loading).toEqual({ isLoading: false, message: '' });
      expect(result.current.error).toBeNull();
      expect(result.current.searchParams).toEqual({ query: '', page: 1 });
      expect(result.current.totalPages).toBe(1);
    });

    it('should provide all necessary methods', () => {
      const { result } = renderHook(() => useImageSearch());

      expect(typeof result.current.searchImages).toBe('function');
      expect(typeof result.current.loadMoreImages).toBe('function');
      expect(typeof result.current.setPage).toBe('function');
      expect(typeof result.current.clearResults).toBe('function');
    });
  });

  describe('Search Functionality', () => {
    it('should perform basic search', async () => {
      const { result } = renderHook(() => useImageSearch());

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mountains',
          page: 1,
          per_page: 20
        })
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(2);
        expect(result.current.searchParams.query).toBe('mountains');
        expect(result.current.totalPages).toBe(50);
      });
    });

    it('should search with filters', async () => {
      const { result } = renderHook(() => useImageSearch());

      const filters = {
        orientation: 'landscape' as const,
        category: 'nature' as const,
        color: 'green' as const
      };

      await act(async () => {
        await result.current.searchImages('mountains', 1, filters);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mountains',
          page: 1,
          per_page: 20,
          orientation: 'landscape',
          category: 'nature',
          color: 'green'
        })
      });
    });

    it('should search with custom page and per_page', async () => {
      const { result } = renderHook(() => useImageSearch());

      await act(async () => {
        await result.current.searchImages('mountains', 3, undefined, 30);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mountains',
          page: 3,
          per_page: 30
        })
      });
    });

    it('should set loading state during search', async () => {
      const { result } = renderHook(() => useImageSearch());

      const searchPromise = act(async () => {
        await result.current.searchImages('mountains');
      });

      // Check loading state immediately after calling search
      expect(result.current.loading.isLoading).toBe(true);
      expect(result.current.loading.message).toBe('Searching images...');

      await searchPromise;

      expect(result.current.loading.isLoading).toBe(false);
      expect(result.current.loading.message).toBe('');
    });

    it('should clear previous results on new search', async () => {
      const { result } = renderHook(() => useImageSearch());

      // First search
      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.images).toHaveLength(2);

      // Mock different response for second search
      mockFetch({
        results: [mockSearchResponse.results[0]], // Only one image
        total: 1,
        total_pages: 1
      });

      // Second search
      await act(async () => {
        await result.current.searchImages('ocean');
      });

      expect(result.current.images).toHaveLength(1);
      expect(result.current.searchParams.query).toBe('ocean');
    });
  });

  describe('Pagination', () => {
    it('should load more images and append to existing results', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Initial search
      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.images).toHaveLength(2);

      // Mock response for page 2
      const page2Response = {
        results: [
          {
            id: 'test-3',
            urls: { regular: 'https://example.com/regular3.jpg' },
            alt_description: 'Test image 3',
            description: 'Third test image',
            user: { name: 'User 3', username: 'user3' },
            width: 1600,
            height: 900,
            likes: 15
          }
        ],
        total: 1000,
        total_pages: 50
      };

      mockFetch(page2Response);

      // Load more
      await act(async () => {
        await result.current.loadMoreImages();
      });

      expect(result.current.images).toHaveLength(3);
      expect(result.current.searchParams.page).toBe(2);
    });

    it('should set specific page', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Initial search
      await act(async () => {
        await result.current.searchImages('mountains');
      });

      // Mock response for page 5
      mockFetch(mockSearchResponse);

      // Set page 5
      await act(async () => {
        await result.current.setPage(5);
      });

      expect(result.current.searchParams.page).toBe(5);
      expect(global.fetch).toHaveBeenCalledWith('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mountains',
          page: 5,
          per_page: 20
        })
      });
    });

    it('should not load more if on last page', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Mock single page response
      mockFetch({
        results: mockSearchResponse.results,
        total: 2,
        total_pages: 1
      });

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.totalPages).toBe(1);
      expect(result.current.searchParams.page).toBe(1);

      // Clear the mock to check if fetch is called
      vi.clearAllMocks();

      // Try to load more
      await act(async () => {
        await result.current.loadMoreImages();
      });

      // Should not make API call
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors', async () => {
      const { result } = renderHook(() => useImageSearch());

      mockFetchError('Network error');

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading.isLoading).toBe(false);
      expect(result.current.images).toEqual([]);
    });

    it('should handle API error responses', async () => {
      const { result } = renderHook(() => useImageSearch());

      mockFetch({ error: 'Rate limit exceeded' }, 429);

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.error).toContain('Rate limit exceeded');
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      const { result } = renderHook(() => useImageSearch());

      mockFetch({ invalid: 'response' });

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.error).toContain('Invalid response');
      expect(result.current.images).toEqual([]);
    });

    it('should clear errors on successful search', async () => {
      const { result } = renderHook(() => useImageSearch());

      // First search with error
      mockFetchError('Network error');

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.error).toBe('Network error');

      // Second search successful
      mockFetch(mockSearchResponse);

      await act(async () => {
        await result.current.searchImages('ocean');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.images).toHaveLength(2);
    });
  });

  describe('State Management', () => {
    it('should clear results', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Perform search first
      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.images).toHaveLength(2);

      // Clear results
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.images).toEqual([]);
      expect(result.current.searchParams).toEqual({ query: '', page: 1 });
      expect(result.current.totalPages).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it('should maintain search parameters across operations', async () => {
      const { result } = renderHook(() => useImageSearch());

      const filters = {
        orientation: 'portrait' as const,
        category: 'people' as const,
        color: 'blue' as const
      };

      await act(async () => {
        await result.current.searchImages('portraits', 1, filters);
      });

      expect(result.current.searchParams.query).toBe('portraits');

      // Load more should maintain the same parameters
      mockFetch(mockSearchResponse);

      await act(async () => {
        await result.current.loadMoreImages();
      });

      expect(global.fetch).toHaveBeenLastCalledWith('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'portraits',
          page: 2,
          per_page: 20,
          orientation: 'portrait',
          category: 'people',
          color: 'blue'
        })
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const { result } = renderHook(() => useImageSearch());

      mockFetch({
        results: [],
        total: 0,
        total_pages: 0
      });

      await act(async () => {
        await result.current.searchImages('nonexistent');
      });

      expect(result.current.images).toEqual([]);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing image properties', async () => {
      const { result } = renderHook(() => useImageSearch());

      const incompleteResponse = {
        results: [{
          id: 'incomplete',
          urls: { regular: 'https://example.com/image.jpg' },
          // Missing other properties
        }],
        total: 1,
        total_pages: 1
      };

      mockFetch(incompleteResponse);

      await act(async () => {
        await result.current.searchImages('test');
      });

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].id).toBe('incomplete');
    });

    it('should handle very large result sets', async () => {
      const { result } = renderHook(() => useImageSearch());

      const largeResponse = {
        results: mockSearchResponse.results,
        total: 1000000,
        total_pages: 50000
      };

      mockFetch(largeResponse);

      await act(async () => {
        await result.current.searchImages('popular');
      });

      expect(result.current.totalPages).toBe(50000);
      expect(result.current.images).toHaveLength(2);
    });

    it('should handle concurrent search requests', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Start multiple searches concurrently
      const searchPromises = [
        act(async () => {
          await result.current.searchImages('mountains');
        }),
        act(async () => {
          await result.current.searchImages('ocean');
        }),
        act(async () => {
          await result.current.searchImages('cities');
        })
      ];

      await Promise.all(searchPromises);

      // Only the last search should be reflected in state
      expect(result.current.searchParams.query).toBe('cities');
    });

    it('should handle network timeouts', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Mock a timeout error
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await act(async () => {
        await result.current.searchImages('mountains');
      });

      expect(result.current.error).toContain('Request timeout');
      expect(result.current.loading.isLoading).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle rapid successive calls', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Make multiple rapid calls
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          act(async () => {
            await result.current.searchImages(`query${i}`);
          })
        );
      }

      await Promise.all(promises);

      // Should complete without errors
      expect(result.current.error).toBeNull();
    });

    it('should cleanup properly on unmount', () => {
      const { unmount } = renderHook(() => useImageSearch());

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});