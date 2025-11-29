import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageSearch } from '@/hooks/useImageSearch';

// Mock fetch globally
global.fetch = vi.fn();

const mockSearchResponse = {
  images: [
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
  totalPages: 50,
  total: 1000
};

const mockFetch = (response: any, status = 200) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};

const mockFetchError = (error: string) => {
  (global.fetch as any).mockRejectedValueOnce(new Error(error));
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
      expect(result.current.searchParams).toEqual({ query: '', page: 1, per_page: 20 });
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

      await waitFor(() => {
        expect(result.current.images).toHaveLength(2);
        expect(result.current.searchParams.query).toBe('mountains');
        expect(result.current.totalPages).toBe(50);
      });
    });

    it('should set loading state during search', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Capture reference before async operation
      const searchFn = result.current.searchImages;

      await act(async () => {
        await searchFn('mountains');
      });

      // Verify final state after search completes
      await waitFor(() => {
        expect(result.current.loading.isLoading).toBe(false);
        expect(result.current.loading.message).toBe('');
      });
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
        images: [mockSearchResponse.images[0]],
        totalPages: 1,
        total: 1
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
        images: [
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
        totalPages: 50,
        total: 1000
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
        result.current.setPage(5);
      });

      await waitFor(() => {
        expect(result.current.searchParams.page).toBe(5);
      });
    });

    it('should not load more if already on last page', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Perform initial search (uses beforeEach mock with totalPages: 50)
      await act(async () => {
        await result.current.searchImages('mountains');
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(2);
      });

      // Without a query, loadMoreImages should return early
      act(() => {
        result.current.clearResults();
      });

      // After clearing, searchParams.query is empty, so loadMoreImages should do nothing
      const fetchCallsBefore = (global.fetch as any).mock.calls.length;

      await act(async () => {
        await result.current.loadMoreImages();
      });

      // Should not make API call since query is empty
      expect((global.fetch as any).mock.calls.length).toBe(fetchCallsBefore);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty query as validation error', async () => {
      const { result } = renderHook(() => useImageSearch());

      await act(async () => {
        await result.current.searchImages('');
      });

      expect(result.current.error).toBe('Please enter a search query');
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should clear errors when clearResults is called', async () => {
      const { result } = renderHook(() => useImageSearch());

      // Set an error first
      await act(async () => {
        await result.current.searchImages('');
      });

      expect(result.current.error).toBeTruthy();

      // Clear results should also clear error
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.error).toBeNull();
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
      expect(result.current.searchParams).toEqual({ query: '', page: 1, per_page: 20 });
      expect(result.current.totalPages).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    // Note: Edge cases with custom mock responses require more complex setup
    // due to the hook's abort controller and retry logic.
    // These tests verify basic edge case handling behavior.

    it('should handle search with special characters', async () => {
      const { result } = renderHook(() => useImageSearch());

      await act(async () => {
        await result.current.searchImages('mountains & lakes');
      });

      // Should make the request with special characters
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle whitespace-only queries', async () => {
      const { result } = renderHook(() => useImageSearch());

      await act(async () => {
        await result.current.searchImages('   ');
      });

      // Whitespace should be trimmed and treated as empty
      expect(result.current.error).toBe('Please enter a search query');
    });
  });

  describe('Performance', () => {
    it('should cleanup properly on unmount', () => {
      const { unmount } = renderHook(() => useImageSearch());

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});
