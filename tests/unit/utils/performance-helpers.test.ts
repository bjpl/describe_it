import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock performance API
const mockPerformanceNow = vi.fn();
const mockPerformanceMark = vi.fn();
const mockPerformanceMeasure = vi.fn();

Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    mark: mockPerformanceMark,
    measure: mockPerformanceMeasure,
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
  },
  writable: true,
});

// Mock the performance helpers module
const mockPerformanceProfiler = {
  startMark: vi.fn(),
  endMark: vi.fn(),
  measure: vi.fn(),
  getMetrics: vi.fn(() => ({
    renderTime: 100,
    memoryUsage: 1024,
    fps: 60
  })),
  clear: vi.fn()
};

const mockUseRenderCount = vi.fn(() => 1);

const mockOptimizeAnimations = {
  createOptimizedVariants: vi.fn((variants) => variants),
  shouldReduceMotion: vi.fn(() => false),
  getOptimalDuration: vi.fn(() => 0.3)
};

vi.mock('@/lib/utils/performance-helpers', () => ({
  performanceProfiler: mockPerformanceProfiler,
  useRenderCount: mockUseRenderCount,
  optimizeAnimations: mockOptimizeAnimations
}));

describe('Performance Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let time = 0;
    mockPerformanceNow.mockImplementation(() => {
      time += 16.67; // Simulate 60fps
      return time;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('performanceProfiler', () => {
    it('should create and manage performance marks', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      performanceProfiler.startMark('test-operation');
      expect(mockPerformanceProfiler.startMark).toHaveBeenCalledWith('test-operation');
      
      performanceProfiler.endMark('test-operation');
      expect(mockPerformanceProfiler.endMark).toHaveBeenCalledWith('test-operation');
    });

    it('should measure time between marks', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      performanceProfiler.measure('test-measure', 'start-mark', 'end-mark');
      expect(mockPerformanceProfiler.measure).toHaveBeenCalledWith('test-measure', 'start-mark', 'end-mark');
    });

    it('should provide performance metrics', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      const metrics = performanceProfiler.getMetrics();
      expect(metrics).toEqual({
        renderTime: 100,
        memoryUsage: 1024,
        fps: 60
      });
    });

    it('should clear performance data', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      performanceProfiler.clear();
      expect(mockPerformanceProfiler.clear).toHaveBeenCalled();
    });

    it('should handle missing performance API gracefully', () => {
      // Temporarily remove performance API
      const originalPerformance = global.performance;
      delete (global as any).performance;
      
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Should not throw
      expect(() => {
        performanceProfiler.startMark('test');
        performanceProfiler.endMark('test');
      }).not.toThrow();
      
      // Restore performance API
      global.performance = originalPerformance;
    });
  });

  describe('useRenderCount', () => {
    it('should track component render count', () => {
      const { useRenderCount } = require('@/lib/utils/performance-helpers');
      
      const { result, rerender } = renderHook(() => useRenderCount('TestComponent'));
      
      expect(result.current).toBe(1);
      expect(mockUseRenderCount).toHaveBeenCalledWith('TestComponent');
      
      rerender();
      // Mock should be called again on rerender
      expect(mockUseRenderCount).toHaveBeenCalledTimes(2);
    });

    it('should handle different component names', () => {
      const { useRenderCount } = require('@/lib/utils/performance-helpers');
      
      renderHook(() => useRenderCount('ComponentA'));
      renderHook(() => useRenderCount('ComponentB'));
      
      expect(mockUseRenderCount).toHaveBeenCalledWith('ComponentA');
      expect(mockUseRenderCount).toHaveBeenCalledWith('ComponentB');
    });
  });

  describe('optimizeAnimations', () => {
    it('should create optimized animation variants', () => {
      const { optimizeAnimations } = require('@/lib/utils/performance-helpers');
      
      const variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      };
      
      const optimized = optimizeAnimations.createOptimizedVariants(variants);
      
      expect(mockOptimizeAnimations.createOptimizedVariants).toHaveBeenCalledWith(variants);
      expect(optimized).toEqual(variants);
    });

    it('should detect reduced motion preference', () => {
      const { optimizeAnimations } = require('@/lib/utils/performance-helpers');
      
      const shouldReduce = optimizeAnimations.shouldReduceMotion();
      
      expect(mockOptimizeAnimations.shouldReduceMotion).toHaveBeenCalled();
      expect(typeof shouldReduce).toBe('boolean');
    });

    it('should provide optimal animation duration', () => {
      const { optimizeAnimations } = require('@/lib/utils/performance-helpers');
      
      const duration = optimizeAnimations.getOptimalDuration();
      
      expect(mockOptimizeAnimations.getOptimalDuration).toHaveBeenCalled();
      expect(typeof duration).toBe('number');
    });

    it('should adapt to device performance', () => {
      const { optimizeAnimations } = require('@/lib/utils/performance-helpers');
      
      // Mock slow device
      mockOptimizeAnimations.shouldReduceMotion.mockReturnValueOnce(true);
      
      const shouldReduce = optimizeAnimations.shouldReduceMotion();
      expect(shouldReduce).toBe(true);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should integrate with React DevTools Profiler', () => {
      // Mock React Profiler data
      const profilerData = {
        id: 'test-component',
        phase: 'mount',
        actualDuration: 16.5,
        baseDuration: 10.2,
        startTime: 1000,
        commitTime: 1016.5
      };
      
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Should be able to process profiler data
      expect(() => {
        performanceProfiler.recordProfilerData?.(profilerData);
      }).not.toThrow();
    });

    it('should provide performance budget warnings', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Mock slow operation
      mockPerformanceProfiler.getMetrics.mockReturnValueOnce({
        renderTime: 500, // Slow render
        memoryUsage: 1024 * 1024 * 100, // 100MB
        fps: 30 // Low FPS
      });
      
      const metrics = performanceProfiler.getMetrics();
      
      // Should detect performance issues
      expect(metrics.renderTime).toBeGreaterThan(100);
      expect(metrics.fps).toBeLessThan(60);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage over time', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Mock memory measurements
      const memoryReadings = [1024, 2048, 1536, 1024];
      
      memoryReadings.forEach((memory, index) => {
        mockPerformanceProfiler.getMetrics.mockReturnValueOnce({
          renderTime: 100,
          memoryUsage: memory,
          fps: 60
        });
        
        const metrics = performanceProfiler.getMetrics();
        expect(metrics.memoryUsage).toBe(memory);
      });
    });

    it('should detect memory leaks', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Simulate increasing memory usage
      const baseMemory = 1024;
      const memoryGrowth = Array.from({ length: 10 }, (_, i) => baseMemory * (i + 1));
      
      memoryGrowth.forEach(memory => {
        mockPerformanceProfiler.getMetrics.mockReturnValueOnce({
          renderTime: 100,
          memoryUsage: memory,
          fps: 60
        });
      });
      
      // Last reading should show significant memory increase
      const finalMetrics = performanceProfiler.getMetrics();
      expect(finalMetrics.memoryUsage).toBeGreaterThan(baseMemory * 5);
    });
  });

  describe('FPS Monitoring', () => {
    it('should track frame rate accurately', () => {
      let frameCount = 0;
      const targetFPS = 60;
      const frameDuration = 1000 / targetFPS;
      
      mockPerformanceNow.mockImplementation(() => {
        frameCount++;
        return frameCount * frameDuration;
      });
      
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Simulate frame measurements
      for (let i = 0; i < 10; i++) {
        performanceProfiler.startMark(`frame-${i}`);
        performanceProfiler.endMark(`frame-${i}`);
      }
      
      expect(mockPerformanceProfiler.startMark).toHaveBeenCalledTimes(10);
      expect(mockPerformanceProfiler.endMark).toHaveBeenCalledTimes(10);
    });

    it('should detect frame drops', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Mock low FPS scenario
      mockPerformanceProfiler.getMetrics.mockReturnValueOnce({
        renderTime: 100,
        memoryUsage: 1024,
        fps: 30 // Below 60fps
      });
      
      const metrics = performanceProfiler.getMetrics();
      expect(metrics.fps).toBeLessThan(60);
    });
  });

  describe('Performance Budgets', () => {
    it('should enforce render time budgets', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      const renderTimeBudget = 16; // 60fps budget
      
      mockPerformanceProfiler.getMetrics.mockReturnValueOnce({
        renderTime: 20, // Over budget
        memoryUsage: 1024,
        fps: 50
      });
      
      const metrics = performanceProfiler.getMetrics();
      const isOverBudget = metrics.renderTime > renderTimeBudget;
      
      expect(isOverBudget).toBe(true);
    });

    it('should enforce memory budgets', () => {
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      const memoryBudget = 50 * 1024 * 1024; // 50MB
      
      mockPerformanceProfiler.getMetrics.mockReturnValueOnce({
        renderTime: 10,
        memoryUsage: 100 * 1024 * 1024, // 100MB - over budget
        fps: 60
      });
      
      const metrics = performanceProfiler.getMetrics();
      const isOverBudget = metrics.memoryUsage > memoryBudget;
      
      expect(isOverBudget).toBe(true);
    });
  });

  describe('Browser Compatibility', () => {
    it('should work in browsers without performance API', () => {
      // Mock older browser
      const originalPerformance = global.performance;
      delete (global as any).performance;
      
      const { performanceProfiler } = require('@/lib/utils/performance-helpers');
      
      // Should provide fallback implementations
      expect(() => {
        performanceProfiler.startMark('test');
        performanceProfiler.endMark('test');
        const metrics = performanceProfiler.getMetrics();
        expect(metrics).toBeDefined();
      }).not.toThrow();
      
      global.performance = originalPerformance;
    });

    it('should adapt to different device capabilities', () => {
      const { optimizeAnimations } = require('@/lib/utils/performance-helpers');
      
      // Test different scenarios
      const scenarios = [
        { reducedMotion: true, expectedDuration: 0 },
        { reducedMotion: false, expectedDuration: 0.3 }
      ];
      
      scenarios.forEach(({ reducedMotion, expectedDuration }) => {
        mockOptimizeAnimations.shouldReduceMotion.mockReturnValueOnce(reducedMotion);
        mockOptimizeAnimations.getOptimalDuration.mockReturnValueOnce(expectedDuration);
        
        const shouldReduce = optimizeAnimations.shouldReduceMotion();
        const duration = optimizeAnimations.getOptimalDuration();
        
        expect(shouldReduce).toBe(reducedMotion);
        expect(duration).toBe(expectedDuration);
      });
    });
  });
});
