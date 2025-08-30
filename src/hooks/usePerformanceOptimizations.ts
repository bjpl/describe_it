import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { throttle, debounce } from 'lodash-es';

// Hook for optimized API calls with caching and deduplication
export const useOptimizedAPI = <T>(
  apiFunction: (...args: any[]) => Promise<T>,
  cacheTime: number = 5 * 60 * 1000, // 5 minutes
  staleTime: number = 30 * 1000 // 30 seconds
) => {
  const cacheRef = useRef(new Map<string, { data: T; timestamp: number; promise?: Promise<T> }>());
  
  const callAPI = useCallback(async (...args: any[]): Promise<T> => {
    const cacheKey = JSON.stringify(args);
    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);
    
    // Return cached data if still fresh
    if (cached && (now - cached.timestamp) < staleTime) {
      return cached.data;
    }
    
    // Return existing promise if already fetching
    if (cached?.promise) {
      return cached.promise;
    }
    
    // Make new request
    const promise = apiFunction(...args);
    cacheRef.current.set(cacheKey, { 
      data: cached?.data as T, 
      timestamp: cached?.timestamp || 0, 
      promise 
    });
    
    try {
      const data = await promise;
      cacheRef.current.set(cacheKey, { data, timestamp: now });
      return data;
    } catch (error) {
      cacheRef.current.delete(cacheKey);
      throw error;
    }
  }, [apiFunction, staleTime]);
  
  // Cleanup old cache entries
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [key, value] of cacheRef.current.entries()) {
        if (now - value.timestamp > cacheTime) {
          cacheRef.current.delete(key);
        }
      }
    };
    
    const interval = setInterval(cleanup, cacheTime / 2);
    return () => clearInterval(interval);
  }, [cacheTime]);
  
  return callAPI;
};

// Hook for optimized search with debouncing and caching
export const useOptimizedSearch = (
  searchFunction: (query: string) => Promise<any>,
  debounceMs: number = 300,
  minQueryLength: number = 2
) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const optimizedAPI = useOptimizedAPI(searchFunction);
  
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await optimizedAPI(searchQuery);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs),
    [optimizedAPI, debounceMs, minQueryLength]
  );
  
  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);
  
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);
  
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    debouncedSearch.cancel();
  }, [debouncedSearch]);
  
  return {
    query,
    results,
    isLoading,
    error,
    search,
    clearSearch
  };
};

// Hook for optimized scroll handling
export const useOptimizedScroll = (
  callback: (scrollY: number) => void,
  throttleMs: number = 16 // 60fps
) => {
  const throttledCallback = useMemo(
    () => throttle(callback, throttleMs),
    [callback, throttleMs]
  );
  
  useEffect(() => {
    const handleScroll = () => {
      throttledCallback(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      throttledCallback.cancel();
    };
  }, [throttledCallback]);
};

// Hook for intersection observer optimization
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
  const observerRef = useRef<IntersectionObserver>();
  
  const observe = useCallback((element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        setEntries(entries);
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      });
    }
    
    observerRef.current.observe(element);
  }, [options]);
  
  const unobserve = useCallback((element: Element) => {
    observerRef.current?.unobserve(element);
  }, []);
  
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);
  
  return { entries, observe, unobserve };
};

// Hook for virtual scrolling
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index
      }))
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);
  
  const totalHeight = items.length * itemHeight;
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    handleScroll,
    offsetY: visibleItems.startIndex * itemHeight
  };
};

// Hook for image lazy loading optimization
export const useLazyImage = (src: string, threshold: number = 0.1) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !imageSrc) {
          setIsLoading(true);
          
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
          };
          img.onerror = () => {
            setError(true);
            setIsLoading(false);
          };
          img.src = src;
          
          observer.unobserve(imgElement);
        }
      },
      { threshold }
    );
    
    observer.observe(imgElement);
    
    return () => {
      observer.disconnect();
    };
  }, [src, imageSrc, threshold]);
  
  return { imgRef, imageSrc, isLoading, error };
};

// Hook for component memoization helpers
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

export const useMemoizedValue = <T>(
  getValue: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(getValue, deps);
};

// Hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>();
  
  useEffect(() => {
    renderStartTime.current = performance.now();
  });
  
  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
      
      // Report to performance monitoring service
      if (renderTime > 50) { // Warn if render takes more than 50ms
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }
  });
  
  const measureOperation = useCallback((operationName: string, operation: () => void | Promise<void>) => {
    const startTime = performance.now();
    
    const result = operation();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - startTime;
        console.debug(`${componentName}.${operationName}: ${duration.toFixed(2)}ms`);
      });
    } else {
      const duration = performance.now() - startTime;
      console.debug(`${componentName}.${operationName}: ${duration.toFixed(2)}ms`);
      return result;
    }
  }, [componentName]);
  
  return { measureOperation };
};