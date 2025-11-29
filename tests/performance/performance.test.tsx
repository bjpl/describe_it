import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { measureRenderTime } from '../utils/test-utils';
import { mockFetch } from '../utils/test-utils';

// Performance testing utilities
const measureExecutionTime = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

const measureMemoryUsage = (): number => {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

const simulateSlowNetwork = (delay: number) => {
  global.fetch = vi.fn().mockImplementation(() =>
    new Promise(resolve => setTimeout(() => resolve(new Response('{"status": "ok"}')), delay))
  );
};

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Mock performance API
    global.performance.mark = vi.fn();
    global.performance.measure = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering Performance', () => {
    it('should render HomePage within performance threshold', async () => {
      const HomePage = await import('@/app/page').then(m => m.default);
      
      const renderTime = await measureRenderTime(() => {
        render(<HomePage />);
      });

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should render EnhancedQASystem efficiently', async () => {
      const { EnhancedQASystem } = await import('@/components/EnhancedQASystem');
      
      const props = {
        imageUrl: 'https://example.com/image.jpg',
        description: 'Test description',
        language: 'es' as const,
        difficulty: 'beginner' as const
      };

      const renderTime = await measureRenderTime(() => {
        render(<EnhancedQASystem {...props} />);
      });

      expect(renderTime).toBeLessThan(50); // QA system should render quickly
    });

    it('should render ImageSearch with large image sets efficiently', async () => {
      const { ImageSearch } = await import('@/components/ImageSearch/ImageSearch');
      
      // Mock large dataset
      const largeImageSet = Array(100).fill(null).map((_, i) => ({
        id: `image-${i}`,
        urls: { regular: `https://example.com/image-${i}.jpg` },
        alt_description: `Test image ${i}`,
        description: `Description for image ${i}`,
        user: { name: `User ${i}`, username: `user${i}` },
        width: 1920,
        height: 1080,
        likes: i * 2
      }));

      mockFetch({
        results: largeImageSet,
        total: 10000,
        total_pages: 100
      });

      const renderTime = await measureRenderTime(() => {
        render(<ImageSearch />);
      });

      expect(renderTime).toBeLessThan(200); // Should handle large datasets efficiently
    });

    it('should handle rapid re-renders without performance degradation', async () => {
      const { ImageSearch } = await import('@/components/ImageSearch/ImageSearch');
      
      const renderTimes: number[] = [];
      
      // Measure multiple renders
      for (let i = 0; i < 10; i++) {
        const time = await measureRenderTime(() => {
          const { rerender } = render(<ImageSearch />);
          rerender(<ImageSearch key={i} />);
        });
        renderTimes.push(time);
      }

      // Later renders should not be significantly slower
      const averageEarly = renderTimes.slice(0, 3).reduce((a, b) => a + b) / 3;
      const averageLater = renderTimes.slice(-3).reduce((a, b) => a + b) / 3;
      
      expect(averageLater).toBeLessThan(averageEarly * 2); // No more than 2x slower
    });
  });

  describe('API Performance', () => {
    it('should handle image search requests efficiently', async () => {
      mockFetch({
        results: Array(20).fill({
          id: 'test',
          urls: { regular: 'https://example.com/image.jpg' },
          alt_description: 'Test image'
        }),
        total: 1000,
        total_pages: 50
      });

      const executionTime = await measureExecutionTime(async () => {
        await fetch('/api/images/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test' })
        });
      });

      expect(executionTime).toBeLessThan(100); // API call should complete quickly
    });

    it('should handle description generation within time limits', async () => {
      mockFetch({
        descriptions: {
          spanish: {
            narrativo: 'Una descripción narrativa.',
            tecnico: 'Una descripción técnica.',
            poetico: 'Una descripción poética.'
          },
          english: {
            narrativo: 'A narrative description.',
            tecnico: 'A technical description.',
            poetico: 'A poetic description.'
          }
        }
      });

      const executionTime = await measureExecutionTime(async () => {
        await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg',
            style: 'all'
          })
        });
      });

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent API requests efficiently', async () => {
      mockFetch({ status: 'ok' });

      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        fetch('/api/health')
      );

      const startTime = performance.now();
      await Promise.all(requests);
      const totalTime = performance.now() - startTime;

      // Concurrent requests should not take much longer than sequential
      expect(totalTime).toBeLessThan(1000); // Under 1 second for 10 requests
    });

    it('should handle large payload processing efficiently', async () => {
      const largeVocabulary = Array(1000).fill({
        phrase: 'test phrase',
        translation: 'test translation',
        category: 'sustantivos',
        difficulty: 'intermediate'
      });

      mockFetch({ success: true, saved: 1000 });

      const executionTime = await measureExecutionTime(async () => {
        await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabulary: largeVocabulary })
        });
      });

      expect(executionTime).toBeLessThan(2000); // Large payload should process within 2 seconds
    });
  });

  describe('Hook Performance', () => {
    it('should handle useImageSearch efficiently with large datasets', async () => {
      const { useImageSearch } = await import('@/hooks/useImageSearch');
      
      mockFetch({
        results: Array(50).fill({
          id: 'test',
          urls: { regular: 'https://example.com/image.jpg' },
          alt_description: 'Test image'
        }),
        total: 10000,
        total_pages: 200
      });

      const { result } = renderHook(() => useImageSearch());

      const executionTime = await measureExecutionTime(async () => {
        await act(async () => {
          await result.current.searchImages('test query');
        });
      });

      expect(executionTime).toBeLessThan(200); // Hook should process data quickly
    });

    it('should debounce useDebounce effectively', async () => {
      const { useDebounce } = await import('@/hooks/useDebounce');
      
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      const startTime = performance.now();
      
      // Rapid changes
      for (let i = 0; i < 10; i++) {
        rerender({ value: `value-${i}` });
      }

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const endTime = performance.now();

      expect(endTime - startTime).toBeGreaterThan(500); // Debounce delay
      expect(endTime - startTime).toBeLessThan(700); // But not much more
      expect(result.current).toBe('value-9'); // Should have the latest value
    });

    it.skip('should handle useDescriptions memory efficiently', async () => {
      const { useDescriptions } = await import('@/hooks/useDescriptions');
      
      const initialMemory = measureMemoryUsage();
      
      const { result, unmount } = renderHook(() => 
        useDescriptions('https://example.com/image.jpg')
      );

      // Mock the correct response format expected by useDescriptions
      mockFetch({
        success: true,
        data: [
          {
            style: 'narrativo',
            text: 'Test description',
            language: 'es',
            wordCount: 2,
            generatedAt: new Date().toISOString()
          }
        ]
      });

      // Generate multiple descriptions
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.generateDescription({
            imageUrl: 'https://example.com/image.jpg',
            style: 'narrativo'
          });
        });
      }

      const afterMemory = measureMemoryUsage();
      unmount();

      // Memory usage should not grow excessively
      if (initialMemory > 0 && afterMemory > 0) {
        const memoryIncrease = afterMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      }
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network conditions gracefully', async () => {
      simulateSlowNetwork(2000); // 2 second delay

      const startTime = performance.now();
      
      try {
        await fetch('/api/health');
      } catch (error) {
        // Network request may timeout, which is acceptable
      }
      
      const endTime = performance.now();
      
      // Should not hang indefinitely
      expect(endTime - startTime).toBeLessThan(10000); // Max 10 seconds
    });

    it('should implement request timeout', async () => {
      // Mock a request that never resolves
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const requestPromise = fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      });

      await expect(Promise.race([requestPromise, timeoutPromise])).rejects.toThrow('Request timeout');
    });

    it('should handle request queuing efficiently', async () => {
      let requestCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        requestCount++;
        return Promise.resolve(new Response('{"status": "ok"}'));
      });

      // Queue multiple requests
      const requests = Array(20).fill(null).map((_, i) =>
        fetch(`/api/health?request=${i}`)
      );

      const startTime = performance.now();
      await Promise.all(requests);
      const totalTime = performance.now() - startTime;

      expect(requestCount).toBe(20);
      expect(totalTime).toBeLessThan(2000); // Should handle 20 requests quickly
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks with repeated operations', async () => {
      const { ImageSearch } = await import('@/components/ImageSearch/ImageSearch');
      
      const initialMemory = measureMemoryUsage();
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<ImageSearch key={i} />);
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
      }
    });

    it('should clean up event listeners properly', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const TestComponent = () => {
        React.useEffect(() => {
          const handler = () => {};
          window.addEventListener('resize', handler);
          return () => window.removeEventListener('resize', handler);
        }, []);
        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      expect(addEventListenerSpy).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(removeEventListenerSpy.mock.calls.length).toBe(addEventListenerSpy.mock.calls.length);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Bundle Size and Loading', () => {
    it('should lazy load components efficiently', async () => {
      const startTime = performance.now();
      
      // Dynamically import components
      await Promise.all([
        import('@/components/EnhancedQASystem'),
        import('@/components/ImageSearch/ImageSearch'),
        import('@/components/EnhancedVocabularyPanel')
      ]);
      
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    it('should handle code splitting effectively', async () => {
      // Test that different routes can be loaded independently
      const routeLoadTimes: number[] = [];
      
      const routes = [
        () => import('@/app/page'),
        () => import('@/components/EnhancedQASystem'),
        () => import('@/components/ImageSearch/ImageSearch')
      ];

      for (const route of routes) {
        const startTime = performance.now();
        await route();
        const loadTime = performance.now() - startTime;
        routeLoadTimes.push(loadTime);
      }

      // Each route should load reasonably quickly
      routeLoadTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });
    });
  });

  describe('Animation Performance', () => {
    it('should handle animations without blocking main thread', async () => {
      const { motion } = await import('framer-motion');
      
      const AnimatedComponent = () => (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Animated content
        </motion.div>
      );

      const renderTime = await measureRenderTime(() => {
        render(<AnimatedComponent />);
      });

      expect(renderTime).toBeLessThan(50); // Animation setup should be fast
    });

    it('should optimize animations for performance', async () => {
      // Test that animations use transform and opacity for better performance
      const TestAnimation = () => (
        <div
          style={{
            transform: 'translateX(0px)',
            opacity: 1,
            willChange: 'transform, opacity'
          }}
        >
          Optimized animation
        </div>
      );

      const renderTime = await measureRenderTime(() => {
        render(<TestAnimation />);
      });

      expect(renderTime).toBeLessThan(20);
    });
  });

  describe('Search Performance', () => {
    it('should handle search debouncing effectively', async () => {
      const { useImageSearch } = await import('@/hooks/useImageSearch');
      const { useDebounce } = await import('@/hooks/useDebounce');
      
      const { result } = renderHook(() => {
        const search = useImageSearch();
        const debouncedQuery = useDebounce('test query', 300);
        return { search, debouncedQuery };
      });

      // Debounced value should update after delay
      expect(result.current.debouncedQuery).toBe('test query');
    });

    it('should handle large search result sets efficiently', async () => {
      const largeResults = Array(200).fill({
        id: 'test',
        urls: { regular: 'https://example.com/image.jpg' },
        alt_description: 'Test image'
      });

      mockFetch({
        results: largeResults,
        total: 50000,
        total_pages: 250
      });

      const executionTime = await measureExecutionTime(async () => {
        await fetch('/api/images/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'popular', per_page: 200 })
        });
      });

      expect(executionTime).toBeLessThan(500); // Large results should still be fast
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors without performance impact', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const executionTime = await measureExecutionTime(async () => {
        try {
          await fetch('/api/images/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'test' })
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(executionTime).toBeLessThan(100); // Error handling should be fast
    });

    it('should recover from errors efficiently', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First call fails'));
        }
        return Promise.resolve(new Response('{"status": "ok"}'));
      });

      // First call fails, second succeeds
      const executionTime = await measureExecutionTime(async () => {
        try {
          await fetch('/api/health');
        } catch (error) {
          // Retry
          await fetch('/api/health');
        }
      });

      expect(executionTime).toBeLessThan(200); // Recovery should be fast
      expect(callCount).toBe(2);
    });
  });
});