/**
 * React Query hooks for vocabulary/phrase management
 * Handles CRUD operations and spaced repetition integration
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabaseService } from '../lib/api/supabase';
import { SpacedRepetitionAlgorithm, SpacedRepetitionCard } from '../lib/algorithms/spaced-repetition';
import { 
  PhraseInsert, 
  PhraseUpdate,
  FilterOptions,
  PaginationParams,
  SpacedRepetitionResponse 
} from '../lib/validations/schemas';
import { useAuth } from './useSession';
import { Phrase } from '../types/database';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const vocabularyQueryKeys = {
  all: ['vocabulary'] as const,
  user: (userId: string) => [...vocabularyQueryKeys.all, 'user', userId] as const,
  phrases: (userId: string, filters?: FilterOptions) => 
    [...vocabularyQueryKeys.user(userId), 'phrases', filters] as const,
  phrase: (phraseId: string) => [...vocabularyQueryKeys.all, 'phrase', phraseId] as const,
  review: (userId: string) => [...vocabularyQueryKeys.user(userId), 'review'] as const,
  stats: (userId: string) => [...vocabularyQueryKeys.user(userId), 'stats'] as const,
  spacedRepetition: (userId: string) => 
    [...vocabularyQueryKeys.user(userId), 'spaced-repetition'] as const,
};

// =============================================================================
// PHRASE QUERIES
// =============================================================================

/**
 * Get user phrases with filtering and pagination
 */
export const useUserPhrases = (filters?: FilterOptions, pagination?: PaginationParams) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: vocabularyQueryKeys.phrases(userId!, filters),
    queryFn: () => supabaseService.getUserPhrases(userId!, {
      ...filters,
      limit: pagination?.limit,
      offset: pagination?.offset,
    }),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

/**
 * Infinite query for loading phrases with pagination
 */
