import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock performance APIs
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
  },
  writable: true,
});

// Mock React Profiler - moved inside the vi.mock factory to avoid hoisting issues
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof React>('react');

  const ProfilerMock = ({ children, onRender }: any) => {
    actual.useEffect(() => {
      // Simulate profiler callback
      if (onRender) {
        onRender('test-id', 'mount', 100, 150, 50, 200);
      }
    }, [onRender]);

    return children;
  };

  return {
    ...actual,
    Profiler: ProfilerMock,
  };
});

// Test component that can simulate different performance scenarios
const PerformanceTestComponent = ({ 
  renderTime = 0, 
  rerenderCount = 0,
  simulateExpensiveOperation = false 
}) => {
  const [count, setCount] = React.useState(0);
  const [data, setData] = React.useState<any[]>([]);
  
  // Simulate expensive computation
  const expensiveValue = React.useMemo(() => {
    if (simulateExpensiveOperation) {
      // Simulate heavy computation
      let result = 0;
      for (let i = 0; i < 100000; i++) {
        result += Math.random();
      }
      return result;
    }
    return 0;
  }, [simulateExpensiveOperation]);
  
  // Simulate render time
  React.useLayoutEffect(() => {
    if (renderTime > 0) {
      const start = Date.now();
      while (Date.now() - start < renderTime) {
        // Busy wait to simulate render time
      }
    }
  });
  
  // Force re-renders for testing
  React.useEffect(() => {
    if (rerenderCount > 0) {
      const timer = setTimeout(() => {
        setCount(prev => prev + 1);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [count, rerenderCount]);
  
  return (
    <div data-testid="performance-test-component">
      <div data-testid="count">{count}</div>
      <div data-testid="expensive-value">{expensiveValue}</div>
      <div data-testid="data-length">{data.length}</div>
      <button 
        onClick={() => setCount(c => c + 1)}
        data-testid="increment"
      >
        Increment
      </button>
      <button 
        onClick={() => setData(prev => [...prev, { id: Date.now() }])}
        data-testid="add-data"
      >
        Add Data
      </button>
    </div>
  );
};

// Memory usage tracking
const getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  
  // Fallback for browser environment
  return {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    rss: 0
  };
};

describe('Component Performance Tests', () => {
  let timeNow = 0;
  
  beforeEach(() => {
    vi.clearAllMocks();
    timeNow = 0;
    mockPerformanceNow.mockImplementation(() => timeNow);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Render Performance', () => {
    it('should render components within acceptable time limits', async () => {
      const startTime = Date.now();
      
      render(<PerformanceTestComponent />);
      
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      // Component should render within 100ms
      expect(renderTime).toBeLessThan(100);
      
      // Verify component rendered successfully
      expect(screen.getByTestId('performance-test-component')).toBeInTheDocument();
    });

    it('should handle multiple rapid re-renders efficiently', async () => {
      const { rerender } = render(<PerformanceTestComponent />);
      
      const startTime = Date.now();
      
      // Perform multiple re-renders rapidly
      for (let i = 0; i < 10; i++) {
        rerender(<PerformanceTestComponent rerenderCount={i} />);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All re-renders should complete within 500ms
      expect(totalTime).toBeLessThan(500);
    });

    it('should use React.memo effectively for expensive components', () => {
      const MemoizedComponent = React.memo(PerformanceTestComponent);
      
      const { rerender } = render(<MemoizedComponent simulateExpensiveOperation={true} />);
      
      const initialValue = screen.getByTestId('expensive-value').textContent;
      
      // Re-render with same props (should not recalculate expensive value)
      rerender(<MemoizedComponent simulateExpensiveOperation={true} />);
      
      const secondValue = screen.getByTestId('expensive-value').textContent;
      
      // Values should be the same due to memoization
      expect(secondValue).toBe(initialValue);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during component lifecycle', async () => {
      const initialMemory = getMemoryUsage();
      
      const { unmount } = render(<PerformanceTestComponent />);
      
      // Simulate user interactions
      const incrementButton = screen.getByTestId('increment');
      const addDataButton = screen.getByTestId('add-data');
      
      // Perform multiple interactions
      for (let i = 0; i < 50; i++) {
        fireEvent.click(incrementButton);
        fireEvent.click(addDataButton);
      }
      
      // Clean up
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large data sets without excessive memory usage', async () => {
      const { unmount } = render(<PerformanceTestComponent />);
      
      const addDataButton = screen.getByTestId('add-data');
      const initialMemory = getMemoryUsage();
      
      // Add large amount of data
      for (let i = 0; i < 1000; i++) {
        fireEvent.click(addDataButton);
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('data-length')).toHaveTextContent('1000');
      });
      
      const memoryAfterData = getMemoryUsage();
      const memoryIncrease = memoryAfterData.heapUsed - initialMemory.heapUsed;
      
      // Memory usage should scale reasonably with data size
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      
      unmount();
    });
  });

  describe('Event Handler Performance', () => {
    it('should handle rapid user interactions efficiently', async () => {
      render(<PerformanceTestComponent />);
      
      const incrementButton = screen.getByTestId('increment');
      const startTime = Date.now();
      
      // Simulate rapid clicking
      for (let i = 0; i < 100; i++) {
        fireEvent.click(incrementButton);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All clicks should be processed within 1 second
      expect(totalTime).toBeLessThan(1000);
      
      // Verify final count is correct
      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('100');
      });
    });

    it('should debounce expensive operations correctly', async () => {
      const expensiveOperation = vi.fn();
      
      const DebouncedComponent = () => {
        const [value, setValue] = React.useState('');
        
        // Simulate debounced expensive operation
        const debouncedExpensiveOp = React.useCallback(
          debounce((val: string) => {
            expensiveOperation(val);
          }, 300),
          []
        );
        
        React.useEffect(() => {
          if (value) {
            debouncedExpensiveOp(value);
          }
        }, [value, debouncedExpensiveOp]);
        
        return (
          <input 
            data-testid="debounced-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      };
      
      render(<DebouncedComponent />);
      
      const input = screen.getByTestId('debounced-input');
      
      // Type rapidly
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });
      
      // Should not call expensive operation immediately
      expect(expensiveOperation).not.toHaveBeenCalled();
      
      // Wait for debounce delay
      await waitFor(() => {
        expect(expensiveOperation).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
      
      expect(expensiveOperation).toHaveBeenCalledWith('abc');
    });
  });

  describe('Animation Performance', () => {
    it('should maintain smooth animations under load', async () => {
      const AnimatedComponent = () => {
        const [isAnimating, setIsAnimating] = React.useState(false);
        const [frames, setFrames] = React.useState(0);
        
        React.useEffect(() => {
          if (isAnimating) {
            let animationFrame: number;
            let startTime = performance.now();
            
            const animate = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              
              if (elapsed < 1000) { // Animate for 1 second
                setFrames(prev => prev + 1);
                animationFrame = requestAnimationFrame(animate);
              } else {
                setIsAnimating(false);
              }
            };
            
            animationFrame = requestAnimationFrame(animate);
            
            return () => {
              if (animationFrame) {
                cancelAnimationFrame(animationFrame);
              }
            };
          }
        }, [isAnimating]);
        
        return (
          <div>
            <button 
              onClick={() => setIsAnimating(true)}
              data-testid="start-animation"
            >
              Start Animation
            </button>
            <div data-testid="frame-count">{frames}</div>
          </div>
        );
      };
      
      render(<AnimatedComponent />);
      
      const startButton = screen.getByTestId('start-animation');
      fireEvent.click(startButton);
      
      // Wait for animation to complete
      await waitFor(() => {
        const frameCount = parseInt(screen.getByTestId('frame-count').textContent || '0');
        expect(frameCount).toBeGreaterThan(30); // Should achieve ~60fps (30+ frames in 500ms)
      }, { timeout: 2000 });
    });
  });

  describe('Profiler Integration', () => {
    it('should provide performance metrics through React Profiler', () => {
      const onRender = vi.fn();
      
      render(
        <React.Profiler id="test-profiler" onRender={onRender}>
          <PerformanceTestComponent />
        </React.Profiler>
      );
      
      // Profiler should have been called
      expect(onRender).toHaveBeenCalled();
      
      const [id, phase, actualDuration, baseDuration, startTime, commitTime] = onRender.mock.calls[0];
      
      expect(id).toBe('test-profiler');
      expect(phase).toBe('mount');
      expect(actualDuration).toBeGreaterThan(0);
    });
  });

  describe('Bundle Size Impact', () => {
    it('should not significantly increase bundle size', () => {
      // This is more of a build-time test, but we can simulate
      const componentString = PerformanceTestComponent.toString();
      const componentSize = new Blob([componentString]).size;
      
      // Component should be reasonably sized (less than 10KB)
      expect(componentSize).toBeLessThan(10 * 1024);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const performanceBaseline = 100; // milliseconds
      
      const startTime = Date.now();
      
      render(<PerformanceTestComponent renderTime={50} />);
      
      const endTime = Date.now();
      const actualTime = endTime - startTime;
      
      // Should not exceed baseline by more than 50%
      expect(actualTime).toBeLessThan(performanceBaseline * 1.5);
    });
    
    it('should maintain consistent performance across multiple renders', () => {
      const renderTimes: number[] = [];
      
      // Measure multiple render times
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const { unmount } = render(<PerformanceTestComponent />);
        const endTime = Date.now();
        
        renderTimes.push(endTime - startTime);
        unmount();
      }
      
      // Calculate standard deviation
      const mean = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const variance = renderTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / renderTimes.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be low (consistent performance)
      // Relaxed to 50% due to test environment variability
      expect(stdDev).toBeLessThan(mean * 0.5); // Within 50% of mean
    });
  });
});

// Utility function for debouncing
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}
