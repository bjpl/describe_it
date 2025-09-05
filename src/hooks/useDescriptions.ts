import { useState, useCallback, useRef, useMemo } from "react";
import { Description, DescriptionRequest } from "@/types";
import { logger } from "@/lib/logger";
import { useStableCallback, useCleanupManager } from "@/lib/utils/storeUtils";

// Enhanced error types for better error handling
interface DescriptionError {
  message: string;
  type: "network" | "validation" | "server" | "timeout" | "unknown";
  statusCode?: number;
  retryable: boolean;
}

// Request configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds for AI operations
const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000]; // Shorter retries for user experience

// The Description interface already includes language property with 'en' | 'es'

export function useDescriptions(imageId: string) {
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use cleanup manager for better resource management
  const cleanupManager = useCleanupManager();
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Helper function to create detailed error information
  const createDescriptionError = (
    error: unknown,
    response?: Response,
  ): DescriptionError => {
    if (error instanceof Error) {
      // Network errors
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        return {
          message:
            "Network connection failed. Please check your internet connection and try again.",
          type: "network",
          retryable: true,
        };
      }

      // Timeout errors
      if (error.name === "AbortError") {
        return {
          message:
            "Request timed out. Description generation is taking too long. Please try again.",
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
      let message = "Failed to generate description";
      let type: DescriptionError["type"] = "server";
      let retryable = false;

      switch (statusCode) {
        case 400:
          message =
            "Invalid request. Please check the image URL and style selection.";
          type = "validation";
          break;
        case 401:
          message =
            "Authentication failed. Please refresh the page and try again.";
          type = "server";
          retryable = true;
          break;
        case 403:
          message = "Access forbidden. API service may be unavailable.";
          type = "server";
          break;
        case 429:
          message =
            "Too many requests. Please wait a moment before generating another description.";
          type = "server";
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message =
            "AI service is temporarily unavailable. Please try again in a few moments.";
          type = "server";
          retryable = true;
          break;
        default:
          message = `Service error (${statusCode}). Please try again later.`;
          type = "server";
          retryable = statusCode >= 500;
      }

      return { message, type, statusCode, retryable };
    }

    return {
      message: "An unexpected error occurred while generating the description",
      type: "unknown",
      retryable: false,
    };
  };

  // Helper function to make API request with timeout and error handling
  const makeDescriptionRequest = async (
    request: DescriptionRequest,
  ): Promise<Description[]> => {
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
      const response = await fetch("/api/descriptions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body once to avoid "body locked" error
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const error = createDescriptionError(parseError, response);
        error.message = "Failed to parse response from description service";
        throw error;
      }

      if (!response.ok) {
        const error = createDescriptionError(null, response);
        error.message = data?.message || error.message;
        throw error;
      }

      // Validate response structure - now expects an array of descriptions
      if (!data || typeof data !== "object" || !data.success || !Array.isArray(data.data)) {
        throw new Error("Invalid response format from description service");
      }

      // Transform API response to match frontend expectations
      const transformedDescriptions: Description[] = data.data.map((desc: any) => ({
        id: desc.id,
        imageId: desc.imageId || request.imageUrl,
        style: desc.style || request.style,
        content: desc.content,
        language: desc.language, // Keep the original language format
        createdAt: new Date(desc.createdAt || Date.now()),
      }));

      return transformedDescriptions;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Helper function to retry failed requests
  const retryDescriptionRequest = async (
    request: DescriptionRequest,
  ): Promise<Description[]> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        retryCountRef.current = attempt;
        return await makeDescriptionRequest(request);
      } catch (error) {
        lastError = error;

        const descriptionError = createDescriptionError(error);

        // Don't retry if error is not retryable or we've exceeded max retries
        if (!descriptionError.retryable || attempt === MAX_RETRIES) {
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

  // Memoize helper functions to prevent recreation on every render
  const stableRetryDescriptionRequest = useMemo(() => retryDescriptionRequest, []);

  const generateDescription = useStableCallback(
    async (request: DescriptionRequest): Promise<Description> => {
      setIsLoading(true);
      setError(null);
      retryCountRef.current = 0;

      try {
        // Validate request
        if (!request.imageUrl || !request.style) {
          throw new Error("Image URL and style are required");
        }

        const newDescriptions = await stableRetryDescriptionRequest(request);
        
        // Clear existing descriptions for this image/style and add new ones
        setDescriptions((prev) => {
          const filtered = prev.filter(d => d.style !== request.style);
          return [...filtered, ...newDescriptions];
        });

        // Return the first description for compatibility
        return newDescriptions[0] as Description;
      } catch (err) {
        logger.error(
          "Description generation failed",
          err instanceof Error ? err : new Error(String(err)),
          {
            component: "useDescriptions",
            imageUrl: request.imageUrl,
            style: request.style,
            function: "generateDescription",
          },
        );

        const descriptionError = createDescriptionError(err);
        setError(descriptionError.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [stableRetryDescriptionRequest]
  );

  const regenerateDescription = useStableCallback(
    async (descriptionId: string): Promise<Description> => {
      const existingDescription = descriptions.find(
        (d) => d.id === descriptionId,
      );
      if (!existingDescription) {
        const error = new Error("Description not found. Unable to regenerate.");
        setError(error.message);
        throw error;
      }

      try {
        // Remove the old descriptions for this style first
        setDescriptions((prev) => prev.filter((d) => d.style !== existingDescription.style));

        // Generate new descriptions
        const newDescriptions = await generateDescription({
          imageUrl: existingDescription.imageId,
          style: existingDescription.style,
        });

        // Return all new descriptions
        return newDescriptions;
      } catch (err) {
        // If regeneration fails, restore the old description
        setDescriptions((prev) => {
          const exists = prev.find((d) => d.id === descriptionId);
          if (!exists) {
            return [...prev, existingDescription];
          }
          return prev;
        });
        throw err;
      }
    },
    [descriptions, generateDescription],
  );

  const deleteDescription = useStableCallback((descriptionId: string) => {
    setDescriptions((prev) => prev.filter((d) => d.id !== descriptionId));
  }, []);

  const clearDescriptions = useStableCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setDescriptions([]);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  // Cleanup function using cleanup manager
  const cleanup = useStableCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanupManager.cleanup();
  }, [cleanupManager]);

  return {
    descriptions,
    isLoading,
    error,
    generateDescription,
    regenerateDescription,
    deleteDescription,
    clearDescriptions,
    cleanup, // Expose cleanup for component unmount
    retryCount: retryCountRef.current, // Expose retry count for UI feedback
  };
}