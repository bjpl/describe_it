import React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAppStore } from '../lib/store/appStore';
import { ApiError } from '../types';

// Global error handler
const handleError = (error: unknown) => {
  const appStore = useAppStore.getState();
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error && 'message' in error) {
    errorMessage = (error as ApiError).message;
  }
  
  appStore.setError(errorMessage);
  
  // Log error for debugging
  console.error('React Query Error:', error);
};

// Create query client with configuration
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - how long until data is considered stale
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Cache time - how long to keep unused data in cache
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) return false;
          }
          
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        
        // Error handling
        onError: handleError
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        onError: handleError
      }
    },
    
    queryCache: new QueryCache({
      onError: handleError,
      onSuccess: () => {
        // Clear any existing errors when a query succeeds
        const appStore = useAppStore.getState();
        if (appStore.error) {
          appStore.clearError();
        }
      }
    }),
    
    mutationCache: new MutationCache({
      onError: handleError,
      onSuccess: () => {
        // Clear any existing errors when a mutation succeeds
        const appStore = useAppStore.getState();
        if (appStore.error) {
          appStore.clearError();
        }
      }
    })
  });

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export const ReactQueryProvider: React.FC<ReactQueryProviderProps> = ({ children }) => {
  const [queryClient] = React.useState(() => createQueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-right"
        position="bottom"
      />
    </QueryClientProvider>
  );
};

// Query key factories for consistent key management
export const queryKeys = {
  // Images
  images: ['images'] as const,
  imageSearch: (query: string, page: number = 1) => 
    [...queryKeys.images, 'search', query, page] as const,
  imageDetail: (id: string) => [...queryKeys.images, 'detail', id] as const,
  
  // Descriptions
  descriptions: ['descriptions'] as const,
  imageDescriptions: (imageId: string) => 
    [...queryKeys.descriptions, 'image', imageId] as const,
  descriptionGenerate: (imageUrl: string, style: string) => 
    [...queryKeys.descriptions, 'generate', imageUrl, style] as const,
  
  // Question & Answer
  questionAnswer: ['qa'] as const,
  imageQA: (imageId: string) => [...queryKeys.questionAnswer, 'image', imageId] as const,
  qaGenerate: (imageUrl: string, question: string) => 
    [...queryKeys.questionAnswer, 'generate', imageUrl, question] as const,
  
  // Phrase extraction
  phrases: ['phrases'] as const,
  imagePhrases: (imageId: string) => [...queryKeys.phrases, 'image', imageId] as const,
  phraseExtract: (imageUrl: string, level?: string) => 
    [...queryKeys.phrases, 'extract', imageUrl, level || 'all'] as const,
  
  // Session and user data
  session: ['session'] as const,
  userPreferences: ['user', 'preferences'] as const,
  searchHistory: ['search', 'history'] as const
};

// Utility hook to invalidate related queries
export const useInvalidateQueries = () => {
  const queryClient = new QueryClient();
  
  return {
    invalidateImageSearch: () => queryClient.invalidateQueries({ queryKey: queryKeys.images }),
    invalidateDescriptions: (imageId?: string) => {
      if (imageId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.imageDescriptions(imageId) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.descriptions });
      }
    },
    invalidateQA: (imageId?: string) => {
      if (imageId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.imageQA(imageId) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.questionAnswer });
      }
    },
    invalidatePhrases: (imageId?: string) => {
      if (imageId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.imagePhrases(imageId) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.phrases });
      }
    },
    invalidateAll: () => queryClient.invalidateQueries()
  };
};