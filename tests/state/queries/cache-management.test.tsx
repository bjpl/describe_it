import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useOptimizedQuery } from '@/lib/hooks/useOptimizedQueries';
import { ReactNode } from 'react';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 1000 * 60 * 5, // 5 minutes
        staleTime: 1000 * 60 * 2, // 2 minutes
      },
    },
  });
};

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Cache Management - Basic Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cache query results', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ data: 'cached' });

    const { result: result1 } = renderHook(
      () => useOptimizedQuery(['cache-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second hook should use cached data
    const { result: result2 } = renderHook(
      () => useOptimizedQuery(['cache-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Query function should only be called once
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result2.current.data).toEqual(result1.current.data);
  });

  it('should respect cache time (gcTime)', async () => {
    vi.useFakeTimers();

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 1000, // 1 second
        },
      },
    });

    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result, unmount } = renderHook(
      () => useOptimizedQuery(['gc-test'], queryFn, { cacheTime: 1000 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Unmount to remove active observer
    unmount();

    // Advance time past cache time
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // New hook should trigger new fetch
    const { result: result2 } = renderHook(
      () => useOptimizedQuery(['gc-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    vi.useRealTimers();
  });

  it('should respect stale time', async () => {
    vi.useFakeTimers();

    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ data: 'stale test' });

    const { result } = renderHook(
      () => useOptimizedQuery(['stale-test'], queryFn, { staleTime: 5000 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Data should be fresh
    expect(result.current.isFetching).toBe(false);

    // Advance time within stale time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should still be fresh
    expect(result.current.isFetching).toBe(false);

    vi.useRealTimers();
  });
});

describe('Cache Management - Cache Invalidation', () => {
  it('should invalidate queries', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockResolvedValueOnce({ data: 'updated' });

    const { result } = renderHook(
      () => {
        const query = useOptimizedQuery(['invalidate-test'], queryFn);
        const client = useQueryClient();
        return { query, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    expect(result.current.query.data).toEqual({ data: 'initial' });

    // Invalidate the query
    await act(async () => {
      await result.current.client.invalidateQueries({ queryKey: ['invalidate-test'] });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({ data: 'updated' });
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('should invalidate multiple queries by prefix', async () => {
    const queryClient = createTestQueryClient();
    const queryFn1 = vi.fn().mockResolvedValue({ id: 1 });
    const queryFn2 = vi.fn().mockResolvedValue({ id: 2 });

    const { result } = renderHook(
      () => {
        const query1 = useOptimizedQuery(['users', '1'], queryFn1);
        const query2 = useOptimizedQuery(['users', '2'], queryFn2);
        const client = useQueryClient();
        return { query1, query2, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query1.isSuccess).toBe(true);
      expect(result.current.query2.isSuccess).toBe(true);
    });

    // Invalidate all 'users' queries
    await act(async () => {
      await result.current.client.invalidateQueries({ queryKey: ['users'] });
    });

    // Both queries should refetch
    expect(queryFn1).toHaveBeenCalledTimes(2);
    expect(queryFn2).toHaveBeenCalledTimes(2);
  });
});

describe('Cache Management - Manual Cache Updates', () => {
  it('should manually update cache', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ count: 0 });

    const { result } = renderHook(
      () => {
        const query = useOptimizedQuery(['manual-update'], queryFn);
        const client = useQueryClient();
        return { query, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    expect(result.current.query.data).toEqual({ count: 0 });

    // Manually update cache
    act(() => {
      result.current.client.setQueryData(['manual-update'], { count: 5 });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({ count: 5 });
    });

    // Query function should only be called once (initial fetch)
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should merge cache updates', async () => {
    const queryClient = createTestQueryClient();
    const initialData = { name: 'John', age: 30 };
    const queryFn = vi.fn().mockResolvedValue(initialData);

    const { result } = renderHook(
      () => {
        const query = useOptimizedQuery(['merge-test'], queryFn);
        const client = useQueryClient();
        return { query, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    // Update using updater function
    act(() => {
      result.current.client.setQueryData(['merge-test'], (old: any) => ({
        ...old,
        age: 31,
      }));
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({ name: 'John', age: 31 });
    });
  });
});

describe('Cache Management - Prefetching', () => {
  it('should prefetch queries', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ prefetched: true });

    const { result } = renderHook(
      () => useQueryClient(),
      { wrapper: createWrapper(queryClient) }
    );

    // Prefetch data
    await act(async () => {
      await result.current.prefetchQuery({
        queryKey: ['prefetch-test'],
        queryFn,
      });
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Access the prefetched data
    const { result: queryResult } = renderHook(
      () => useOptimizedQuery(['prefetch-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });

    // Should use cached data, not refetch
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryResult.current.data).toEqual({ prefetched: true });
  });

  it('should prefetch with custom stale time', async () => {
    vi.useFakeTimers();

    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ data: 'prefetched' });

    const { result } = renderHook(
      () => useQueryClient(),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.prefetchQuery({
        queryKey: ['prefetch-stale'],
        queryFn,
        staleTime: 5000,
      });
    });

    // Access within stale time
    const { result: queryResult } = renderHook(
      () => useOptimizedQuery(['prefetch-stale'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('Cache Management - Cache Hydration', () => {
  it('should hydrate cache from initial data', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn();

    // Set initial data
    queryClient.setQueryData(['hydrate-test'], { hydrated: true });

    const { result } = renderHook(
      () => useOptimizedQuery(['hydrate-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should use hydrated data without calling queryFn
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ hydrated: true });
  });

  it('should handle cache rehydration after clear', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ data: 'fresh' });

    const { result } = renderHook(
      () => {
        const query = useOptimizedQuery(['clear-test'], queryFn);
        const client = useQueryClient();
        return { query, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    // Clear cache
    act(() => {
      result.current.client.clear();
    });

    // Should refetch after clear
    await waitFor(() => {
      expect(result.current.query.isFetching).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});

describe('Cache Management - Stale-While-Revalidate', () => {
  it('should return stale data while revalidating', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 2 });

    const { result, rerender } = renderHook(
      () => useOptimizedQuery(['swr-test'], queryFn, { staleTime: 0 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ version: 1 });

    // Trigger revalidation
    rerender();

    // Should immediately show stale data
    expect(result.current.data).toEqual({ version: 1 });

    // Then update with fresh data
    await waitFor(() => {
      expect(result.current.data).toEqual({ version: 2 });
    });
  });
});

describe('Cache Management - Cache Persistence', () => {
  it('should persist cache across remounts', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ persisted: true });

    // First mount
    const { result: result1, unmount } = renderHook(
      () => useOptimizedQuery(['persist-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Unmount
    unmount();

    // Remount
    const { result: result2 } = renderHook(
      () => useOptimizedQuery(['persist-test'], queryFn),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Should use cached data
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result2.current.data).toEqual({ persisted: true });
  });
});

describe('Cache Management - Remove Queries', () => {
  it('should remove query from cache', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockResolvedValueOnce({ data: 'refetched' });

    const { result } = renderHook(
      () => {
        const query = useOptimizedQuery(['remove-test'], queryFn);
        const client = useQueryClient();
        return { query, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    expect(result.current.query.data).toEqual({ data: 'initial' });

    // Remove query
    act(() => {
      result.current.client.removeQueries({ queryKey: ['remove-test'] });
    });

    // Query should refetch
    await waitFor(() => {
      expect(result.current.query.data).toEqual({ data: 'refetched' });
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});

describe('Cache Management - Get Cached Data', () => {
  it('should get cached query data', async () => {
    const queryClient = createTestQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ cached: 'data' });

    const { result } = renderHook(
      () => {
        const query = useOptimizedQuery(['get-cached'], queryFn);
        const client = useQueryClient();
        return { query, client };
      },
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    // Get cached data
    const cachedData = result.current.client.getQueryData(['get-cached']);
    expect(cachedData).toEqual({ cached: 'data' });
  });
});
