import { useState, useCallback, useRef } from "react";
import { UnsplashImage } from "@/types";
import { logger, logUserAction, devLog } from "@/lib/logger";

// Enhanced error types for better error handling
interface SearchError {
  message: string;
  type: "network" | "validation" | "server" | "timeout" | "unknown";
  statusCode?: number;
  retryable: boolean;
}

// Request timeout configuration
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Progressive backoff

export function useImageSearch() {
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState({ isLoading: false, message: "" });
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    query: "",
    page: 1,
    per_page: 20,
  });
  const [totalPages, setTotalPages] = useState(1);

  // Track abort controllers for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Helper function to create detailed error information
  const createSearchError = (
    error: unknown,
    response?: Response,
  ): SearchError => {
    if (error instanceof Error) {
      // Network errors
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        return {
          message:
            "Network connection failed. Please check your internet connection.",
          type: "network",
          retryable: true,
        };
      }

      // Timeout errors
      if (error.name === "AbortError") {
        return {
          message: "Request timed out. Please try again.",
          type: "timeout",
          retryable: true,
        };
      }

      return {
        message: error.message,
        type: "unknown",
        retryable: false,
      };
    }

    // HTTP errors
    if (response && !response.ok) {
      const statusCode = response.status;
      let message = "Search request failed";
      let type: SearchError["type"] = "server";
      let retryable = false;

      switch (statusCode) {
        case 400:
          message =
            "Invalid search parameters. Please check your search query.";
          type = "validation";
          break;
        case 401:
          message = "Authentication failed. Please refresh the page.";
          type = "server";
          retryable = true;
          break;
        case 403:
          message = "Access forbidden. API key may be invalid.";
          type = "server";
          break;
        case 429:
          message =
            "Too many requests. Please wait a moment before searching again.";
          type = "server";
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = "Server error. Please try again in a few moments.";
          type = "server";
          retryable = true;
          break;
        default:
          message = `Request failed with status ${statusCode}`;
          type = "server";
          retryable = statusCode >= 500;
      }

      return { message, type, statusCode, retryable };
    }

    return {
      message: "An unexpected error occurred",
      type: "unknown",
      retryable: false,
    };
  };

  // Helper function to make API request with timeout and error handling
  const makeSearchRequest = async (
    query: string,
    page: number = 1,
  ): Promise<any> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Setup timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, REQUEST_TIMEOUT);

    try {
      const url = new URL("/api/images/search", window.location.origin);
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());

      // Add filter parameters if provided
      if (filters) {
        if (filters.orientation && filters.orientation !== "all") {
          url.searchParams.set("orientation", filters.orientation);
        }
        if (filters.category && filters.category !== "all") {
          url.searchParams.set("category", filters.category);
        }
        if (filters.color && filters.color !== "all") {
          url.searchParams.set("color", filters.color);
        }
      }

      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createSearchError(null, response);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from server");
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Helper function to retry failed requests
  const retryRequest = async (
    query: string,
    page: number = 1,
  ): Promise<any> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        retryCountRef.current = attempt;
        return await makeSearchRequest(query, page);
      } catch (error) {
        lastError = error;

        const searchError = createSearchError(error);

        // Don't retry if error is not retryable or we've exceeded max retries
        if (!searchError.retryable || attempt === MAX_RETRIES) {
          throw error;
        }

        // Wait before retrying with progressive backoff
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAYS[attempt]),
          );
        }
      }
    }

    throw lastError;
  };

  const searchImages = useCallback(
    async (query: string, page: number = 1, filters?: any) => {
      if (!query.trim()) {
        setError("Please enter a search query");
        return;
      }

      setLoading({ isLoading: true, message: "Searching images..." });
      setError(null);
      retryCountRef.current = 0;

      try {
        const data = await retryRequest(query, page);

        // Handle the response based on API structure
        const responseImages = data.images || data.results || [];
        const responseTotalPages = data.totalPages || data.total_pages || 1;

        if (page === 1) {
          setImages(responseImages);
        } else {
          setImages((prev) => [...prev, ...responseImages]);
        }

        setSearchParams({ query, page, per_page: 20 });
        setTotalPages(responseTotalPages);
        setLoading({ isLoading: false, message: "" });
      } catch (error) {
        logger.error(
          "Image search failed",
          error instanceof Error ? error : new Error(String(error)),
          {
            component: "useImageSearch",
            query,
            page,
            function: "searchImages",
          },
        );

        const searchError = createSearchError(error);

        setLoading({ isLoading: false, message: "" });
        setError(searchError.message);
      }
    },
    [],
  );

  const loadMoreImages = useCallback(async () => {
    if (
      searchParams.page >= totalPages ||
      loading.isLoading ||
      !searchParams.query
    )
      return;

    const nextPage = searchParams.page + 1;
    await searchImages(searchParams.query, nextPage);
  }, [
    searchParams.query,
    searchParams.page,
    totalPages,
    loading.isLoading,
    searchImages,
  ]);

  const setPage = useCallback(
    (page: number) => {
      if (searchParams.query) {
        searchImages(searchParams.query, page);
      }
    },
    [searchParams.query, searchImages],
  );

  const clearResults = useCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setImages([]);
    setSearchParams({ query: "", page: 1, per_page: 20 });
    setTotalPages(1);
    setLoading({ isLoading: false, message: "" });
    setError(null);
    retryCountRef.current = 0;
  }, []);

  const selectImage = useCallback((image: UnsplashImage) => {
    // This would typically update a global state or trigger a callback
    logUserAction("Image selected", {
      imageId: image.id,
      component: "useImageSearch",
    });
    devLog("Selected image details", image);
  }, []);

  // Cleanup function to cancel requests on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    images,
    loading,
    error,
    searchParams,
    totalPages,
    searchImages,
    loadMoreImages,
    setPage,
    clearResults,
    selectImage,
    cleanup,
    retryCount: retryCountRef.current,
  };
}
