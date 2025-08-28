import { useCallback, useMemo } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../lib/store/appStore';
import { useSessionActions } from '../lib/store/sessionStore';
import { queryKeys } from '../providers/ReactQueryProvider';
import { 
  Image, 
  SearchResult, 
  UseImageSearchReturn, 
  SearchState, 
  ApiError 
} from '../types';

// Mock API service - replace with actual implementation
const searchImages = async (query: string, page: number = 1): Promise<SearchResult> => {
  // Simulated API call - replace with actual Unsplash API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const mockImages: Image[] = Array.from({ length: 20 }, (_, i) => ({
    id: `${query}-${page}-${i}`,
    urls: {
      small: `https://picsum.photos/400/300?random=${Date.now()}-${i}`,
      regular: `https://picsum.photos/800/600?random=${Date.now()}-${i}`,
      full: `https://picsum.photos/1200/800?random=${Date.now()}-${i}`
    },
    alt_description: `${query} image ${i + 1}`,
    description: `A beautiful ${query} photograph`,
    user: {
      name: `User ${i + 1}`,
      username: `user${i + 1}`
    },
    width: 800,
    height: 600,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    likes: Math.floor(Math.random() * 1000),
    created_at: new Date().toISOString()
  }));
  
  return {
    total: 500,
    total_pages: 25,
    results: mockImages
  };
};

export const useImageSearch = (initialQuery: string = ''): UseImageSearchReturn => {
  const queryClient = useQueryClient();
  const { trackSearch } = useSessionActions();
  const { 
    currentImage, 
    setCurrentImage, 
    setError, 
    clearError 
  } = useAppStore();
  
  // Infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: queryKeys.imageSearch(initialQuery),
    queryFn: ({ pageParam = 1 }) => searchImages(initialQuery, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.total_pages ? nextPage : undefined;
    },
    enabled: !!initialQuery.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
  
  // Flatten all pages into a single array of images
  const allImages = useMemo(() => {
    return data?.pages.flatMap(page => page.results) ?? [];
  }, [data]);
  
  // Create search state
  const searchState: SearchState = useMemo(() => ({
    query: initialQuery,
    results: allImages,
    isLoading: isLoading || isFetchingNextPage,
    error: error ? (error as ApiError).message : null,
    page: data?.pages.length ?? 0,
    totalPages: data?.pages[0]?.total_pages ?? 0,
    hasNextPage: !!hasNextPage
  }), [initialQuery, allImages, isLoading, isFetchingNextPage, error, data, hasNextPage]);
  
  // Search function
  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      clearError();
      return;
    }
    
    try {
      clearError();
      
      // Invalidate previous search results
      await queryClient.invalidateQueries({
        queryKey: queryKeys.imageSearch(query)
      });
      
      // Track the search in session
      const result = await searchImages(query, 1);
      trackSearch(query, result.total);
      
      // Refetch with new query
      await refetch();
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to search images';
      setError(errorMessage);
    }
  }, [queryClient, trackSearch, refetch, setError, clearError]);
  
  // Load more function
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      try {
        await fetchNextPage();
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to load more images';
        setError(errorMessage);
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, setError]);
  
  // Clear search function
  const clearSearch = useCallback(() => {
    queryClient.removeQueries({
      queryKey: queryKeys.images
    });
    clearError();
  }, [queryClient, clearError]);
  
  // Select image function
  const selectImage = useCallback((image: Image) => {
    setCurrentImage(image);
  }, [setCurrentImage]);
  
  return {
    searchState,
    search,
    loadMore,
    clearSearch,
    selectImage
  };
};

// Hook for getting search suggestions based on history
export const useSearchSuggestions = () => {
  const { searchHistory } = useAppStore();
  
  const getSuggestions = useCallback((query: string, limit: number = 5) => {
    if (!query.trim()) return [];
    
    const suggestions = searchHistory
      .filter(item => 
        item.query.toLowerCase().includes(query.toLowerCase()) &&
        item.query.toLowerCase() !== query.toLowerCase()
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map(item => item.query);
    
    return [...new Set(suggestions)]; // Remove duplicates
  }, [searchHistory]);
  
  return { getSuggestions };
};

// Hook for popular searches (can be enhanced with actual analytics)
export const usePopularSearches = () => {
  const { searchHistory } = useAppStore();
  
  const getPopularSearches = useCallback((limit: number = 10) => {
    const queryCount = searchHistory.reduce((acc, item) => {
      const query = item.query.toLowerCase();
      acc[query] = (acc[query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(queryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  }, [searchHistory]);
  
  return { getPopularSearches };
};