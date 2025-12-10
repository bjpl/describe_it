/**
 * Optimized Query Hook for React
 *
 * Features:
 * - Automatic caching
 * - Request deduplication
 * - Stale-while-revalidate
 * - Optimistic updates
 * - Background refetching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { queryOptimizer } from '@/lib/performance/query-optimizer';
import { logger } from '@/lib/logger';

export interface QueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: number;
  retryDelay?: number;
}

export interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  lastFetchTime: number;
  retryCount: number;
}

// Global query cache for request deduplication
const queryCache = new Map<string, Promise<unknown>>();

/**
 * Hook for optimized data fetching with caching and performance features
 */
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions<T> = {}
): QueryResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    refetchOnWindowFocus = true,
    onSuccess,
    onError,
    retry = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    error: null,
    isLoading: enabled,
    isFetching: false,
    lastFetchTime: 0,
    retryCount: 0,
  });

  const isMountedRef = useRef(true);
  const refetchTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // Check if data is stale
  const isStale = Date.now() - state.lastFetchTime > staleTime;

  // Fetch data with deduplication and caching
  const fetchData = useCallback(
    async (isBackground = false): Promise<void> => {
      if (!enabled) return;

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        isFetching: true,
        isLoading: !isBackground && prev.data === undefined,
      }));

      try {
        // Check if there's an in-flight request for this query key
        let promise = queryCache.get(queryKey) as Promise<T> | undefined;

        if (!promise) {
          // Create new request and cache it
          promise = queryOptimizer.executeQuery(
            queryKey,
            async () => {
              const result = await queryFn();
              return result;
            },
            {
              useCache: true,
              cacheTTL: cacheTime,
            }
          );

          queryCache.set(queryKey, promise);

          // Remove from cache after completion
          promise.finally(() => {
            queryCache.delete(queryKey);
          });
        }

        const data = await promise;

        if (!isMountedRef.current) return;

        setState(prev => ({
          ...prev,
          data,
          error: null,
          isLoading: false,
          isFetching: false,
          lastFetchTime: Date.now(),
          retryCount: 0,
        }));

        onSuccess?.(data);
      } catch (error) {
        if (!isMountedRef.current) return;

        const err = error instanceof Error ? error : new Error(String(error));

        // Handle retries
        if (state.retryCount < retry && err.name !== 'AbortError') {
          setState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1,
            isFetching: false,
          }));

          // Retry with exponential backoff
          const delay = retryDelay * Math.pow(2, state.retryCount);
          setTimeout(() => fetchData(isBackground), delay);
          return;
        }

        setState(prev => ({
          ...prev,
          error: err,
          isLoading: false,
          isFetching: false,
          retryCount: 0,
        }));

        onError?.(err);
        logger.error('Query failed', err, { queryKey });
      }
    },
    [
      enabled,
      queryKey,
      queryFn,
      cacheTime,
      onSuccess,
      onError,
      retry,
      retryDelay,
      state.retryCount,
    ]
  );

  // Manual refetch
  const refetch = useCallback(async () => {
    queryOptimizer.clearCache(queryKey);
    await fetchData(false);
  }, [queryKey, fetchData]);

  // Invalidate cache and refetch
  const invalidate = useCallback(() => {
    queryOptimizer.clearCache(queryKey);
    setState(prev => ({
      ...prev,
      lastFetchTime: 0,
    }));
  }, [queryKey]);

  // Initial fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (enabled) {
      fetchData(false);
    }
  }, [enabled, queryKey]); // Intentionally limited deps

  // Setup refetch interval
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    refetchTimerRef.current = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => {
      if (refetchTimerRef.current) {
        clearInterval(refetchTimerRef.current);
      }
    };
  }, [refetchInterval, enabled]); // Intentionally limited deps

  // Refetch on window focus
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (isStale) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchOnWindowFocus, enabled, isStale]); // Intentionally limited deps

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (refetchTimerRef.current) {
        clearInterval(refetchTimerRef.current);
      }
    };
  }, []);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    isStale,
    refetch,
    invalidate,
  };
}

/**
 * Hook for optimized mutations with optimistic updates
 */
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onMutate?: (variables: TVariables) => void | Promise<void>;
  } = {}
) {
  const [state, setState] = useState<{
    data: TData | undefined;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: undefined,
    error: null,
    isLoading: false,
  });

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Call onMutate for optimistic updates
        await options.onMutate?.(variables);

        const data = await mutationFn(variables);

        setState({
          data,
          error: null,
          isLoading: false,
        });

        options.onSuccess?.(data, variables);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        setState(prev => ({
          ...prev,
          error: err,
          isLoading: false,
        }));

        options.onError?.(err, variables);
        throw err;
      }
    },
    [mutationFn, options]
  );

  return {
    mutate,
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
  };
}

/**
 * Hook for infinite scrolling queries
 */
export function useInfiniteQuery<T>(
  queryKeyBase: string,
  queryFn: (page: number) => Promise<T[]>,
  options: QueryOptions<T[]> & {
    getNextPageParam?: (lastPage: T[], pages: T[][]) => number | undefined;
  } = {}
) {
  const [pages, setPages] = useState<T[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

  const queryKey = `${queryKeyBase}:page:${currentPage}`;

  const query = useOptimizedQuery(
    queryKey,
    () => queryFn(currentPage),
    {
      ...options,
      onSuccess: (data) => {
        setPages(prev => {
          const updated = [...prev];
          updated[currentPage] = data;
          return updated;
        });

        // Determine if there's a next page
        const nextPage = options.getNextPageParam?.(data, [...pages, data]);
        setHasNextPage(nextPage !== undefined);

        options.onSuccess?.(data);
      },
    }
  );

  const fetchNextPage = useCallback(() => {
    if (hasNextPage && !query.isFetching) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage, query.isFetching]);

  const allData = pages.flat();

  return {
    ...query,
    data: allData,
    pages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage: query.isFetching && currentPage > 0,
  };
}
