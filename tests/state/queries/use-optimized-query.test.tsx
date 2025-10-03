import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimizedQuery, useOptimizedMutation } from '@/lib/hooks/useOptimizedQueries';
import { ReactNode } from 'react';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOptimizedQuery - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test Data' };
    const queryFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useOptimizedQuery(['test-key'], queryFn),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should handle query errors', async () => {
    const errorMessage = 'Failed to fetch data';
    const queryFn = vi.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(
      () => useOptimizedQuery(['error-key'], queryFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(errorMessage);
  });

  it('should support custom cache time', async () => {
    const mockData = { value: 'cached data' };
    const queryFn = vi.fn().mockResolvedValue(mockData);
    const cacheTime = 5 * 60 * 1000; // 5 minutes

    const { result } = renderHook(
      () => useOptimizedQuery(['cache-key'], queryFn, { cacheTime }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should support custom stale time', async () => {
    const mockData = { value: 'stale data' };
    const queryFn = vi.fn().mockResolvedValue(mockData);
    const staleTime = 10 * 60 * 1000; // 10 minutes

    const { result } = renderHook(
      () => useOptimizedQuery(['stale-key'], queryFn, { staleTime }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle enabled option', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(
      () => useOptimizedQuery(['disabled-key'], queryFn, { enabled: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(queryFn).not.toHaveBeenCalled();
  });
});

describe('useOptimizedQuery - Query Key Management', () => {
  it('should use unique query keys', async () => {
    const queryFn1 = vi.fn().mockResolvedValue({ id: 1 });
    const queryFn2 = vi.fn().mockResolvedValue({ id: 2 });

    const wrapper = createWrapper();

    const { result: result1 } = renderHook(
      () => useOptimizedQuery(['key-1'], queryFn1),
      { wrapper }
    );

    const { result: result2 } = renderHook(
      () => useOptimizedQuery(['key-2'], queryFn2),
      { wrapper }
    );

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(result1.current.data).toEqual({ id: 1 });
    expect(result2.current.data).toEqual({ id: 2 });
  });

  it('should support parameterized query keys', async () => {
    const userId = '123';
    const queryFn = vi.fn().mockResolvedValue({ userId, name: 'John' });

    const { result } = renderHook(
      () => useOptimizedQuery(['user', userId], queryFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ userId, name: 'John' });
  });

  it('should cache queries with same key', async () => {
    const queryFn = vi.fn().mockResolvedValue({ cached: true });
    const wrapper = createWrapper();

    // First hook
    const { result: result1 } = renderHook(
      () => useOptimizedQuery(['shared-key'], queryFn),
      { wrapper }
    );

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second hook with same key
    const { result: result2 } = renderHook(
      () => useOptimizedQuery(['shared-key'], queryFn),
      { wrapper }
    );

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Should only call queryFn once due to caching
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result1.current.data).toEqual(result2.current.data);
  });
});

describe('useOptimizedQuery - Retry Logic', () => {
  it('should retry failed requests', async () => {
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue({ success: true });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          retryDelay: 10,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useOptimizedQuery(['retry-key'], queryFn, { retries: 2 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryFn).toHaveBeenCalledTimes(3);
    expect(result.current.data).toEqual({ success: true });
  });

  it('should respect custom retry delay', async () => {
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValue({ data: 'success' });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          retryDelay: 50,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const startTime = Date.now();

    const { result } = renderHook(
      () => useOptimizedQuery(['delay-key'], queryFn, { retryDelay: 50 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });
});

describe('useOptimizedQuery - Loading States', () => {
  it('should track loading state', async () => {
    const queryFn = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 100))
    );

    const { result } = renderHook(
      () => useOptimizedQuery(['loading-key'], queryFn),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ data: 'test' });
  });

  it('should track fetching state separately from loading', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result, rerender } = renderHook(
      () => useOptimizedQuery(['fetch-key'], queryFn),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useOptimizedMutation - Basic Usage', () => {
  it('should execute mutation successfully', async () => {
    const mockData = { id: 1, name: 'Created' };
    const mutationFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useOptimizedMutation(mutationFn),
      { wrapper: createWrapper() }
    );

    expect(result.current.isIdle).toBe(true);

    result.current.mutate({ name: 'Test' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(mutationFn).toHaveBeenCalledWith({ name: 'Test' });
  });

  it('should handle mutation errors', async () => {
    const errorMessage = 'Mutation failed';
    const mutationFn = vi.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(
      () => useOptimizedMutation(mutationFn),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ data: 'test' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(errorMessage);
  });

  it('should call onSuccess callback', async () => {
    const mockData = { success: true };
    const mutationFn = vi.fn().mockResolvedValue(mockData);
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () => useOptimizedMutation(mutationFn, { onSuccess }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ input: 'test' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData, { input: 'test' });
  });

  it('should call onError callback', async () => {
    const error = new Error('Mutation error');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(
      () => useOptimizedMutation(mutationFn, { onError }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ input: 'test' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(error, { input: 'test' });
  });

  it('should retry mutations on failure', async () => {
    const mutationFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useOptimizedMutation(mutationFn, { retry: 1 }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ data: 'test' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mutationFn).toHaveBeenCalledTimes(2);
  });
});

describe('useOptimizedMutation - Multiple Mutations', () => {
  it('should handle multiple sequential mutations', async () => {
    const mutationFn = vi.fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 3 });

    const { result } = renderHook(
      () => useOptimizedMutation(mutationFn),
      { wrapper: createWrapper() }
    );

    // First mutation
    result.current.mutate({ name: 'First' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1 });

    // Second mutation
    result.current.mutate({ name: 'Second' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 2 });

    // Third mutation
    result.current.mutate({ name: 'Third' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 3 });

    expect(mutationFn).toHaveBeenCalledTimes(3);
  });
});
