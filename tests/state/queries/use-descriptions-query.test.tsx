import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDescriptions } from '@/hooks/useDescriptions';
import { ReactNode } from 'react';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDescriptions - Generate Description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should generate description successfully', async () => {
    const mockResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'A beautiful landscape',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(1);
    });

    expect(result.current.descriptions[0].content).toBe('A beautiful landscape');
    expect(result.current.error).toBeNull();
  });

  it('should handle generation errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.generateDescription({
          imageUrl: 'test-image',
          style: 'detailed',
        });
      } catch (error) {
        // Expected error
      }
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
  });

  it('should validate request before generating', async () => {
    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.generateDescription({
          imageUrl: '',
          style: 'detailed',
        });
      } catch (error) {
        expect((error as Error).message).toContain('required');
      }
    });
  });

  it('should update loading state during generation', async () => {
    const mockResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Test description',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    let resolvePromise: any;
    (global.fetch as any).mockReturnValueOnce(
      new Promise(resolve => {
        resolvePromise = () => resolve({
          ok: true,
          json: async () => mockResponse,
        });
      })
    );

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    act(() => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useDescriptions - Retry Logic', () => {
  it('should retry failed requests', async () => {
    const mockResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Success after retry',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(1);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should track retry count', async () => {
    const mockResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Success',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.retryCount).toBeGreaterThan(0);
    });
  });
});

describe('useDescriptions - Regenerate Description', () => {
  it('should regenerate existing description', async () => {
    const initialResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Initial description',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    const newResponse = {
      success: true,
      data: [{
        id: 'desc-2',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Regenerated description',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newResponse,
      });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    // Generate initial description
    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(1);
    });

    const descriptionId = result.current.descriptions[0].id;

    // Regenerate
    await act(async () => {
      await result.current.regenerateDescription(descriptionId);
    });

    await waitFor(() => {
      expect(result.current.descriptions[0].content).toBe('Regenerated description');
    });
  });

  it('should handle regeneration errors', async () => {
    const initialResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Initial description',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    const descriptionId = result.current.descriptions[0].id;

    await act(async () => {
      try {
        await result.current.regenerateDescription(descriptionId);
      } catch (error) {
        // Expected error
      }
    });

    // Original description should be restored
    await waitFor(() => {
      expect(result.current.descriptions[0].content).toBe('Initial description');
    });
  });
});

describe('useDescriptions - Delete Description', () => {
  it('should delete description', async () => {
    const mockResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Test description',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(1);
    });

    const descriptionId = result.current.descriptions[0].id;

    act(() => {
      result.current.deleteDescription(descriptionId);
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(0);
    });
  });
});

describe('useDescriptions - Clear Descriptions', () => {
  it('should clear all descriptions', async () => {
    const mockResponse = {
      success: true,
      data: [{
        id: 'desc-1',
        imageId: 'test-image',
        style: 'detailed',
        content: 'Test description',
        language: 'en',
        createdAt: new Date().toISOString(),
      }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      });
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(1);
    });

    act(() => {
      result.current.clearDescriptions();
    });

    await waitFor(() => {
      expect(result.current.descriptions.length).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('useDescriptions - Error Handling', () => {
  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.generateDescription({
          imageUrl: 'test-image',
          style: 'detailed',
        });
      } catch (error) {
        // Expected error
      }
    });

    await waitFor(() => {
      expect(result.current.error).toContain('connection');
    });
  });

  it('should handle timeout errors', async () => {
    vi.useFakeTimers();

    (global.fetch as any).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.generateDescription({
        imageUrl: 'test-image',
        style: 'detailed',
      }).catch(() => {});
    });

    act(() => {
      vi.advanceTimersByTime(31000); // Advance past timeout
    });

    await waitFor(() => {
      expect(result.current.error).toContain('timeout');
    });

    vi.useRealTimers();
  });

  it('should handle validation errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid request' }),
    });

    const { result } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.generateDescription({
          imageUrl: 'test-image',
          style: 'detailed',
        });
      } catch (error) {
        // Expected error
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});

describe('useDescriptions - Cleanup', () => {
  it('should cleanup resources on unmount', async () => {
    const { result, unmount } = renderHook(
      () => useDescriptions('test-image'),
      { wrapper: createWrapper() }
    );

    act(() => {
      unmount();
    });

    // Should not throw errors
    expect(() => result.current.cleanup()).not.toThrow();
  });
});
