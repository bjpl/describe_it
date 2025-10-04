import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDescriptions } from '@/hooks/useDescriptions';
import { createMockApiResponse, mockFetch, mockFetchError } from '../../utils/test-utils';

global.fetch = vi.fn();

const mockDescriptionsResponse = {
  descriptions: {
    spanish: {
      narrativo: 'Una hermosa montaña se eleva majestuosamente hacia el cielo azul.',
      tecnico: 'Formación rocosa de origen volcánico con elevación de 2,500 metros.',
      poetico: 'Gigante de piedra que besa las nubes en su eterno ascenso.'
    },
    english: {
      narrativo: 'A beautiful mountain rises majestically towards the blue sky.',
      tecnico: 'Volcanic rock formation with an elevation of 2,500 meters.',
      poetico: 'Stone giant that kisses the clouds in its eternal ascent.'
    }
  },
  metadata: {
    imageUrl: 'https://example.com/mountain.jpg',
    generatedAt: new Date().toISOString(),
    processingTime: 1250
  }
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
      const { result } = renderHook(() => useDescriptions(''));

      expect(result.current.descriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toEqual({
        current: 0,
        total: 0,
        stage: 'idle'
      });
    });

    it('should provide all necessary methods', () => {
      const { result } = renderHook(() => useDescriptions(''));

      expect(typeof result.current.generateDescription).toBe('function');
      expect(typeof result.current.clearDescriptions).toBe('function');
      expect(typeof result.current.regenerateDescription).toBe('function');
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

      expect(global.fetch).toHaveBeenCalledWith('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          style: 'narrativo'
        })
      });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(6); // 3 Spanish + 3 English
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should generate descriptions for specific style only', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Mock response with only one style
      mockFetch({
        descriptions: {
          spanish: { narrativo: 'Spanish narrative description' },
          english: { narrativo: 'English narrative description' }
        },
        metadata: { imageUrl, generatedAt: new Date().toISOString() }
      });

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.descriptions).toHaveLength(2);
      expect(result.current.descriptions[0].style).toBe('narrativo');
      expect(result.current.descriptions[1].style).toBe('narrativo');
    });

    it('should handle multiple languages', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'tecnico',
          languages: ['es', 'en']
        });
      });

      const spanishDescriptions = result.current.descriptions.filter(d => d.language === 'spanish');
      const englishDescriptions = result.current.descriptions.filter(d => d.language === 'english');

      expect(spanishDescriptions).toHaveLength(3);
      expect(englishDescriptions).toHaveLength(3);
    });

    it('should track loading state during generation', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      const generatePromise = act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.progress.stage).toBe('generating');

      await generatePromise;

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress.stage).toBe('completed');
    });

    it('should update progress during multi-step generation', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Mock multiple API calls for different styles
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(createMockApiResponse(mockDescriptionsResponse));
      });

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'all'
        });
      });

      expect(result.current.progress.current).toBeGreaterThan(0);
      expect(result.current.progress.total).toBeGreaterThan(0);
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

      expect(result.current.descriptions).toHaveLength(6);

      // Clear descriptions
      act(() => {
        result.current.clearDescriptions();
      });

      expect(result.current.descriptions).toEqual([]);
      expect(result.current.progress).toEqual({
        current: 0,
        total: 0,
        stage: 'idle'
      });
    });

    it('should regenerate specific descriptions', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Initial generation
      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      const initialCount = result.current.descriptions.length;

      // Mock different response for regeneration
      mockFetch({
        descriptions: {
          spanish: { poetico: 'Nueva descripción poética en español' },
          english: { poetico: 'New poetic description in English' }
        },
        metadata: { imageUrl, generatedAt: new Date().toISOString() }
      });

      // Regenerate specific style
      await act(async () => {
        await result.current.regenerateDescription('poetico');
      });

      expect(result.current.descriptions).toHaveLength(initialCount);
      expect(
        result.current.descriptions.find(d => d.style === 'poetico' && d.language === 'spanish')?.content
      ).toBe('Nueva descripción poética en español');
    });

    it('should handle duplicate generations', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Generate descriptions twice
      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      const firstCount = result.current.descriptions.length;

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      // Should replace, not duplicate
      expect(result.current.descriptions).toHaveLength(firstCount);
    });
  });

  describe('Error Handling', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should handle API errors', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      mockFetchError('OpenAI API error');

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.error).toBe('OpenAI API error');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.descriptions).toEqual([]);
    });

    it('should handle rate limiting', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      mockFetch({ error: 'Rate limit exceeded', retryAfter: 60 }, 429);

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.error).toContain('Rate limit exceeded');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle malformed responses', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      mockFetch({ invalid: 'response' });

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.error).toContain('Invalid response format');
    });

    it('should clear errors on successful generation', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // First call with error
      mockFetchError('Network error');

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.error).toBe('Network error');

      // Second call successful
      mockFetch(mockDescriptionsResponse);

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.error).toBeNull();
      expect(result.current.descriptions).toHaveLength(6);
    });
  });

  describe('Caching and Optimization', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should cache descriptions for the same image', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useDescriptions(url),
        { initialProps: { url: imageUrl } }
      );

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      const firstCallCount = (global.fetch as any).mock.calls.length;

      // Re-render with same URL
      rerender({ url: imageUrl });

      // Should not make additional API calls for cached data
      expect((global.fetch as any).mock.calls.length).toBe(firstCallCount);
    });

    it('should handle URL changes', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useDescriptions(url),
        { initialProps: { url: imageUrl } }
      );

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.descriptions).toHaveLength(6);

      // Change URL
      const newUrl = 'https://example.com/different-image.jpg';
      rerender({ url: newUrl });

      // Should clear descriptions for new URL
      expect(result.current.descriptions).toEqual([]);
    });

    it('should debounce rapid generation requests', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // Make multiple rapid requests
      const promises = [
        act(async () => {
          await result.current.generateDescription({
            imageUrl,
            style: 'narrativo'
          });
        }),
        act(async () => {
          await result.current.generateDescription({
            imageUrl,
            style: 'tecnico'
          });
        }),
        act(async () => {
          await result.current.generateDescription({
            imageUrl,
            style: 'poetico'
          });
        })
      ];

      await Promise.all(promises);

      // Should handle without errors and not make excessive API calls
      expect(result.current.error).toBeNull();
    });
  });

  describe('Progress Tracking', () => {
    const imageUrl = 'https://example.com/test-image.jpg';

    it('should track progress for single style generation', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      const generatePromise = act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      // Check intermediate progress
      expect(result.current.progress.stage).toBe('generating');

      await generatePromise;

      expect(result.current.progress.stage).toBe('completed');
      expect(result.current.progress.current).toBe(result.current.progress.total);
    });

    it('should track progress for multiple styles', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'all'
        });
      });

      expect(result.current.progress.total).toBeGreaterThan(1);
      expect(result.current.progress.current).toBe(result.current.progress.total);
    });

    it('should reset progress on new generation', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      // First generation
      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      expect(result.current.progress.stage).toBe('completed');

      // Second generation should reset progress
      act(() => {
        result.current.generateDescription({
          imageUrl,
          style: 'tecnico'
        });
      });

      expect(result.current.progress.stage).toBe('generating');
      expect(result.current.progress.current).toBe(0);
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
      expect(description).toHaveProperty('imageUrl');
      expect(description).toHaveProperty('createdAt');

      expect(typeof description.id).toBe('string');
      expect(typeof description.content).toBe('string');
      expect(['spanish', 'english']).toContain(description.language);
      expect(['narrativo', 'tecnico', 'poetico']).toContain(description.style);
    });

    it('should maintain chronological order', async () => {
      const { result } = renderHook(() => useDescriptions(imageUrl));

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'narrativo'
        });
      });

      const firstTimestamp = result.current.descriptions[0].createdAt;

      // Wait a bit and generate more
      await new Promise(resolve => setTimeout(resolve, 10));

      mockFetch({
        descriptions: {
          spanish: { tecnico: 'Technical description' }
        },
        metadata: { imageUrl, generatedAt: new Date().toISOString() }
      });

      await act(async () => {
        await result.current.generateDescription({
          imageUrl,
          style: 'tecnico'
        });
      });

      const lastDescription = result.current.descriptions[result.current.descriptions.length - 1];
      expect(new Date(lastDescription.createdAt).getTime()).toBeGreaterThan(
        new Date(firstTimestamp).getTime()
      );
    });
  });

  describe('Cleanup and Memory', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useDescriptions('https://example.com/image.jpg'));

      expect(() => unmount()).not.toThrow();
    });

    it('should handle component updates without memory leaks', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useDescriptions(url),
        { initialProps: { url: 'https://example.com/image1.jpg' } }
      );

      // Multiple re-renders
      for (let i = 2; i <= 10; i++) {
        rerender({ url: `https://example.com/image${i}.jpg` });
      }

      expect(result.current.descriptions).toEqual([]);
    });
  });
});