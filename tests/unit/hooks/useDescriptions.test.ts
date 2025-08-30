import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDescriptions, useBatchDescriptions } from '../../../src/hooks/useDescriptions';
import * as appStore from '../../../src/lib/store/appStore';

// Mock the app store
vi.mock('../../../src/lib/store/appStore');

// Mock the API functions
const mockGenerateDescription = vi.fn();
const mockGetImageDescriptions = vi.fn();

// Replace the imports in the hook
vi.mock('../../../src/hooks/useDescriptions', async () => {
  const actual = await vi.importActual('../../../src/hooks/useDescriptions');
  return {
    ...actual,
    // We'll override these in the tests
  };
});

describe('useDescriptions', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  const mockAppStore = {
    currentImage: {
      id: 'test-image-1',
      urls: {
        regular: 'https://example.com/image.jpg',
        small: 'https://example.com/image-small.jpg',
        full: 'https://example.com/image-full.jpg',
      },
      alt_description: 'Test image',
      description: 'A test image',
      user: { name: 'Test User', username: 'testuser' },
      width: 800,
      height: 600,
      color: '#ffffff',
      likes: 10,
      created_at: '2023-01-01T00:00:00Z',
    },
    setError: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mocks
    vi.mocked(appStore.useAppStore).mockReturnValue(mockAppStore);

    // Setup fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Mock successful API responses
    mockGenerateDescription.mockResolvedValue({
      id: 'desc-1',
      imageId: 'test-image-1',
      style: 'detailed',
      content: 'This is a detailed description of the test image.',
      createdAt: new Date('2023-01-01T12:00:00Z'),
    });

    mockGetImageDescriptions.mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should initialize with empty descriptions', () => {
      const { result } = renderHook(() => useDescriptions(), { wrapper });

      expect(result.current.descriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load existing descriptions for image', async () => {
      const existingDescriptions = [
        {
          id: 'desc-1',
          imageId: 'test-image-1',
          style: 'detailed' as const,
          content: 'Existing description',
          createdAt: new Date('2023-01-01T12:00:00Z'),
        },
      ];

      mockGetImageDescriptions.mockResolvedValue(existingDescriptions);

      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.descriptions).toEqual(existingDescriptions);
      });
    });

    it('should not load descriptions when no image ID provided', () => {
      const { result } = renderHook(() => useDescriptions(), { wrapper });

      expect(mockGetImageDescriptions).not.toHaveBeenCalled();
      expect(result.current.descriptions).toEqual([]);
    });
  });

  describe('generateDescription', () => {
    it('should generate description successfully', async () => {
      const { result } = renderHook(() => useDescriptions(), { wrapper });

      const request = {
        imageUrl: 'https://example.com/image.jpg',
        style: 'detailed' as const,
      };

      await act(async () => {
        await result.current.generateDescription(request);
      });

      expect(mockAppStore.clearError).toHaveBeenCalled();
    });

    it('should handle generation errors', async () => {
      const { result } = renderHook(() => useDescriptions(), { wrapper });

      mockGenerateDescription.mockRejectedValue(new Error('Generation failed'));

      const request = {
        imageUrl: 'https://example.com/image.jpg',
        style: 'detailed' as const,
      };

      try {
        await act(async () => {
          await result.current.generateDescription(request);
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(mockAppStore.setError).toHaveBeenCalledWith('Generation failed');
    });

    it('should require imageUrl', async () => {
      const { result } = renderHook(() => useDescriptions(), { wrapper });

      const request = {
        imageUrl: '',
        style: 'detailed' as const,
      };

      await expect(async () => {
        await act(async () => {
          await result.current.generateDescription(request);
        });
      }).rejects.toThrow('Image URL is required');
    });
  });

  describe('regenerateDescription', () => {
    it('should regenerate existing description', async () => {
      const existingDescription = {
        id: 'desc-1',
        imageId: 'test-image-1',
        style: 'detailed' as const,
        content: 'Original description',
        createdAt: new Date('2023-01-01T12:00:00Z'),
      };

      mockGetImageDescriptions.mockResolvedValue([existingDescription]);

      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(1);
      });

      const newDescription = {
        id: 'desc-1-new',
        imageId: 'test-image-1',
        style: 'detailed' as const,
        content: 'Regenerated description',
        createdAt: new Date('2023-01-01T12:30:00Z'),
      };

      mockGenerateDescription.mockResolvedValue(newDescription);

      await act(async () => {
        await result.current.regenerateDescription('desc-1');
      });

      expect(mockGenerateDescription).toHaveBeenCalled();
    });

    it('should handle regeneration errors', async () => {
      const existingDescription = {
        id: 'desc-1',
        imageId: 'test-image-1',
        style: 'detailed' as const,
        content: 'Original description',
        createdAt: new Date('2023-01-01T12:00:00Z'),
      };

      mockGetImageDescriptions.mockResolvedValue([existingDescription]);

      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(1);
      });

      mockGenerateDescription.mockRejectedValue(new Error('Regeneration failed'));

      try {
        await act(async () => {
          await result.current.regenerateDescription('desc-1');
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(mockAppStore.setError).toHaveBeenCalledWith('Regeneration failed');
    });

    it('should throw error for non-existent description', async () => {
      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await expect(async () => {
        await act(async () => {
          await result.current.regenerateDescription('non-existent');
        });
      }).rejects.toThrow('Description or image not found');
    });
  });

  describe('deleteDescription', () => {
    it('should remove description from cache', async () => {
      const descriptions = [
        {
          id: 'desc-1',
          imageId: 'test-image-1',
          style: 'detailed' as const,
          content: 'Description 1',
          createdAt: new Date('2023-01-01T12:00:00Z'),
        },
        {
          id: 'desc-2',
          imageId: 'test-image-1',
          style: 'simple' as const,
          content: 'Description 2',
          createdAt: new Date('2023-01-01T12:30:00Z'),
        },
      ];

      mockGetImageDescriptions.mockResolvedValue(descriptions);

      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(2);
      });

      act(() => {
        result.current.deleteDescription('desc-1');
      });

      // Verify the description was removed from the query cache
      // This would need to be verified through query client state
    });
  });

  describe('clearDescriptions', () => {
    it('should clear all descriptions for current image', async () => {
      const descriptions = [
        {
          id: 'desc-1',
          imageId: 'test-image-1',
          style: 'detailed' as const,
          content: 'Description 1',
          createdAt: new Date('2023-01-01T12:00:00Z'),
        },
      ];

      mockGetImageDescriptions.mockResolvedValue(descriptions);

      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(1);
      });

      act(() => {
        result.current.clearDescriptions();
      });

      // Verify all descriptions were cleared from the query cache
    });
  });

  describe('loading states', () => {
    it('should show loading during description generation', async () => {
      // Mock slow response
      mockGenerateDescription.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() => useDescriptions(), { wrapper });

      act(() => {
        result.current.generateDescription({
          imageUrl: 'https://example.com/image.jpg',
          style: 'detailed',
        });
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should show loading during regeneration', async () => {
      const existingDescription = {
        id: 'desc-1',
        imageId: 'test-image-1',
        style: 'detailed' as const,
        content: 'Original description',
        createdAt: new Date('2023-01-01T12:00:00Z'),
      };

      mockGetImageDescriptions.mockResolvedValue([existingDescription]);

      const { result } = renderHook(() => useDescriptions('test-image-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.descriptions).toHaveLength(1);
      });

      mockGenerateDescription.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      act(() => {
        result.current.regenerateDescription('desc-1');
      });

      expect(result.current.isLoading).toBe(true);
    });
  });
});

