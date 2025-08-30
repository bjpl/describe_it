import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  performanceTestSuite, 
  expectPerformance, 
  MemoryLeakDetector, 
  PerformanceRegression 
} from '../utils/performance-helpers';
import { createLargeDataset, createMemoryIntensiveObject } from '../utils/test-factories';

// Import components for benchmarking
import ImageSearch from '@/components/ImageSearch/ImageSearch';
import ImageGrid from '@/components/ImageSearch/ImageGrid';
import DescriptionTabs from '@/components/DescriptionTabs/DescriptionTabs';
import { useImageSearch } from '@/hooks/useImageSearch';
import { useDescriptions } from '@/hooks/useDescriptions';

/**
 * Performance Benchmark Test Suite
 * 
 * This suite tests the performance characteristics of the application
 * to ensure it meets performance requirements and doesn't regress.
 */

describe('Performance Benchmarks', () => {
  let memoryDetector: MemoryLeakDetector;
  let regressionTracker: PerformanceRegression;
  
  beforeAll(() => {
    memoryDetector = new MemoryLeakDetector();
    regressionTracker = new PerformanceRegression();
  });
  
  beforeEach(() => {
    memoryDetector.takeSnapshot('test-start');
  });
  
  afterEach(() => {
    memoryDetector.takeSnapshot('test-end');
    
    // Check for memory leaks
    const hasLeaks = memoryDetector.detectLeaks(10); // 10MB threshold
    if (hasLeaks) {
      console.warn('Potential memory leak detected:', memoryDetector.getMemoryReport());
    }
    
    memoryDetector.reset();
  });
  
  describe('Component Rendering Performance', () => {
    it('should render ImageSearch component quickly', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const metrics = await performanceTestSuite.measureRenderTime(
        () => render(
          <QueryClientProvider client={queryClient}>
            <ImageSearch />
          </QueryClientProvider>
        ),
        10 // 10 iterations
      );
      
      // Performance thresholds
      expectPerformance.toBeFasterThan(metrics, 50); // < 50ms
      expectPerformance.toBeConsistent(metrics, 20); // < 20ms std deviation
      expectPerformance.toUseMemoryLessThan(metrics, 5 * 1024 * 1024); // < 5MB
      
      // Track for regression
      const hasRegression = regressionTracker.checkRegression(
        'ImageSearch-render',
        metrics,
        15 // 15% threshold
      );
      
      expect(hasRegression).toBe(false);
    });
    
    it('should render large image grids efficiently', async () => {
      const largeImageSet = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-image-${i}`,
        urls: {
          small: `https://example.com/image-${i}-small.jpg`,
          regular: `https://example.com/image-${i}.jpg`,
          full: `https://example.com/image-${i}-full.jpg`,
        },
        alt_description: `Performance test image ${i}`,
        description: `Large dataset test image number ${i}`,
        user: { name: 'Perf User', username: 'perfuser' },
        width: 800,
        height: 600,
        color: '#ffffff',
        likes: i * 10,
        created_at: '2023-01-01T00:00:00Z',
      }));
      
      const metrics = await performanceTestSuite.measureRenderTime(
        () => render(
          <ImageGrid 
            images={largeImageSet}
            onImageSelect={() => {}}
            loading={false}
          />
        ),
        5
      );
      
      expectPerformance.toBeFasterThan(metrics, 200); // < 200ms for 100 images
      expectPerformance.toUseMemoryLessThan(metrics, 10 * 1024 * 1024); // < 10MB
      
      regressionTracker.checkRegression('ImageGrid-large-dataset', metrics, 20);
    });
    
    it('should handle rapid re-renders efficiently', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const metrics = await performanceTestSuite.measureExecutionTime(async () => {
        let component: any;
        
        // Perform 50 rapid re-renders
        for (let i = 0; i < 50; i++) {
          component = render(
            <QueryClientProvider client={queryClient}>
              <ImageSearch key={i} searchQuery={`query-${i}`} />
            </QueryClientProvider>
          );
          component.unmount();
        }
        
        return component;
      });
      
      expectPerformance.toBeFasterThan(metrics, 1000); // < 1 second for 50 re-renders
      expectPerformance.toUseMemoryLessThan(metrics, 20 * 1024 * 1024); // < 20MB
    });
  });
  
  describe('Hook Performance', () => {
    it('should execute useImageSearch hook efficiently', async () => {
      // Mock API call
      vi.mock('@/lib/api', () => ({
        searchImages: vi.fn().mockResolvedValue({
          total: 100,
          total_pages: 5,
          results: Array.from({ length: 20 }, (_, i) => ({
            id: `hook-test-${i}`,
            urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
            alt_description: `Hook test ${i}`,
            description: 'Hook performance test',
            user: { name: 'Test', username: 'test' },
            width: 800,
            height: 600,
            color: '#ffffff',
            likes: 10,
            created_at: '2023-01-01T00:00:00Z',
          }))
        })
      }));
      
      const { renderHook } = await import('@testing-library/react');
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
      
      const metrics = await performanceTestSuite.measureExecutionTime(async () => {
        const { result } = renderHook(() => useImageSearch(), { wrapper });
        
        // Simulate multiple searches
        for (let i = 0; i < 10; i++) {
          result.current.searchImages({ query: `perf-test-${i}` });
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return result.current;
      }, 3);
      
      expectPerformance.toBeFasterThan(metrics, 500); // < 500ms
      expectPerformance.toBeConsistent(metrics, 100);
    });
    
    it('should handle concurrent hook operations', async () => {
      const { renderHook } = await import('@testing-library/react');
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
      
      const metrics = await performanceTestSuite.measureExecutionTime(async () => {
        // Create multiple hook instances
        const hooks = Array.from({ length: 10 }, () => 
          renderHook(() => useImageSearch(), { wrapper })
        );
        
        // Execute operations concurrently
        const operations = hooks.map((hook, i) => 
          hook.result.current.searchImages({ query: `concurrent-${i}` })
        );
        
        await Promise.all(operations);
        
        return hooks;
      });
      
      expectPerformance.toBeFasterThan(metrics, 1000); // < 1 second
    });
  });
  
  describe('API Performance', () => {
    it('should handle API calls within acceptable time', async () => {
      // Mock fetch to simulate API response time
      global.fetch = vi.fn().mockImplementation(async (url) => {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total: 50,
            total_pages: 3,
            results: Array.from({ length: 20 }, (_, i) => ({
              id: `api-perf-${i}`,
              urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
              alt_description: 'API performance test',
              description: 'Testing API performance',
              user: { name: 'Test', username: 'test' },
              width: 800,
              height: 600,
              color: '#ffffff',
              likes: 10,
              created_at: '2023-01-01T00:00:00Z',
            }))
          })
        };
      });
      
      const metrics = await performanceTestSuite.measureApiPerformance(
        async () => {
          const response = await fetch('/api/images/search?query=performance');
          return response.json();
        },
        {
          iterations: 5,
          timeout: 2000
        }
      );
      
      expectPerformance.toBeFasterThan(metrics, 300); // < 300ms average
      expectPerformance.toBeConsistent(metrics, 50);
    });
    
    it('should handle high-frequency API calls', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: [], total: 0, total_pages: 0 })
      });
      
      const loadTestResults = await performanceTestSuite.simulateLoad(
        async () => {
          const response = await fetch('/api/images/search?query=load-test');
          return response.json();
        },
        {
          concurrency: 10,
          iterations: 100
        }
      );
      
      expect(loadTestResults.successRate).toBeGreaterThan(0.95); // > 95% success
      expect(loadTestResults.averageTime).toBeLessThan(100); // < 100ms average
      expect(loadTestResults.percentiles.p95).toBeLessThan(200); // 95% < 200ms
    });
  });
  
  describe('Memory Management', () => {
    it('should not leak memory during normal operations', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      // Track memory usage during operations
      const { result: resourceUsage } = await performanceTestSuite.monitorResources(
        async () => {
          // Perform memory-intensive operations
          for (let i = 0; i < 50; i++) {
            const component = render(
              <QueryClientProvider client={queryClient}>
                <ImageSearch key={i} />
              </QueryClientProvider>
            );
            
            // Simulate user interactions
            await new Promise(resolve => setTimeout(resolve, 10));
            
            component.unmount();
          }
        },
        50 // Monitor every 50ms
      );
      
      // Memory should not increase dramatically
      const memoryIncrease = resourceUsage.peakMemory - resourceUsage.resourceUsage[0].memory.used;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB increase
    });
    
    it('should handle large datasets without excessive memory usage', async () => {
      const largeDataset = createLargeDataset(1000);
      
      const metrics = await performanceTestSuite.measureExecutionTime(async () => {
        // Process large dataset
        const processed = largeDataset.map(item => ({
          ...item,
          processed: true,
          timestamp: Date.now()
        }));
        
        // Simulate some operations on the dataset
        const filtered = processed.filter(item => item.id.includes('500'));
        const sorted = filtered.sort((a, b) => a.id.localeCompare(b.id));
        
        return sorted;
      });
      
      expectPerformance.toBeFasterThan(metrics, 100); // Should process 1000 items quickly
      expectPerformance.toUseMemoryLessThan(metrics, 100 * 1024 * 1024); // < 100MB
    });
    
    it('should clean up resources properly', async () => {
      const initialMemory = performanceTestSuite.takeMemorySnapshot();
      
      // Create and destroy many objects
      for (let i = 0; i < 100; i++) {
        const memoryIntensive = createMemoryIntensiveObject(10000);
        
        // Use the object
        Object.keys(memoryIntensive).length;
        
        // Let it go out of scope
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for GC
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = performanceTestSuite.takeMemorySnapshot();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        // Should not have significant memory increase after cleanup
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB
      }
    });
  });
  
  describe('Real-world Performance Scenarios', () => {
    it('should handle typical user session efficiently', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      // Simulate a typical user session
      const sessionMetrics = await performanceTestSuite.measureExecutionTime(async () => {
        // User searches for images
        const searchComponent = render(
          <QueryClientProvider client={queryClient}>
            <ImageSearch />
          </QueryClientProvider>
        );
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // User selects an image and views descriptions
        const mockImage = {
          id: 'session-test',
          urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
          alt_description: 'Session test image',
          description: 'User session test',
          user: { name: 'Test', username: 'test' },
          width: 800,
          height: 600,
          color: '#ffffff',
          likes: 10,
          created_at: '2023-01-01T00:00:00Z',
        };
        
        const descriptionComponent = render(
          <QueryClientProvider client={queryClient}>
            <DescriptionTabs image={mockImage} />
          </QueryClientProvider>
        );
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Clean up
        searchComponent.unmount();
        descriptionComponent.unmount();
        
        return 'session-complete';
      });
      
      // Entire session should be responsive
      expectPerformance.toBeFasterThan(sessionMetrics, 1000); // < 1 second
    });
    
    it('should maintain performance with background operations', async () => {
      // Simulate background tasks
      const backgroundTasks = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => {
          setTimeout(() => {
            // Simulate some background work
            const data = Array.from({ length: 1000 }, (_, j) => ({ id: j, value: Math.random() }));
            data.sort((a, b) => a.value - b.value);
            resolve(data);
          }, 100 + i * 50);
        })
      );
      
      const foregroundMetrics = await performanceTestSuite.measureExecutionTime(async () => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false } }
        });
        
        // Foreground user interaction while background tasks run
        const component = render(
          <QueryClientProvider client={queryClient}>
            <ImageSearch />
          </QueryClientProvider>
        );
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        component.unmount();
        
        return 'foreground-complete';
      });
      
      // Wait for background tasks to complete
      await Promise.all(backgroundTasks);
      
      // Foreground should remain responsive despite background activity
      expectPerformance.toBeFasterThan(foregroundMetrics, 500);
    });
  });
  
  describe('Performance Regression Tests', () => {
    it('should not regress from baseline performance', () => {
      const report = regressionTracker.getRegressionReport();
      
      // Log regression report for analysis
      if (report.length > 0) {
        console.log('Performance Regression Report:', report);
      }
      
      // Check that no critical regressions occurred
      const criticalRegressions = report.filter(r => 
        r.regressions.some(reg => reg.percentIncrease > 25)
      );
      
      expect(criticalRegressions).toHaveLength(0);
    });
    
    it('should maintain performance standards across test runs', async () => {
      const testRuns = [];
      
      // Run the same test multiple times to check consistency
      for (let i = 0; i < 5; i++) {
        const metrics = await performanceTestSuite.measureRenderTime(
          () => render(<div>Performance consistency test</div>),
          3
        );
        testRuns.push(metrics.averageTime);
      }
      
      // Calculate variance across runs
      const average = testRuns.reduce((a, b) => a + b, 0) / testRuns.length;
      const variance = testRuns.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / testRuns.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Performance should be consistent across runs
      expect(standardDeviation).toBeLessThan(average * 0.2); // < 20% of average
    });
  });
  
  afterAll(() => {
    // Generate final performance report
    const memoryReport = memoryDetector.getMemoryReport();
    const regressionReport = regressionTracker.getRegressionReport();
    
    if (process.env.NODE_ENV === 'test' && process.env.CI) {
      // In CI environment, output performance metrics
      console.log('\n=== Performance Test Summary ===');
      console.log('Memory Usage Report:', memoryReport);
      console.log('Regression Report:', regressionReport);
    }
  });
});