export const useInfinitePhrases = (filters?: FilterOptions) => {
  const { userId } = useAuth();
  
  return useInfiniteQuery({
    queryKey: [...vocabularyQueryKeys.phrases(userId!, filters), 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await supabaseService.getUserPhrases(userId!, {
        ...filters,
        limit: 20,
        offset: pageParam * 20,
      });
      
      return {
        phrases: data,
        nextPage: data.length === 20 ? pageParam + 1 : undefined,
      };
    },
    enabled: !!userId,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get a single phrase by ID
 */
export const usePhrase = (phraseId: string) => {
  return useQuery({
    queryKey: vocabularyQueryKeys.phrase(phraseId),
    queryFn: () => supabaseService.getPhrase(phraseId),
    enabled: !!phraseId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get phrases due for review (spaced repetition)
 */
export const usePhrasesForReview = (limit = 20) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: vocabularyQueryKeys.review(userId!),
    queryFn: () => supabaseService.getPhrasesForReview(userId!, limit),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
};

/**
 * Get vocabulary statistics
 */
export const useVocabularyStats = () => {
  const { userId } = useAuth();
  const allPhrases = useUserPhrases();
  
  return useQuery({
    queryKey: vocabularyQueryKeys.stats(userId!),
    queryFn: async () => {
      const phrases = allPhrases.data || [];
      
      const total = phrases.length;
      const selected = phrases.filter(p => p.is_user_selected).length;
      const mastered = phrases.filter(p => p.is_mastered).length;
      const studied = phrases.filter(p => p.study_count > 0).length;
      
      // Category breakdown
      const categories = phrases.reduce((acc, phrase) => {
        acc[phrase.category] = (acc[phrase.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Difficulty breakdown
      const difficulties = phrases.reduce((acc, phrase) => {
        acc[phrase.difficulty_level] = (acc[phrase.difficulty_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Mastery rate by category
      const masteryByCategory = Object.keys(categories).reduce((acc, category) => {
        const categoryPhrases = phrases.filter(p => p.category === category);
        const categoryMastered = categoryPhrases.filter(p => p.is_mastered).length;
        acc[category] = categoryPhrases.length > 0 ? categoryMastered / categoryPhrases.length : 0;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        total,
        selected,
        mastered,
        studied,
        mastery_rate: total > 0 ? mastered / total : 0,
        selection_rate: total > 0 ? selected / total : 0,
        categories,
        difficulties,
        mastery_by_category: masteryByCategory,
        average_study_count: total > 0 
          ? phrases.reduce((sum, p) => sum + p.study_count, 0) / total 
          : 0,
      };
    },
    enabled: !!userId && !!allPhrases.data,
    staleTime: 5 * 60 * 1000,
  });
};

// =============================================================================
// PHRASE MUTATIONS
// =============================================================================

/**
 * Create a new phrase
 */
export const useCreatePhrase = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: (data: PhraseInsert) => supabaseService.createPhrase(data),
    onSuccess: (data) => {
      if (userId) {
        // Invalidate phrases queries
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.user(userId) });
        
        // Add to the cache
        queryClient.setQueryData(vocabularyQueryKeys.phrase(data.id), data);
      }
    },
    onError: (error) => {
      console.error('Failed to create phrase:', error);
    },
  });
};

/**
 * Update a phrase
 */
export const useUpdatePhrase = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PhraseUpdate }) => 
      supabaseService.updatePhrase(id, updates),
    onSuccess: (data) => {
      if (userId) {
        // Update specific phrase cache
        queryClient.setQueryData(vocabularyQueryKeys.phrase(data.id), data);
        
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.user(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to update phrase:', error);
    },
  });
};

/**
 * Delete a phrase
 */
export const useDeletePhrase = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: (phraseId: string) => supabaseService.deletePhrase(phraseId),
    onSuccess: (_, phraseId) => {
      if (userId) {
        // Remove from phrase cache
        queryClient.removeQueries({ queryKey: vocabularyQueryKeys.phrase(phraseId) });
        
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.user(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to delete phrase:', error);
    },
  });
};

/**
 * Toggle phrase selection for study
 */
export const useTogglePhraseSelection = () => {
  const updatePhrase = useUpdatePhrase();
  
  return useMutation({
    mutationFn: async ({ phraseId, isSelected }: { phraseId: string; isSelected: boolean }) => {
      return updatePhrase.mutateAsync({
        id: phraseId,
        updates: { 
          is_user_selected: isSelected,
          updated_at: new Date().toISOString(),
        },
      });
    },
  });
};

/**
 * Mark phrase as mastered
 */
export const useMarkPhraseAsMastered = () => {
  const updatePhrase = useUpdatePhrase();
  
  return useMutation({
    mutationFn: async (phraseId: string) => {
      return updatePhrase.mutateAsync({
        id: phraseId,
        updates: { 
          is_mastered: true,
          mastered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    },
  });
};

// =============================================================================
// SPACED REPETITION HOOKS
// =============================================================================

/**
 * Get spaced repetition cards for user
 */
export const useSpacedRepetitionCards = () => {
  const { userId } = useAuth();
  const userPhrases = useUserPhrases({ is_user_selected: true });
  
  return useQuery({
    queryKey: vocabularyQueryKeys.spacedRepetition(userId!),
    queryFn: async (): Promise<SpacedRepetitionCard[]> => {
      const phrases = userPhrases.data || [];
      
      // Convert phrases to spaced repetition cards
      return phrases.map(phrase => {
        // Calculate next review date based on study history
        let nextReviewDate = new Date();
        if (phrase.last_studied_at) {
          const lastStudied = new Date(phrase.last_studied_at);
          const interval = Math.max(1, phrase.study_count * 2); // Simple interval calculation
          nextReviewDate = new Date(lastStudied);
          nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        }
        
        return {
          phrase_id: phrase.id,
          user_id: phrase.user_id,
          interval: phrase.study_count > 0 ? Math.max(1, phrase.study_count * 2) : 1,
          repetition: phrase.study_count,
          easiness_factor: 2.5 - (phrase.study_count - phrase.correct_count) * 0.1, // Simple EF calculation
          next_review_date: nextReviewDate,
          last_reviewed: phrase.last_studied_at ? new Date(phrase.last_studied_at) : null,
          quality: phrase.study_count > 0 ? Math.round((phrase.correct_count / phrase.study_count) * 5) : undefined,
        };
      });
    },
    enabled: !!userId && !!userPhrases.data,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get review session with spaced repetition logic
 */
export const useReviewSession = (maxNewCards = 10, maxReviewCards = 50) => {
  const spacedRepetitionCards = useSpacedRepetitionCards();
  
  return useQuery({
    queryKey: ['review-session', maxNewCards, maxReviewCards, spacedRepetitionCards.data],
    queryFn: () => {
      const cards = spacedRepetitionCards.data || [];
      return SpacedRepetitionAlgorithm.getReviewSession(cards, maxNewCards, maxReviewCards);
    },
    enabled: !!spacedRepetitionCards.data,
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Process spaced repetition review response
 */
export const useProcessReviewResponse = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (response: SpacedRepetitionResponse) => {
      // Mark phrase as studied in database
      await supabaseService.markPhraseAsStudied(response.phrase_id, response.response_quality >= 3);
      
      return response;
    },
    onSuccess: () => {
      if (userId) {
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.user(userId) });
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.spacedRepetition(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to process review response:', error);
    },
  });
};

/**
 * Get study recommendations based on spaced repetition
 */
export const useStudyRecommendations = () => {
  const spacedRepetitionCards = useSpacedRepetitionCards();
  
  return useQuery({
    queryKey: ['study-recommendations', spacedRepetitionCards.data],
    queryFn: () => {
      const cards = spacedRepetitionCards.data || [];
      return SpacedRepetitionAlgorithm.generateStudyRecommendations(cards);
    },
    enabled: !!spacedRepetitionCards.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get optimal study schedule
 */
export const useOptimalSchedule = (targetDailyMinutes = 20) => {
  const spacedRepetitionCards = useSpacedRepetitionCards();
  
  return useQuery({
    queryKey: ['optimal-schedule', targetDailyMinutes, spacedRepetitionCards.data],
    queryFn: () => {
      const cards = spacedRepetitionCards.data || [];
      return SpacedRepetitionAlgorithm.calculateOptimalSchedule(cards, targetDailyMinutes);
    },
    enabled: !!spacedRepetitionCards.data,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk update phrase selection
 */
export const useBulkUpdatePhraseSelection = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async ({ phraseIds, isSelected }: { phraseIds: string[]; isSelected: boolean }) => {
      const updatePromises = phraseIds.map(id =>
        supabaseService.updatePhrase(id, {
          is_user_selected: isSelected,
          updated_at: new Date().toISOString(),
        })
      );
      
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.user(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to bulk update phrases:', error);
    },
  });
};

/**
 * Bulk delete phrases
 */
export const useBulkDeletePhrases = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (phraseIds: string[]) => {
      const deletePromises = phraseIds.map(id => supabaseService.deletePhrase(id));
      return Promise.all(deletePromises);
    },
    onSuccess: (_, phraseIds) => {
      if (userId) {
        // Remove from individual caches
        phraseIds.forEach(id => {
          queryClient.removeQueries({ queryKey: vocabularyQueryKeys.phrase(id) });
        });
        
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.user(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to bulk delete phrases:', error);
    },
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Search phrases with debouncing
 */
export const useSearchPhrases = (searchQuery: string, debounceMs = 300) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: ['search-phrases', userId, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      return supabaseService.getUserPhrases(userId!, {
        search_query: searchQuery,
        limit: 50,
      });
    },
    enabled: !!userId && searchQuery.trim().length > 2,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Get phrases by category with counts
 */
export const usePhrasesByCategory = () => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: ['phrases-by-category', userId],
    queryFn: async () => {
      const allPhrases = await supabaseService.getUserPhrases(userId!);
      
      const categorized = allPhrases.reduce((acc, phrase) => {
        if (!acc[phrase.category]) {
          acc[phrase.category] = [];
        }
        acc[phrase.category].push(phrase);
        return acc;
      }, {} as Record<string, Phrase[]>);
      
      // Add counts and mastery stats for each category
      return Object.entries(categorized).map(([category, phrases]) => ({
        category,
        phrases,
        count: phrases.length,
        selected: phrases.filter(p => p.is_user_selected).length,
        mastered: phrases.filter(p => p.is_mastered).length,
        mastery_rate: phrases.length > 0 ? phrases.filter(p => p.is_mastered).length / phrases.length : 0,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};