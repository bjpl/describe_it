import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../lib/store/appStore';
import { queryKeys } from '../providers/ReactQueryProvider';
import {
  Description,
  DescriptionRequest,
  DescriptionStyle,
  UseDescriptionsReturn,
  ApiError
} from '../types';

// Mock API service - replace with actual OpenAI/description service
const generateDescription = async (request: DescriptionRequest): Promise<Description> => {
  // Simulated API call - replace with actual OpenAI API
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const stylePrompts = {
    detailed: "Provide a comprehensive, detailed description including colors, textures, composition, lighting, and mood.",
    simple: "Provide a simple, clear description suitable for beginners.",
    creative: "Provide an imaginative, artistic description that evokes emotion and storytelling.",
    technical: "Provide a technical analysis including photographic techniques, composition rules, and visual elements.",
    educational: "Provide an educational description suitable for learning and teaching contexts.",
    artistic: "Provide an artistic interpretation focusing on aesthetic qualities and visual impact."
  };
  
  const mockDescription = `This ${request.style} description analyzes the image with ${stylePrompts[request.style]} The image shows various elements that demonstrate ${request.style} characteristics. ${request.customPrompt ? `Custom analysis: ${request.customPrompt}` : ''}`;
  
  return {
    id: `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    imageId: request.imageUrl,
    style: request.style,
    content: mockDescription,
    createdAt: new Date()
  };
};

const getImageDescriptions = async (imageId: string): Promise<Description[]> => {
  // Simulated fetch - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return cached descriptions or empty array
  return [];
};

export const useDescriptions = (imageId?: string): UseDescriptionsReturn => {
  const queryClient = useQueryClient();
  const { currentImage, setError, clearError } = useAppStore();
  const activeImageId = imageId || currentImage?.id;
  
  // Query to get existing descriptions for an image
  const { data: descriptions = [], isLoading: isLoadingDescriptions } = useQuery({
    queryKey: queryKeys.imageDescriptions(activeImageId || ''),
    queryFn: () => getImageDescriptions(activeImageId!),
    enabled: !!activeImageId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Mutation to generate a new description
  const generateMutation = useMutation({
    mutationFn: generateDescription,
    onSuccess: (newDescription) => {
      // Update the cache with the new description
      queryClient.setQueryData(
        queryKeys.imageDescriptions(activeImageId || ''),
        (old: Description[] = []) => [...old, newDescription]
      );
      clearError();
    },
    onError: (error: ApiError) => {
      setError(error.message || 'Failed to generate description');
    }
  });
  
  // Mutation to regenerate an existing description
  const regenerateMutation = useMutation({
    mutationFn: async ({ descriptionId, request }: { descriptionId: string; request: DescriptionRequest }) => {
      const newDescription = await generateDescription(request);
      return { descriptionId, newDescription };
    },
    onSuccess: ({ descriptionId, newDescription }) => {
      // Update the cache by replacing the old description
      queryClient.setQueryData(
        queryKeys.imageDescriptions(activeImageId || ''),
        (old: Description[] = []) => 
          old.map(desc => desc.id === descriptionId ? newDescription : desc)
      );
      clearError();
    },
    onError: (error: ApiError) => {
      setError(error.message || 'Failed to regenerate description');
    }
  });
  
  // Generate description function
  const generateDescriptionFn = useCallback(async (request: DescriptionRequest): Promise<Description> => {
    if (!request.imageUrl) {
      throw new Error('Image URL is required');
    }
    
    return generateMutation.mutateAsync(request);
  }, [generateMutation]);
  
  // Regenerate description function
  const regenerateDescription = useCallback(async (descriptionId: string): Promise<Description> => {
    const existingDescription = descriptions.find(desc => desc.id === descriptionId);
    if (!existingDescription || !currentImage) {
      throw new Error('Description or image not found');
    }
    
    const request: DescriptionRequest = {
      imageUrl: currentImage.urls.regular,
      style: existingDescription.style
    };
    
    const result = await regenerateMutation.mutateAsync({ descriptionId, request });
    return result.newDescription;
  }, [descriptions, currentImage, regenerateMutation]);
  
  // Delete description function
  const deleteDescription = useCallback((descriptionId: string) => {
    queryClient.setQueryData(
      queryKeys.imageDescriptions(activeImageId || ''),
      (old: Description[] = []) => old.filter(desc => desc.id !== descriptionId)
    );
  }, [queryClient, activeImageId]);
  
  // Clear all descriptions for current image
  const clearDescriptions = useCallback(() => {
    if (activeImageId) {
      queryClient.setQueryData(
        queryKeys.imageDescriptions(activeImageId),
        []
      );
    }
  }, [queryClient, activeImageId]);
  
  // Combined loading state
  const isLoading = isLoadingDescriptions || generateMutation.isPending || regenerateMutation.isPending;
  
  // Combined error state
  const error = generateMutation.error?.message || 
                regenerateMutation.error?.message || 
                null;
  
  return {
    descriptions,
    isLoading,
    error,
    generateDescription: generateDescriptionFn,
    regenerateDescription,
    deleteDescription,
    clearDescriptions
  };
};

// Hook for generating multiple descriptions with different styles
export const useBatchDescriptions = (imageId?: string) => {
  const { generateDescription } = useDescriptions(imageId);
  const { currentImage } = useAppStore();
  
  const generateMultipleDescriptions = useCallback(async (
    styles: DescriptionStyle[],
    customPrompts?: Record<DescriptionStyle, string>
  ): Promise<Description[]> => {
    if (!currentImage) {
      throw new Error('No image selected');
    }
    
    const requests: DescriptionRequest[] = styles.map(style => ({
      imageUrl: currentImage.urls.regular,
      style,
      customPrompt: customPrompts?.[style]
    }));
    
    // Generate all descriptions in parallel
    const descriptions = await Promise.all(
      requests.map(request => generateDescription(request))
    );
    
    return descriptions;
  }, [generateDescription, currentImage]);
  
  return { generateMultipleDescriptions };
};

// Hook for description analytics
export const useDescriptionAnalytics = () => {
  const { searchHistory } = useAppStore();
  
  const getStyleUsage = useCallback(() => {
    // This would typically come from a backend analytics service
    // For now, return mock data
    const styles: DescriptionStyle[] = ['detailed', 'simple', 'creative', 'technical', 'educational', 'artistic'];
    
    return styles.map(style => ({
      style,
      usage: Math.floor(Math.random() * 100),
      avgRating: Math.random() * 5
    }));
  }, []);
  
  const getMostPopularStyles = useCallback((limit: number = 3) => {
    return getStyleUsage()
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);
  }, [getStyleUsage]);
  
  return {
    getStyleUsage,
    getMostPopularStyles
  };
};