import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../lib/store/appStore';
import { queryKeys } from '../providers/ReactQueryProvider';
import {
  QuestionAnswerPair,
  QARequest,
  UseQuestionAnswerReturn,
  ApiError
} from '../types';

// Mock API service - replace with actual Q&A service
const generateAnswer = async (request: QARequest): Promise<QuestionAnswerPair> => {
  // Simulated API call - replace with actual AI service
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock different types of answers based on question patterns
  const question = request.question.toLowerCase();
  let answer = '';
  let confidence = 0.8;
  
  if (question.includes('what')) {
    answer = `Based on the image analysis, this appears to be a visual representation that contains various elements. The image shows specific characteristics that can be identified through careful examination.`;
    confidence = 0.85;
  } else if (question.includes('how')) {
    answer = `The process or method visible in this image involves several steps. The technique demonstrated shows a particular approach to achieving the desired result.`;
    confidence = 0.78;
  } else if (question.includes('why')) {
    answer = `The reasoning behind what's shown in this image relates to specific principles or objectives. This approach is used because it achieves particular goals effectively.`;
    confidence = 0.75;
  } else if (question.includes('where')) {
    answer = `The location or setting depicted in this image appears to be in a specific environment. The contextual clues suggest this takes place in a particular type of location.`;
    confidence = 0.82;
  } else if (question.includes('who')) {
    answer = `The individuals or entities visible in this image appear to be engaged in specific activities. Their roles and identities can be inferred from the visual context.`;
    confidence = 0.70;
  } else {
    answer = `Regarding your question about the image: This is an interesting inquiry that relates to the visual elements present. The answer involves understanding the specific context and details shown.`;
    confidence = 0.65;
  }
  
  return {
    id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    imageId: request.imageUrl,
    question: request.question,
    answer: answer,
    createdAt: new Date(),
    confidence
  };
};

const getImageQA = async (imageId: string): Promise<QuestionAnswerPair[]> => {
  // Simulated fetch - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return cached Q&A pairs or empty array
  return [];
};

export const useQuestionAnswer = (imageId?: string): UseQuestionAnswerReturn => {
  const queryClient = useQueryClient();
  const { currentImage, setError, clearError } = useAppStore();
  const activeImageId = imageId || currentImage?.id;
  
  // Query to get existing Q&A pairs for an image
  const { data: questionAnswers = [], isLoading: isLoadingQA } = useQuery({
    queryKey: queryKeys.imageQA(activeImageId || ''),
    queryFn: () => getImageQA(activeImageId!),
    enabled: !!activeImageId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Mutation to ask a question
  const askMutation = useMutation({
    mutationFn: generateAnswer,
    onSuccess: (newQA) => {
      // Update the cache with the new Q&A pair
      queryClient.setQueryData(
        queryKeys.imageQA(activeImageId || ''),
        (old: QuestionAnswerPair[] = []) => [...old, newQA]
      );
      clearError();
    },
    onError: (error: ApiError) => {
      setError(error.message || 'Failed to generate answer');
    }
  });
  
  // Ask question function
  const askQuestion = useCallback(async (request: QARequest): Promise<QuestionAnswerPair> => {
    if (!request.imageUrl || !request.question.trim()) {
      throw new Error('Image URL and question are required');
    }
    
    return askMutation.mutateAsync(request);
  }, [askMutation]);
  
  // Delete Q&A pair function
  const deleteQA = useCallback((qaId: string) => {
    queryClient.setQueryData(
      queryKeys.imageQA(activeImageId || ''),
      (old: QuestionAnswerPair[] = []) => old.filter(qa => qa.id !== qaId)
    );
  }, [queryClient, activeImageId]);
  
  // Clear all Q&A pairs for current image
  const clearQA = useCallback(() => {
    if (activeImageId) {
      queryClient.setQueryData(
        queryKeys.imageQA(activeImageId),
        []
      );
    }
  }, [queryClient, activeImageId]);
  
  // Combined loading state
  const isLoading = isLoadingQA || askMutation.isPending;
  
  // Error state
  const error = askMutation.error?.message || null;
  
  return {
    questionAnswers,
    isLoading,
    error,
    askQuestion,
    deleteQA,
    clearQA
  };
};

// Hook for question suggestions based on image content
export const useQuestionSuggestions = () => {
  const { currentImage } = useAppStore();
  
  const getQuestionSuggestions = useCallback((): string[] => {
    if (!currentImage) return [];
    
    // Generate contextual question suggestions based on image metadata
    const suggestions = [
      "What is the main subject of this image?",
      "What colors are most prominent in this image?",
      "What is the mood or atmosphere of this image?",
      "What techniques were used to create this image?",
      "What story does this image tell?"
    ];
    
    // Add context-specific questions based on alt_description or description
    if (currentImage.alt_description) {
      suggestions.push(`Can you explain more about ${currentImage.alt_description}?`);
    }
    
    if (currentImage.description) {
      suggestions.push(`What makes this ${currentImage.description.toLowerCase()} unique?`);
    }
    
    // Add photographer-related questions
    suggestions.push(`What style is ${currentImage.user.name} known for?`);
    
    return suggestions.slice(0, 6); // Return top 6 suggestions
  }, [currentImage]);
  
  return { getQuestionSuggestions };
};

// Hook for Q&A analytics
export const useQAAnalytics = () => {
  const getQuestionPatterns = useCallback(() => {
    // Mock analytics - replace with actual data
    return [
      { pattern: 'What', count: 45, avgConfidence: 0.85 },
      { pattern: 'How', count: 32, avgConfidence: 0.78 },
      { pattern: 'Why', count: 28, avgConfidence: 0.75 },
      { pattern: 'Where', count: 18, avgConfidence: 0.82 },
      { pattern: 'Who', count: 12, avgConfidence: 0.70 }
    ];
  }, []);
  
  const getAverageResponseTime = useCallback(() => {
    // Mock response time - replace with actual metrics
    return 1.5; // seconds
  }, []);
  
  const getConfidenceDistribution = useCallback(() => {
    // Mock confidence distribution - replace with actual data
    return [
      { range: '0.9-1.0', count: 15 },
      { range: '0.8-0.9', count: 35 },
      { range: '0.7-0.8', count: 28 },
      { range: '0.6-0.7', count: 18 },
      { range: '0.5-0.6', count: 4 }
    ];
  }, []);
  
  return {
    getQuestionPatterns,
    getAverageResponseTime,
    getConfidenceDistribution
  };
};

// Hook for batch Q&A processing
export const useBatchQA = (imageId?: string) => {
  const { askQuestion } = useQuestionAnswer(imageId);
  const { currentImage } = useAppStore();
  
  const askMultipleQuestions = useCallback(async (
    questions: string[]
  ): Promise<QuestionAnswerPair[]> => {
    if (!currentImage) {
      throw new Error('No image selected');
    }
    
    const requests: QARequest[] = questions.map(question => ({
      imageUrl: currentImage.urls.regular,
      question
    }));
    
    // Process questions in parallel but with slight delays to avoid rate limiting
    const results: QuestionAnswerPair[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      if (i > 0) {
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const result = await askQuestion(requests[i]);
      results.push(result);
    }
    
    return results;
  }, [askQuestion, currentImage]);
  
  return { askMultipleQuestions };
};