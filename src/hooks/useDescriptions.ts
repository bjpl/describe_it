import { useState, useCallback, useRef } from 'react';
import { Description, DescriptionRequest } from '@/types';

// Enhanced error types for better error handling
interface DescriptionError {
  message: string;
  type: 'network' | 'validation' | 'server' | 'timeout' | 'unknown';
  statusCode?: number;
  retryable: boolean;
}

// Request configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds for AI operations
const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000]; // Shorter retries for user experience

export function useDescriptions(imageId: string) {
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track abort controllers for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  
  // Helper function to create detailed error information
  const createDescriptionError = (error: unknown, response?: Response): DescriptionError => {
    if (error instanceof Error) {
      // Network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        return {
          message: 'Network connection failed. Please check your internet connection and try again.',
          type: 'network',
          retryable: true
        };
      }
      
      // Timeout errors
      if (error.name === 'AbortError') {
        return {
          message: 'Request timed out. Description generation is taking too long. Please try again.',
          type: 'timeout',
          retryable: true
        };
      }
      
      return {
        message: error.message,
        type: 'unknown',
        retryable: false
      };
    }
    
    // HTTP errors
    if (response && !response.ok) {
      const statusCode = response.status;
      let message = 'Failed to generate description';
      let type: DescriptionError['type'] = 'server';
      let retryable = false;
      
      switch (statusCode) {
        case 400:
          message = 'Invalid request. Please check the image URL and style selection.';
          type = 'validation';
          break;
        case 401:
          message = 'Authentication failed. Please refresh the page and try again.';
          type = 'server';
          retryable = true;
          break;
        case 403:
          message = 'Access forbidden. API service may be unavailable.';
          type = 'server';
          break;
        case 429:
          message = 'Too many requests. Please wait a moment before generating another description.';
          type = 'server';
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'AI service is temporarily unavailable. Please try again in a few moments.';
          type = 'server';
          retryable = true;
          break;
        default:
          message = `Service error (${statusCode}). Please try again later.`;
          type = 'server';
          retryable = statusCode >= 500;
      }
      
      return { message, type, statusCode, retryable };
    }
    
    return {
      message: 'An unexpected error occurred while generating the description',
      type: 'unknown',
      retryable: false
    };
  };
  
  // Helper function to make API request with timeout and error handling
  const makeDescriptionRequest = async (request: DescriptionRequest): Promise<Description> => {
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
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If we can't parse error response, create generic error
        }
        
        const error = createDescriptionError(null, response);
        error.message = errorData?.message || error.message;
        throw error;
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object' || !data.id || !data.content) {
        throw new Error('Invalid response format from description service');
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  // Helper function to retry failed requests
  const retryDescriptionRequest = async (request: DescriptionRequest): Promise<Description> => {
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
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        }
      }
    }
    
    throw lastError;
  };

  const generateDescription = useCallback(async (request: DescriptionRequest): Promise<Description> => {
    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;

    try {
      // Validate request
      if (!request.imageUrl || !request.style) {
        throw new Error('Image URL and style are required');
      }
      
      const newDescription = await retryDescriptionRequest(request);
      setDescriptions(prev => [...prev, newDescription]);
      return newDescription;
    } catch (err) {
      console.error('Description generation failed:', err);
      
      const descriptionError = createDescriptionError(err);
      setError(descriptionError.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerateDescription = useCallback(async (descriptionId: string): Promise<Description> => {
    const existingDescription = descriptions.find(d => d.id === descriptionId);
    if (!existingDescription) {
      const error = new Error('Description not found. Unable to regenerate.');
      setError(error.message);
      throw error;
    }

    try {
      // Remove the old description first
      setDescriptions(prev => prev.filter(d => d.id !== descriptionId));
      
      // Generate new description
      const newDescription = await generateDescription({
        imageUrl: existingDescription.imageId,
        style: existingDescription.style
      });
      
      return newDescription;
    } catch (err) {
      // If regeneration fails, restore the old description
      setDescriptions(prev => {
        const exists = prev.find(d => d.id === descriptionId);
        if (!exists) {
          return [...prev, existingDescription];
        }
        return prev;
      });
      throw err;
    }
  }, [descriptions, generateDescription]);

  const deleteDescription = useCallback((descriptionId: string) => {
    setDescriptions(prev => prev.filter(d => d.id !== descriptionId));
  }, []);

  const clearDescriptions = useCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setDescriptions([]);
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
    descriptions,
    isLoading,
    error,
    generateDescription,
    regenerateDescription,
    deleteDescription,
    clearDescriptions,
    cleanup, // Expose cleanup for component unmount
    retryCount: retryCountRef.current // Expose retry count for UI feedback
  };
}