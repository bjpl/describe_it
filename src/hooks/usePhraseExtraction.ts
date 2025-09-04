import { useState, useCallback, useRef } from "react";
import { ExtractedPhrase, PhraseExtractionRequest } from "@/types";
import { logger, devWarn } from "@/lib/logger";

// Enhanced error types for better error handling
interface PhraseError {
  message: string;
  type: "network" | "validation" | "server" | "timeout" | "unknown";
  statusCode?: number;
  retryable: boolean;
}

// Request configuration
const REQUEST_TIMEOUT = 20000; // 20 seconds for phrase extraction
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1500, 3000];

export function usePhraseExtraction(imageId: string) {
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track abort controllers for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Helper function to create detailed error information
  const createPhraseError = (
    error: unknown,
    response?: Response,
  ): PhraseError => {
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
          message:
            "Request timed out. Phrase extraction is taking too long. Please try again.",
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
      let message = "Failed to extract phrases";
      let type: PhraseError["type"] = "server";
      let retryable = false;

      switch (statusCode) {
        case 400:
          message =
            "Invalid request parameters. Please check the image URL and settings.";
          type = "validation";
          break;
        case 401:
          message = "Authentication failed. Please refresh the page.";
          type = "server";
          retryable = true;
          break;
        case 403:
          message = "Access forbidden. AI service may be unavailable.";
          type = "server";
          break;
        case 429:
          message =
            "Too many requests. Please wait before extracting more phrases.";
          type = "server";
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = "Phrase extraction service is temporarily unavailable.";
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
      message: "An unexpected error occurred during phrase extraction",
      type: "unknown",
      retryable: false,
    };
  };

  // Helper function to make API request with timeout and error handling
  const makePhraseRequest = async (
    request: PhraseExtractionRequest,
  ): Promise<ExtractedPhrase[]> => {
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
      const response = await fetch("/api/phrases/extract", {
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
        const error = createPhraseError(parseError, response);
        error.message =
          "Failed to parse response from phrase extraction service";
        throw error;
      }

      if (!response.ok) {
        const error = createPhraseError(null, response);
        error.message = data?.message || error.message;
        throw error;
      }

      // Validate response structure
      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid response format from phrase extraction service",
        );
      }

      // Validate each phrase object
      const validPhrases = data.filter(
        (phrase) =>
          phrase &&
          typeof phrase === "object" &&
          phrase.id &&
          phrase.phrase &&
          phrase.definition,
      );

      if (validPhrases.length !== data.length) {
        devWarn("Some phrases were filtered out due to invalid format", {
          component: "usePhraseExtraction",
          totalCount: data.length,
          validCount: validPhrases.length,
        });
      }

      return validPhrases;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Helper function to retry failed requests
  const retryPhraseRequest = async (
    request: PhraseExtractionRequest,
  ): Promise<ExtractedPhrase[]> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        retryCountRef.current = attempt;
        return await makePhraseRequest(request);
      } catch (error) {
        lastError = error;

        const phraseError = createPhraseError(error);

        // Don't retry if error is not retryable or we've exceeded max retries
        if (!phraseError.retryable || attempt === MAX_RETRIES) {
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

  const extractPhrases = useCallback(
    async (request: PhraseExtractionRequest): Promise<ExtractedPhrase[]> => {
      setIsLoading(true);
      setError(null);
      retryCountRef.current = 0;

      try {
        // Validate request
        if (!request.imageUrl) {
          throw new Error("Image URL is required for phrase extraction");
        }

        // Set reasonable defaults
        const processedRequest = {
          ...request,
          targetLevel: request.targetLevel || "intermediate",
          maxPhrases: request.maxPhrases || 10,
        };

        // Validate maxPhrases range
        if (
          processedRequest.maxPhrases < 1 ||
          processedRequest.maxPhrases > 20
        ) {
          throw new Error("Number of phrases must be between 1 and 20");
        }

        const newPhrases = await retryPhraseRequest(processedRequest);
        setPhrases((prev) => [...prev, ...newPhrases]);
        return newPhrases;
      } catch (err) {
        logger.error(
          "Phrase extraction failed",
          err instanceof Error ? err : new Error(String(err)),
          {
            component: "usePhraseExtraction",
            imageUrl: request.imageUrl,
            targetLevel: request.targetLevel,
            function: "extractPhrases",
          },
        );

        const phraseError = createPhraseError(err);
        setError(phraseError.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const deletePhrase = useCallback((phraseId: string) => {
    setPhrases((prev) => prev.filter((p) => p.id !== phraseId));
  }, []);

  const clearPhrases = useCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setPhrases([]);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  // Cleanup function to cancel requests on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    phrases,
    isLoading,
    error,
    extractPhrases,
    deletePhrase,
    clearPhrases,
    cleanup, // Expose cleanup for component unmount
    retryCount: retryCountRef.current, // Expose retry count for UI feedback
  };
}
