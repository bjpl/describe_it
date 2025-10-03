import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
import { performanceLogger } from '@/lib/logger';

// Performance optimization hooks

/**
 * Hook for memoizing expensive calculations
 */
export const useExpensiveMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T => {
  const startTime = useRef<number>();

  return useMemo(() => {
    if (process.env.NODE_ENV === 'development' && debugName) {
      startTime.current = performance.now();
    }

    const result = factory();

    if (process.env.NODE_ENV === 'development' && debugName && startTime.current) {
      const duration = performance.now() - startTime.current;
      if (duration > 10) { // Log if calculation takes more than 10ms
        performanceLogger.warn(`[Performance] Expensive memo "${debugName}" took ${duration.toFixed(2)}ms`);
      }
    }

    return result;
  }, deps);
};

/**
 * Hook for memoizing callbacks with performance tracking
 */
export const usePerformanceCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T => {
  return useCallback((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = callback(...args);
    
    if (process.env.NODE_ENV === 'development' && debugName) {
      const duration = performance.now() - startTime;
      if (duration > 10) {
        performanceLogger.warn(`[Performance] Callback "${debugName}" took ${duration.toFixed(2)}ms`);
      }
    }

    return result;
  }, deps) as T;
};

/**
 * Hook for optimizing component re-renders
 */
export const useRenderOptimization = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number>();

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      if (lastRenderTime.current) {
        const timeBetweenRenders = now - lastRenderTime.current;
        if (timeBetweenRenders < 16) { // Less than one frame (60fps)
          performanceLogger.warn(`[Performance] ${componentName} rendering too frequently: ${timeBetweenRenders.toFixed(2)}ms between renders`);
        }
      }
      
      if (renderCount.current > 10) {
        performanceLogger.warn(`[Performance] ${componentName} has rendered ${renderCount.current} times`);
      }
    }

    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    resetRenderCount: () => { renderCount.current = 0; }
  };
};

/**
 * Hook for optimizing API calls with automatic retries and caching
 */
export const useOptimizedApiCall = <T>(
  apiCall: () => Promise<T>,
  cacheKey: string,
  options: {
    retries?: number;
    retryDelay?: number;
    cacheTimeout?: number;
    onError?: (error: Error, retryCount: number) => void;
    onSuccess?: (data: T, fromCache: boolean) => void;
  } = {}
) => {
  const {
    retries = 3,
    retryDelay = 1000,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const executeCall = useCallback(async () => {
    const startTime = performance.now();
    
    // Check cache first
    const cached = cache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      setData(cached.data);
      onSuccess?.(cached.data, true);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await apiCall();
        const duration = performance.now() - startTime;
        
        if (duration > 2000) {
          performanceLogger.warn(`[Performance] API call "${cacheKey}" took ${duration.toFixed(2)}ms`);
        }

        // Cache the result
        cache.current.set(cacheKey, { data: result, timestamp: Date.now() });
        
        setData(result);
        setLoading(false);
        onSuccess?.(result, false);
        return result;
      } catch (err) {
        lastError = err as Error;
        onError?.(lastError, attempt);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    setError(lastError);
    setLoading(false);
    throw lastError;
  }, [apiCall, cacheKey, retries, retryDelay, cacheTimeout, onError, onSuccess]);

  return {
    data,
    loading,
    error,
    execute: executeCall,
    clearCache: () => cache.current.delete(cacheKey)
  };
};

/**
 * Hook for debounced search with performance optimizations
 */
export const useOptimizedSearch = <T>(
  searchFunction: (query: string) => Promise<T[]>,
  delay: number = 300,
  minLength: number = 2
) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedQuery = useDebounce(query, delay);
  const cache = useRef<Map<string, T[]>>(new Map());
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < minLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Check cache
    const cached = cache.current.get(debouncedQuery);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }

    // Cancel previous request
    abortController.current?.abort();
    abortController.current = new AbortController();

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      const startTime = performance.now();

      try {
        const searchResults = await searchFunction(debouncedQuery);
        const duration = performance.now() - startTime;
        
        if (duration > 1000) {
          performanceLogger.warn(`[Performance] Search for "${debouncedQuery}" took ${duration.toFixed(2)}ms`);
        }

        // Cache results
        cache.current.set(debouncedQuery, searchResults);
        
        setResults(searchResults);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
          setLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      abortController.current?.abort();
    };
  }, [debouncedQuery, searchFunction, minLength]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearCache: () => cache.current.clear()
  };
};

/**
 * Hook for lazy loading images with intersection observer
 */
export const useLazyImage = (src: string, threshold: number = 0.1) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  useEffect(() => {
    if (!inView || loaded || error) return;

    const img = new Image();
    const startTime = performance.now();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      if (loadTime > 2000) {
        performanceLogger.warn(`[Performance] Image "${src}" took ${loadTime.toFixed(2)}ms to load`);
      }
      setLoaded(true);
    };
    
    img.onerror = () => {
      setError(true);
    };
    
    img.src = src;
  }, [inView, src, loaded, error]);

  return {
    ref: imgRef,
    loaded: loaded && inView,
    error,
    inView
  };
};

/**
 * Hook for virtual scrolling optimization
 */
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
    offsetY: visibleItems.offsetY
  };
};

/**
 * Hook for performance profiling
 */
export const usePerformanceProfiler = (name: string) => {
  const startTime = useRef<number>();
  const measurements = useRef<number[]>([]);

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      measurements.current.push(duration);
      
      if (process.env.NODE_ENV === 'development') {
        performanceLogger.info(`[Profiler] ${name}: ${duration.toFixed(2)}ms`);
      }
      
      startTime.current = undefined;
      return duration;
    }
    return 0;
  }, [name]);

  const getStats = useCallback(() => {
    const durations = measurements.current;
    if (durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    return {
      count: durations.length,
      average: avg,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }, []);

  const reset = useCallback(() => {
    measurements.current = [];
  }, []);

  return { start, end, getStats, reset };
};