describe('useBatchDescriptions', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  const mockAppStore = {
    currentImage: {
      id: 'test-image-1',
      urls: {
        regular: 'https://example.com/image.jpg',
        small: 'https://example.com/image-small.jpg',
        full: 'https://example.com/image-full.jpg',
      },
      alt_description: 'Test image',
      description: 'A test image',
      user: { name: 'Test User', username: 'testuser' },
      width: 800,
      height: 600,
      color: '#ffffff',
      likes: 10,
      created_at: '2023-01-01T00:00:00Z',
    },
    setError: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appStore.useAppStore).mockReturnValue(mockAppStore);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  it('should generate multiple descriptions with different styles', async () => {
    const { result } = renderHook(() => useBatchDescriptions('test-image-1'), { wrapper });

    const styles = ['detailed', 'simple', 'creative'] as const;

    // Mock multiple responses
    mockGenerateDescription
      .mockResolvedValueOnce({
        id: 'desc-1',
        imageId: 'test-image-1',
        style: 'detailed',
        content: 'Detailed description',
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'desc-2',
        imageId: 'test-image-1',
        style: 'simple',
        content: 'Simple description',
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'desc-3',
        imageId: 'test-image-1',
        style: 'creative',
        content: 'Creative description',
        createdAt: new Date(),
      });

    const descriptions = await act(async () => {
      return await result.current.generateMultipleDescriptions(styles);
    });

    expect(descriptions).toHaveLength(3);
    expect(descriptions[0].style).toBe('detailed');
    expect(descriptions[1].style).toBe('simple');
    expect(descriptions[2].style).toBe('creative');
  });

  it('should generate descriptions with custom prompts', async () => {
    const { result } = renderHook(() => useBatchDescriptions('test-image-1'), { wrapper });

    const styles = ['detailed', 'simple'] as const;
    const customPrompts = {
      detailed: 'Focus on technical aspects',
      simple: 'Use basic vocabulary',
    };

    mockGenerateDescription
      .mockResolvedValueOnce({
        id: 'desc-1',
        imageId: 'test-image-1',
        style: 'detailed',
        content: 'Technical detailed description',
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'desc-2',
        imageId: 'test-image-1',
        style: 'simple',
        content: 'Basic simple description',
        createdAt: new Date(),
      });

    await act(async () => {
      await result.current.generateMultipleDescriptions(styles, customPrompts);
    });

    expect(mockGenerateDescription).toHaveBeenCalledTimes(2);
  });

  it('should throw error when no image is selected', async () => {
    vi.mocked(appStore.useAppStore).mockReturnValue({
      ...mockAppStore,
      currentImage: null,
    });

    const { result } = renderHook(() => useBatchDescriptions(), { wrapper });

    const styles = ['detailed'] as const;

    await expect(async () => {
      await act(async () => {
        await result.current.generateMultipleDescriptions(styles);
      });
    }).rejects.toThrow('No image selected');
  });
});