// Export all hooks for easy importing
export { 
  useImageSearch, 
  useSearchSuggestions, 
  usePopularSearches 
} from './useImageSearch';

export { 
  useDescriptions, 
  useBatchDescriptions, 
  useDescriptionAnalytics 
} from './useDescriptions';

export { 
  useQuestionAnswer, 
  useQuestionSuggestions, 
  useQAAnalytics, 
  useBatchQA 
} from './useQuestionAnswer';

export { 
  usePhraseExtraction, 
  usePhraseFilters, 
  useVocabularyLearning, 
  usePhraseAnalytics 
} from './usePhraseExtraction';

export { 
  useSession, 
  useSessionStats, 
  useAuth, 
  useSearchHistory, 
  usePreferences 
} from './useSession';

export { 
  useExport, 
  useQuickExport, 
  useExportStats 
} from './useExport';

// Learning hooks
export * from './useProgressTracking';
export * from './useVocabulary';