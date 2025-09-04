"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// Optimized query options
interface OptimizedQueryOptions {
  cacheTime?: number;
  staleTime?: number;
  retryDelay?: number;
  retries?: number;
  enabled?: boolean;
  keepPreviousData?: boolean;
}

// Generic optimized query hook
export const useOptimizedQuery = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: OptimizedQueryOptions = {}
) => {
  const defaultOptions = {
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    ...options
  };

  return useQuery({
    queryKey,
    queryFn,
    ...defaultOptions
  });
};

// Optimized image search hook
export const useOptimizedImageSearch = () => {
  const searchImages = useCallback(
    async (query: string, page = 1, filters = {}) => {
      const response = await fetch("/api/images/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, page, ...filters })
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      return response.json();
    },
    []
  );

  return { searchImages };
};

// Optimized description generation hook
export const useOptimizedDescriptions = () => {
  const generateDescription = useCallback(
    async (imageUrl: string, style: string, language: string) => {
      const response = await fetch("/api/descriptions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, style, language })
      });

      if (!response.ok) {
        throw new Error("Description generation failed");
      }

      return response.json();
    },
    []
  );

  return { generateDescription };
};

// Optimized mutation hook with error handling and retries
export const useOptimizedMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    retry?: number;
  } = {}
) => {
  return useMutation({
    mutationFn,
    onSuccess: options.onSuccess,
    onError: options.onError,
    retry: options.retry || 1
  });
};

export default useOptimizedQuery;