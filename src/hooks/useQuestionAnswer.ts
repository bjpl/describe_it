import { useState, useCallback, useRef } from "react";
import { QuestionAnswerPair, QARequest } from "@/types";

// Enhanced error types for better error handling
interface QAError {
  message: string;
  type: "network" | "validation" | "server" | "timeout" | "unknown";
  statusCode?: number;
  retryable: boolean;
}

// Request configuration
const REQUEST_TIMEOUT = 25000; // 25 seconds for AI operations
const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000];

export function useQuestionAnswer(imageId: string) {
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswerPair[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track abort controllers for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Helper function to create detailed error information
  const createQAError = (error: unknown, response?: Response): QAError => {
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
            "Request timed out. AI processing is taking too long. Please try a simpler question.",
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
      let message = "Failed to generate answer";
      let type: QAError["type"] = "server";
      let retryable = false;

      switch (statusCode) {
        case 400:
          message =
            "Invalid question or image. Please check your input and try again.";
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
            "Too many questions asked. Please wait a moment before asking another question.";
          type = "server";
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = "AI service is temporarily unavailable. Please try again.";
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
      message: "An unexpected error occurred while processing your question",
      type: "unknown",
      retryable: false,
    };
  };

  // Helper function to make API request with timeout and error handling
  const makeQARequest = async (
    request: QARequest,
  ): Promise<QuestionAnswerPair> => {
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
      const response = await fetch("/api/qa/generate", {
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
        const error = createQAError(parseError, response);
        error.message = "Failed to parse response from Q&A service";
        throw error;
      }

      if (!response.ok) {
        const error = createQAError(null, response);
        error.message = data?.message || error.message;
        throw error;
      }

      // Validate response structure
      if (!data || typeof data !== "object" || !data.id || !data.answer) {
        throw new Error("Invalid response format from Q&A service");
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Helper function to retry failed requests
  const retryQARequest = useCallback(async (
    request: QARequest,
  ): Promise<QuestionAnswerPair> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        retryCountRef.current = attempt;
        return await makeQARequest(request);
      } catch (error) {
        lastError = error;

        const qaError = createQAError(error);

        // Don't retry if error is not retryable or we've exceeded max retries
        if (!qaError.retryable || attempt === MAX_RETRIES) {
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
  }, []);

  const askQuestion = useCallback(
    async (request: QARequest): Promise<QuestionAnswerPair> => {
      setIsLoading(true);
      setError(null);
      retryCountRef.current = 0;

      try {
        // Validate request
        if (!request.imageUrl || !request.question?.trim()) {
          throw new Error("Both image URL and question are required");
        }

        if (request.question.length > 500) {
          throw new Error(
            "Question is too long. Please keep it under 500 characters.",
          );
        }

        const newQA = await retryQARequest(request);
        setQuestionAnswers((prev) => [...prev, newQA]);
        return newQA;
      } catch (err) {
        // Q&A generation error logged to structured logging service

        const qaError = createQAError(err);
        setError(qaError.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [retryQARequest],
  );

  const deleteQA = useCallback((qaId: string) => {
    setQuestionAnswers((prev) => prev.filter((qa) => qa.id !== qaId));
  }, []);

  const clearQA = useCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setQuestionAnswers([]);
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
    questionAnswers,
    isLoading,
    error,
    askQuestion,
    deleteQA,
    clearQA,
    cleanup, // Expose cleanup for component unmount
    retryCount: retryCountRef.current, // Expose retry count for UI feedback
  };
}
