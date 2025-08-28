import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../lib/store/appStore';
import { queryKeys } from '../providers/ReactQueryProvider';
import {
  ExtractedPhrase,
  PhraseExtractionRequest,
  UsePhraseExtractionReturn,
  ApiError
} from '../types';

// Mock vocabulary database
const vocabularyDatabase = {
  beginner: [
    { word: 'beautiful', pos: 'adjective', definition: 'having beauty; pleasing to the senses' },
    { word: 'colorful', pos: 'adjective', definition: 'having many or varied colors' },
    { word: 'bright', pos: 'adjective', definition: 'giving out or reflecting much light' },
    { word: 'nature', pos: 'noun', definition: 'the physical world collectively' },
    { word: 'peaceful', pos: 'adjective', definition: 'free from disturbance; tranquil' }
  ],
  intermediate: [
    { word: 'serene', pos: 'adjective', definition: 'calm, peaceful, and untroubled' },
    { word: 'vibrant', pos: 'adjective', definition: 'full of energy and life' },
    { word: 'composition', pos: 'noun', definition: 'the nature of something\'s ingredients or constituents' },
    { word: 'atmosphere', pos: 'noun', definition: 'the pervading tone or mood of a place' },
    { word: 'harmony', pos: 'noun', definition: 'the combination of simultaneously sounded musical notes' }
  ],
  advanced: [
    { word: 'juxtaposition', pos: 'noun', definition: 'the fact of two things being seen or placed close together' },
    { word: 'ephemeral', pos: 'adjective', definition: 'lasting for a very short time' },
    { word: 'chiaroscuro', pos: 'noun', definition: 'the treatment of light and shade in drawing and painting' },
    { word: 'melancholic', pos: 'adjective', definition: 'feeling or expressing thoughtful sadness' },
    { word: 'transcendent', pos: 'adjective', definition: 'beyond or above the range of normal physical experience' }
  ]
};

// Mock API service - replace with actual phrase extraction service
const extractPhrases = async (request: PhraseExtractionRequest): Promise<ExtractedPhrase[]> => {
  // Simulated API call - replace with actual AI service
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const maxPhrases = request.maxPhrases || 8;
  const targetLevel = (request.targetLevel || 'intermediate') as keyof typeof vocabularyDatabase;
  const phrases = vocabularyDatabase[targetLevel] || vocabularyDatabase.intermediate;
  
  // Simulate extracting relevant phrases based on image analysis
  const selectedPhrases = phrases
    .sort(() => Math.random() - 0.5) // Randomize
    .slice(0, Math.min(maxPhrases, phrases.length));
  
  return selectedPhrases.map((phrase, index) => ({
    id: `phrase-${Date.now()}-${index}`,
    imageId: request.imageUrl,
    phrase: phrase.word,
    definition: phrase.definition,
    partOfSpeech: phrase.pos,
    difficulty: targetLevel,
    context: `This word is relevant to describing the visual elements and mood present in the image.`,
    createdAt: new Date()
  }));
};

const getImagePhrases = async (imageId: string): Promise<ExtractedPhrase[]> => {
  // Simulated fetch - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return cached phrases or empty array
  return [];
};

export const usePhraseExtraction = (imageId?: string): UsePhraseExtractionReturn => {
  const queryClient = useQueryClient();
  const { currentImage, setError, clearError } = useAppStore();
  const activeImageId = imageId || currentImage?.id;
  
  // Query to get existing phrases for an image
  const { data: phrases = [], isLoading: isLoadingPhrases } = useQuery({
    queryKey: queryKeys.imagePhrases(activeImageId || ''),
    queryFn: () => getImagePhrases(activeImageId!),
    enabled: !!activeImageId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
  
  // Mutation to extract phrases
  const extractMutation = useMutation({
    mutationFn: extractPhrases,
    onSuccess: (newPhrases) => {
      // Update the cache with the new phrases
      queryClient.setQueryData(
        queryKeys.imagePhrases(activeImageId || ''),
        (old: ExtractedPhrase[] = []) => {
          // Merge new phrases, avoiding duplicates
          const existingPhrases = new Set(old.map(p => p.phrase.toLowerCase()));
          const uniqueNewPhrases = newPhrases.filter(
            phrase => !existingPhrases.has(phrase.phrase.toLowerCase())
          );
          return [...old, ...uniqueNewPhrases];
        }
      );
      clearError();
    },
    onError: (error: ApiError) => {
      setError(error.message || 'Failed to extract phrases');
    }
  });
  
  // Extract phrases function
  const extractPhrasesFn = useCallback(async (request: PhraseExtractionRequest): Promise<ExtractedPhrase[]> => {
    if (!request.imageUrl) {
      throw new Error('Image URL is required');
    }
    
    return extractMutation.mutateAsync(request);
  }, [extractMutation]);
  
  // Delete phrase function
  const deletePhrase = useCallback((phraseId: string) => {
    queryClient.setQueryData(
      queryKeys.imagePhrases(activeImageId || ''),
      (old: ExtractedPhrase[] = []) => old.filter(phrase => phrase.id !== phraseId)
    );
  }, [queryClient, activeImageId]);
  
  // Clear all phrases for current image
  const clearPhrases = useCallback(() => {
    if (activeImageId) {
      queryClient.setQueryData(
        queryKeys.imagePhrases(activeImageId),
        []
      );
    }
  }, [queryClient, activeImageId]);
  
  // Combined loading state
  const isLoading = isLoadingPhrases || extractMutation.isPending;
  
  // Error state
  const error = extractMutation.error?.message || null;
  
  return {
    phrases,
    isLoading,
    error,
    extractPhrases: extractPhrasesFn,
    deletePhrase,
    clearPhrases
  };
};

// Hook for phrase filtering and organization
export const usePhraseFilters = (phrases: ExtractedPhrase[]) => {
  const filterByDifficulty = useCallback((difficulty: ExtractedPhrase['difficulty']) => {
    return phrases.filter(phrase => phrase.difficulty === difficulty);
  }, [phrases]);
  
  const filterByPartOfSpeech = useCallback((pos: string) => {
    return phrases.filter(phrase => phrase.partOfSpeech.toLowerCase() === pos.toLowerCase());
  }, [phrases]);
  
  const searchPhrases = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return phrases.filter(phrase => 
      phrase.phrase.toLowerCase().includes(lowerQuery) ||
      phrase.definition.toLowerCase().includes(lowerQuery)
    );
  }, [phrases]);
  
  const groupByDifficulty = useMemo(() => {
    return phrases.reduce((groups, phrase) => {
      const key = phrase.difficulty;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(phrase);
      return groups;
    }, {} as Record<ExtractedPhrase['difficulty'], ExtractedPhrase[]>);
  }, [phrases]);
  
  const groupByPartOfSpeech = useMemo(() => {
    return phrases.reduce((groups, phrase) => {
      const key = phrase.partOfSpeech;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(phrase);
      return groups;
    }, {} as Record<string, ExtractedPhrase[]>);
  }, [phrases]);
  
  return {
    filterByDifficulty,
    filterByPartOfSpeech,
    searchPhrases,
    groupByDifficulty,
    groupByPartOfSpeech
  };
};

