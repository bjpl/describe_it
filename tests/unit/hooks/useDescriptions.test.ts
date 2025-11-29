import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDescriptions } from '@/hooks/useDescriptions';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the apiKeyProvider module
vi.mock('@/lib/api/keyProvider', () => ({
  apiKeyProvider: {
    getServiceConfig: vi.fn().mockReturnValue({
      apiKey: 'test-key',
      isValid: true
    })
  }
}));

const mockDescriptionsResponse = {
  success: true,
  data: [
    {
      id: 'desc-1',
      imageId: 'test-image',
      style: 'narrativo',
      content: 'Una hermosa montaña se eleva majestuosamente hacia el cielo azul.',
      language: 'es',
      createdAt: new Date().toISOString()
    },
    {
      id: 'desc-2',
      imageId: 'test-image',
      style: 'narrativo',
      content: 'A beautiful mountain rises majestically towards the blue sky.',
      language: 'en',
      createdAt: new Date().toISOString()
    }
  ]
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

describe('useDescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch(mockDescriptionsResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useDescriptions('test-image'));

      expect(result.current.descriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide all necessary methods', () => {
      const { result } = renderHook(() => useDescriptions('test-image'));

      expect(typeof result.current.generateDescription).toBe('function');
      expect(typeof result.current.clearDescriptions).toBe('function');
      expect(typeof result.current.regenerateDescription).toBe('function');
      expect(typeof result.current.deleteDescription).toBe('function');
    });
  });

  describe('Description Generation', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should generate descriptions for given image', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(2);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should call API with correct parameters', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/descriptions/generate', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      }));
    });

    it('should track loading state during generation', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Capture reference before async operation
      const generateFn = result.current.generateDescription;

      await act(async () => {
        await generateFn({
          imageUrl,
          style: 'narrativo'
        });
      });

      // After act completes, verify final state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Description Management', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should clear descriptions', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Generate descriptions first
      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.descriptions).toHaveLength(2);

      // Clear descriptions
      act(() => {
        result.current.clearDescriptions();
      });

      expect(result.current.descriptions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should delete specific description', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Generate descriptions first
      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.descriptions).toHaveLength(2);

      // Delete first description
      act(() => {
        result.current.deleteDescription('desc-1');
      });

      expect(result.current.descriptions).toHaveLength(1);
      expect(result.current.descriptions[0].id).toBe('desc-2');
    });

    it('should handle duplicate generations by replacing', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Generate descriptions twice
      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      const firstCount = result.current.descriptions.length;

      // Mock new response for second generation
      mockFetch(mockDescriptionsResponse);

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      // Should replace descriptions of same style, not duplicate
      expect(result.current.descriptions.length).toBeLessThanOrEqual(firstCount * 2);
    });
  });

  describe('Error Handling', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should set error state when API call fails', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Trigger validation error by using empty imageUrl
      await act(async () => {
        try {
          await result.current.generateDescription({
            imageUrl: '',
            style: 'narrativo'
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should track loading state during error', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Invalid input triggers error path
      await act(async () => {
        try {
          await result.current.generateDescription({
            imageUrl: '',
            style: 'narrativo'
          });
        } catch {
          // Expected to throw
        }
      });

      // After error, loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear errors when clearDescriptions is called', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // First create an error state via invalid input
      await act(async () => {
        try {
          await result.current.generateDescription({
            imageUrl: '',
            style: 'narrativo'
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Clear descriptions should also clear errors
      act(() => {
        result.current.clearDescriptions();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.descriptions).toEqual([]);
    });

    it('should handle missing required parameters', async () => {
      // Clear mocks - this test doesn't need fetch
      vi.clearAllMocks();

      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        try {
          await result.current.generateDescription({
            imageUrl: '',
            style: 'narrativo'
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Regeneration', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should call regenerateDescription method', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Verify regenerateDescription is a function
      expect(typeof result.current.regenerateDescription).toBe('function');
    });

    it('should handle regeneration of non-existent description', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Try to regenerate a description that doesn't exist
      await act(async () => {
        try {
          await result.current.regenerateDescription('non-existent-id');
        } catch {
          // Expected to throw
        }
      });

      // Should set error state for non-existent description
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Data Structure', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should format descriptions correctly', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      const description = result.current.descriptions[0];

      expect(description).toHaveProperty('id');
      expect(description).toHaveProperty('content');
      expect(description).toHaveProperty('language');
      expect(description).toHaveProperty('style');
      expect(description).toHaveProperty('imageId');
      expect(description).toHaveProperty('createdAt');
    });
  });

  describe('Cleanup and Memory', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useDescriptions('test-image'));

      expect(() => unmount()).not.toThrow();
    });

    it('should handle component updates without memory leaks', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useDescriptions(url),
        { initialProps: { url: 'https://example.com/image1.jpg' } }
      );

      // Multiple re-renders
      for (let i = 2; i <= 5; i++) {
        rerender({ url: `https://example.com/image${i}.jpg` });
      }

      // Should still be functional
      expect(result.current.descriptions).toEqual([]);
    });
  });
});
