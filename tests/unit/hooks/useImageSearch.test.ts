import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useImageSearch } from '../../../src/hooks/useImageSearch';
import * as appStore from '../../../src/lib/store/appStore';
import * as sessionStore from '../../../src/lib/store/sessionStore';

// Mock the stores
vi.mock('../../../src/lib/store/appStore');
vi.mock('../../../src/lib/store/sessionStore');

// Mock the API service
const mockSearchImages = vi.fn();
vi.mock('../../../src/hooks/useImageSearch', async () => {
  const actual = await vi.importActual('../../../src/hooks/useImageSearch');
  return {
    ...actual,
    searchImages: mockSearchImages,
  };
});

describe('useImageSearch', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  const mockAppStore = {
    currentImage: null,
    setCurrentImage: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    searchHistory: [],
  };

  const mockSessionStore = {
    trackSearch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mocks
    vi.mocked(appStore.useAppStore).mockReturnValue(mockAppStore);
    vi.mocked(sessionStore.useSessionActions).mockReturnValue(mockSessionStore);

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

    // Mock successful API response
    mockSearchImages.mockResolvedValue({
      total: 100,
      total_pages: 5,
      results: [
        {
          id: 'test-image-1',
          urls: {
            small: 'https://test.com/small.jpg',
            regular: 'https://test.com/regular.jpg',
            full: 'https://test.com/full.jpg',
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
      ],
    });
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useImageSearch(''), { wrapper });

      expect(result.current.searchState.query).toBe('');
      expect(result.current.searchState.results).toEqual([]);
      expect(result.current.searchState.isLoading).toBe(false);
      expect(result.current.searchState.error).toBeNull();
      expect(result.current.searchState.page).toBe(0);
      expect(result.current.searchState.totalPages).toBe(0);
      expect(result.current.searchState.hasNextPage).toBe(false);
    });

    it('should trigger search when initialQuery is provided', async () => {
      renderHook(() => useImageSearch('nature'), { wrapper });

      await waitFor(() => {
        expect(mockSearchImages).toHaveBeenCalledWith('nature', 1);
      });
    });
  });

  describe('search functionality', () => {
    it('should perform search successfully', async () => {
      const { result } = renderHook(() => useImageSearch(''), { wrapper });

      await act(async () => {
        await result.current.search('mountains');
      });

      expect(mockSearchImages).toHaveBeenCalledWith('mountains', 1);
      expect(mockSessionStore.trackSearch).toHaveBeenCalledWith('mountains', 100);
      expect(mockAppStore.clearError).toHaveBeenCalled();
    });

    it('should handle empty search query', async () => {
      const { result } = renderHook(() => useImageSearch(''), { wrapper });

      await act(async () => {
        await result.current.search('   ');
      });

      expect(mockSearchImages).not.toHaveBeenCalled();
      expect(mockAppStore.clearError).toHaveBeenCalled();
    });

    it('should handle search errors', async () => {
      mockSearchImages.mockRejectedValue(new Error('Search failed'));
      
      const { result } = renderHook(() => useImageSearch(''), { wrapper });

      await act(async () => {
        await result.current.search('error-query');
      });

      expect(mockAppStore.setError).toHaveBeenCalledWith('Search failed');
    });

    it('should handle API errors gracefully', async () => {
      mockSearchImages.mockRejectedValue({ message: 'API Error', status: 500 });
      
      const { result } = renderHook(() => useImageSearch(''), { wrapper });

      await act(async () => {
        await result.current.search('api-error');
      });

      expect(mockAppStore.setError).toHaveBeenCalledWith('Failed to search images');
    });
  });

  describe('pagination', () => {
    it('should load more images successfully', async () => {
      const { result } = renderHook(() => useImageSearch('nature'), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.searchState.results).toHaveLength(1);
      });

      // Mock next page response
      mockSearchImages.mockResolvedValueOnce({
        total: 100,
        total_pages: 5,
        results: [
          {
            id: 'test-image-2',
            urls: {
              small: 'https://test.com/small2.jpg',
              regular: 'https://test.com/regular2.jpg',
              full: 'https://test.com/full2.jpg',
            },
            alt_description: 'Test image 2',
            description: 'A second test image',
            user: { name: 'Test User 2', username: 'testuser2' },
            width: 800,
            height: 600,
            color: '#000000',
            likes: 20,
            created_at: '2023-01-02T00:00:00Z',
          },
        ],
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockSearchImages).toHaveBeenCalledTimes(2);
    });

    it('should handle load more errors', async () => {
      const { result } = renderHook(() => useImageSearch('nature'), { wrapper });

      await waitFor(() => {
        expect(result.current.searchState.results).toHaveLength(1);
      });

      mockSearchImages.mockRejectedValueOnce(new Error('Load more failed'));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockAppStore.setError).toHaveBeenCalledWith('Load more failed');
    });
  });

  describe('image selection', () => {
    it('should select an image', () => {
      const { result } = renderHook(() => useImageSearch(''), { wrapper });

      const testImage = {
        id: 'test-image',
        urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
        alt_description: 'Test',
        description: 'Test image',
        user: { name: 'Test', username: 'test' },
        width: 800,
        height: 600,
        color: '#ffffff',
        likes: 10,
        created_at: '2023-01-01T00:00:00Z',
      };

      act(() => {
        result.current.selectImage(testImage);
      });

      expect(mockAppStore.setCurrentImage).toHaveBeenCalledWith(testImage);
    });
  });

  describe('clear search', () => {
    it('should clear search results', () => {
      const { result } = renderHook(() => useImageSearch('nature'), { wrapper });

      act(() => {
        result.current.clearSearch();
      });

      expect(mockAppStore.clearError).toHaveBeenCalled();
    });
  });
});

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.mocked(appStore.useAppStore).mockReturnValue({
      ...mockAppStore,
      searchHistory: [
        { query: 'nature landscape', timestamp: new Date('2023-01-01') },
        { query: 'mountain nature', timestamp: new Date('2023-01-02') },
        { query: 'city architecture', timestamp: new Date('2023-01-03') },
        { query: 'nature wildlife', timestamp: new Date('2023-01-04') },
      ],
    });
  });

  it('should return matching suggestions', () => {
    const { useSearchSuggestions } = require('../../../src/hooks/useImageSearch');
    const { result } = renderHook(() => useSearchSuggestions());

    const suggestions = result.current.getSuggestions('nature', 3);

    expect(suggestions).toHaveLength(3);
    expect(suggestions).toContain('nature wildlife');
    expect(suggestions).toContain('mountain nature');
    expect(suggestions).toContain('nature landscape');
  });

  it('should return empty array for no matches', () => {
    const { useSearchSuggestions } = require('../../../src/hooks/useImageSearch');
    const { result } = renderHook(() => useSearchSuggestions());

    const suggestions = result.current.getSuggestions('xyz', 5);

    expect(suggestions).toEqual([]);
  });

  it('should exclude exact matches', () => {
    const { useSearchSuggestions } = require('../../../src/hooks/useImageSearch');
    const { result } = renderHook(() => useSearchSuggestions());

    const suggestions = result.current.getSuggestions('nature landscape', 5);

    expect(suggestions).not.toContain('nature landscape');
  });
});

describe('usePopularSearches', () => {
  beforeEach(() => {
    vi.mocked(appStore.useAppStore).mockReturnValue({
      ...mockAppStore,
      searchHistory: [
        { query: 'nature', timestamp: new Date() },
        { query: 'nature', timestamp: new Date() },
        { query: 'city', timestamp: new Date() },
        { query: 'nature', timestamp: new Date() },
        { query: 'mountains', timestamp: new Date() },
        { query: 'city', timestamp: new Date() },
      ],
    });
  });

  it('should return popular searches sorted by count', () => {
    const { usePopularSearches } = require('../../../src/hooks/useImageSearch');
    const { result } = renderHook(() => usePopularSearches());

    const popular = result.current.getPopularSearches(3);

    expect(popular).toHaveLength(3);
    expect(popular[0]).toEqual({ query: 'nature', count: 3 });
    expect(popular[1]).toEqual({ query: 'city', count: 2 });
    expect(popular[2]).toEqual({ query: 'mountains', count: 1 });
  });
});