// Hook for vocabulary learning features
export const useVocabularyLearning = () => {
  const createFlashcards = useCallback((phrases: ExtractedPhrase[]) => {
    return phrases.map(phrase => ({
      id: phrase.id,
      front: phrase.phrase,
      back: `${phrase.definition}\n\nPart of Speech: ${phrase.partOfSpeech}\nContext: ${phrase.context}`,
      difficulty: phrase.difficulty
    }));
  }, []);
  
  const generateQuiz = useCallback((phrases: ExtractedPhrase[], count: number = 5) => {
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, phrases.length));
    
    return selected.map(phrase => {
      // Generate multiple choice options
      const correctAnswer = phrase.definition;
      const otherPhrases = phrases.filter(p => p.id !== phrase.id);
      const wrongAnswers = otherPhrases
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(p => p.definition);
      
      const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      
      return {
        id: phrase.id,
        question: `What does "${phrase.phrase}" mean?`,
        options,
        correctAnswer,
        difficulty: phrase.difficulty
      };
    });
  }, []);
  
  const getStudyRecommendations = useCallback((phrases: ExtractedPhrase[]) => {
    const difficultyGroups = phrases.reduce((groups, phrase) => {
      if (!groups[phrase.difficulty]) {
        groups[phrase.difficulty] = [];
      }
      groups[phrase.difficulty].push(phrase);
      return groups;
    }, {} as Record<ExtractedPhrase['difficulty'], ExtractedPhrase[]>);
    
    const recommendations = [];
    
    if (difficultyGroups.beginner?.length > 0) {
      recommendations.push({
        title: 'Start with Basics',
        description: `Master ${difficultyGroups.beginner.length} beginner words first`,
        phrases: difficultyGroups.beginner,
        priority: 'high'
      });
    }
    
    if (difficultyGroups.intermediate?.length > 0) {
      recommendations.push({
        title: 'Build Your Vocabulary',
        description: `Practice ${difficultyGroups.intermediate.length} intermediate words`,
        phrases: difficultyGroups.intermediate,
        priority: 'medium'
      });
    }
    
    if (difficultyGroups.advanced?.length > 0) {
      recommendations.push({
        title: 'Advanced Challenge',
        description: `Challenge yourself with ${difficultyGroups.advanced.length} advanced words`,
        phrases: difficultyGroups.advanced,
        priority: 'low'
      });
    }
    
    return recommendations;
  }, []);
  
  return {
    createFlashcards,
    generateQuiz,
    getStudyRecommendations
  };
};

// Hook for phrase analytics
export const usePhraseAnalytics = () => {
  const getDifficultyDistribution = useCallback((phrases: ExtractedPhrase[]) => {
    const distribution = phrases.reduce((acc, phrase) => {
      acc[phrase.difficulty] = (acc[phrase.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<ExtractedPhrase['difficulty'], number>);
    
    return Object.entries(distribution).map(([difficulty, count]) => ({
      difficulty: difficulty as ExtractedPhrase['difficulty'],
      count,
      percentage: (count / phrases.length) * 100
    }));
  }, []);
  
  const getPartOfSpeechDistribution = useCallback((phrases: ExtractedPhrase[]) => {
    const distribution = phrases.reduce((acc, phrase) => {
      acc[phrase.partOfSpeech] = (acc[phrase.partOfSpeech] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(distribution).map(([pos, count]) => ({
      partOfSpeech: pos,
      count,
      percentage: (count / phrases.length) * 100
    }));
  }, []);
  
  const getLearningProgress = useCallback((phrases: ExtractedPhrase[]) => {
    // Mock learning progress - could be enhanced with actual user data
    return {
      totalWords: phrases.length,
      masteredWords: Math.floor(phrases.length * 0.3),
      inProgressWords: Math.floor(phrases.length * 0.4),
      newWords: Math.ceil(phrases.length * 0.3),
      averageDifficulty: phrases.length > 0 
        ? phrases.reduce((sum, phrase) => {
            const difficultyScore = phrase.difficulty === 'beginner' ? 1 : 
                                   phrase.difficulty === 'intermediate' ? 2 : 3;
            return sum + difficultyScore;
          }, 0) / phrases.length
        : 0
    };
  }, []);
  
  return {
    getDifficultyDistribution,
    getPartOfSpeechDistribution,
    getLearningProgress
  };
};