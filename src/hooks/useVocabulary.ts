import { useState, useEffect, useCallback, useMemo } from "react";
import { normalizeLegacyVocabularyItem } from "../types/unified";
import { logger } from '@/lib/logger';
import type {
  VocabularyItem,
  VocabularyItemUI,
  VocabularyFilters as UnifiedVocabularyFilters,
  VocabularyStats as UnifiedVocabularyStats,
  DifficultyLevel,
  vocabularyItemsToUI,
  vocabularyItemsFromUI,
} from "../types/unified";

// Use unified types for consistency
export type VocabularyStats = UnifiedVocabularyStats;
export type VocabularyFilters = UnifiedVocabularyFilters;

// Spaced repetition hook stubs
export const useReviewSession = (sessionId?: number, maxCards?: number) => {
  return {
    data: {
      cards_due: [{
        phrase_id: "sample_phrase_id",
        easiness_factor: 2.5,
        successStreak: 0,
        next_review_date: new Date().toISOString()
      }]
    },
    session: null,
    startSession: () => {},
    endSession: () => {},
    isLoading: false,
    error: null
  };
};

export const useProcessReviewResponse = () => {
  return {
    processResponse: () => {},
    mutateAsync: async (params: any) => {
      // Accept params: phrase_id, response_quality, response_time_seconds
      return {};
    },
    isProcessing: false,
    isLoading: false,
    error: null
  };
};

export const usePhrase = (phraseId?: string) => {
  return {
    data: {
      spanish_text: "Hola",
      english_translation: "Hello", 
      phonetic_pronunciation: "/ˈoʊlə/",
      context_sentence_spanish: "Hola, ¿cómo estás?",
      context_sentence_english: "Hello, how are you?",
      usage_notes: "Common greeting used in informal situations",
      user_notes: "Practice with different intonations"
    },
    phrase: null,
    updatePhrase: () => {},
    isLoading: false,
    error: null
  };
};

// Additional stubs for vocabulary management hooks
export const useUserPhrases = (filters?: any) => {
  return {
    data: [
      {
        id: "p1",
        spanish_text: "hola",
        english_translation: "hello",
        category: "greetings",
        difficulty_level: 1,
        part_of_speech: "interjection",
        is_user_selected: false,
        is_mastered: false,
        is_starred: false,
        context_sentence_spanish: "Hola, ¿cómo estás?",
        context_sentence_english: "Hello, how are you?",
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        word_type: "common",
        formality_level: "neutral",
        study_count: 3,
        correct_count: 2,
        phonetic_pronunciation: "/ˈoʊlə/",
        user_notes: "This is a common greeting",
        last_studied_at: new Date().toISOString()
      },
      {
        id: "p2", 
        spanish_text: "gracias",
        english_translation: "thank you",
        category: "politeness",
        difficulty_level: 1,
        part_of_speech: "interjection",
        is_user_selected: false,
        is_mastered: true,
        is_starred: true,
        context_sentence_spanish: "Muchas gracias por tu ayuda",
        context_sentence_english: "Thank you very much for your help",
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        word_type: "common",
        formality_level: "neutral",
        study_count: 3,
        correct_count: 2,
        phonetic_pronunciation: "/ˈoʊlə/",
        user_notes: "This is a common greeting",
        last_studied_at: new Date().toISOString()
      }
    ],
    isLoading: false,
    error: null,
    refetch: () => {}
  };
};

export const useVocabularyStats = () => {
  return {
    data: {
      total: 0,
      learned: 0,
      reviewing: 0,
      selected: 0,
      mastered: 0,
      mastery_rate: 0.75
    },
    isLoading: false,
    error: null
  };
};

export const useUpdatePhrase = () => {
  return {
    mutate: () => {},
    mutateAsync: async (params: any) => {},
    isLoading: false,
    error: null
  };
};

export const useDeletePhrase = () => {
  return {
    mutate: () => {},
    mutateAsync: async (params: any) => {},
    isLoading: false,
    error: null
  };
};

export const useTogglePhraseSelection = () => {
  return {
    mutate: () => {},
    mutateAsync: async (params: any) => {},
    isLoading: false,
    error: null
  };
};

export const useBulkUpdatePhraseSelection = () => {
  return {
    mutate: () => {},
    mutateAsync: async (params: any) => {},
    isLoading: false,
    error: null
  };
};

export const usePhrasesByCategory = () => {
  return {
    data: [
      { category: "home", count: 5 },
      { category: "adjectives", count: 3 },
      { category: "actions", count: 4 },
      { category: "nature", count: 2 }
    ],
    isLoading: false,
    error: null
  };
};

export interface UseVocabularyOptions {
  autoLoad?: boolean;
  enableRealTime?: boolean;
  cacheTimeout?: number;
}

// Sample data for demonstration
const SAMPLE_VOCABULARY: VocabularyItem[] = [
  {
    id: "v1",
    spanish_text: "casa",
    english_translation: "house",
    category: "home",
    difficulty_level: 1,
    part_of_speech: "noun",
    frequency_score: 95,
    context_sentence_spanish: "Mi casa es muy grande.",
    context_sentence_english: "My house is very big.",
    created_at: new Date().toISOString(),
    mastery_level: 3,
    review_count: 5,
  },
  {
    id: "v2",
    spanish_text: "hermoso",
    english_translation: "beautiful",
    category: "adjectives",
    difficulty_level: 2,
    part_of_speech: "adjective",
    frequency_score: 80,
    context_sentence_spanish: "El paisaje es muy hermoso.",
    context_sentence_english: "The landscape is very beautiful.",
    created_at: new Date().toISOString(),
    mastery_level: 2,
    review_count: 3,
  },
  {
    id: "v3",
    spanish_text: "caminar",
    english_translation: "to walk",
    category: "actions",
    difficulty_level: 2,
    part_of_speech: "verb",
    frequency_score: 88,
    context_sentence_spanish: "Me gusta caminar en el parque.",
    context_sentence_english: "I like to walk in the park.",
    created_at: new Date().toISOString(),
    mastery_level: 4,
    review_count: 8,
  },
  {
    id: "v4",
    spanish_text: "montaña",
    english_translation: "mountain",
    category: "nature",
    difficulty_level: 3,
    part_of_speech: "noun",
    frequency_score: 65,
    context_sentence_spanish: "La montaña está cubierta de nieve.",
    context_sentence_english: "The mountain is covered with snow.",
    created_at: new Date().toISOString(),
    mastery_level: 1,
    review_count: 1,
  },
  {
    id: "v5",
    spanish_text: "rápidamente",
    english_translation: "quickly",
    category: "adverbs",
    difficulty_level: 4,
    part_of_speech: "adverb",
    frequency_score: 72,
    context_sentence_spanish: "Corrió rápidamente hacia la meta.",
    context_sentence_english: "He ran quickly towards the finish line.",
    created_at: new Date().toISOString(),
    mastery_level: 2,
    review_count: 4,
  },
  {
    id: "v6",
    spanish_text: "esperanza",
    english_translation: "hope",
    category: "emotions",
    difficulty_level: 5,
    part_of_speech: "noun",
    frequency_score: 60,
    context_sentence_spanish: "Nunca pierdas la esperanza.",
    context_sentence_english: "Never lose hope.",
    created_at: new Date().toISOString(),
    mastery_level: 1,
    review_count: 2,
  },
];

export function useVocabulary(options: UseVocabularyOptions = {}) {
  const {
    autoLoad = false,
    enableRealTime = false,
    cacheTimeout = 300000,
  } = options;

  // State - using unified types
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [filters, setFilters] = useState<VocabularyFilters>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Connection status simulation
  const isConnected = connectionStatus === "connected";

  // Load vocabulary data
  const loadVocabulary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus("connecting");

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Simulate random connection success/failure
      const shouldConnect = Math.random() > 0.2; // 80% success rate

      if (shouldConnect) {
        // Use sample data (in real app, this would be an API call)
        // Normalize sample data to ensure consistency
        const normalizedSample = SAMPLE_VOCABULARY.map(
          normalizeLegacyVocabularyItem,
        );
        setItems(normalizedSample);
        setFilteredItems(normalizedSample);
        setConnectionStatus("connected");
        setLastUpdated(new Date());
      } else {
        throw new Error("Unable to connect to vocabulary database");
      }
    } catch (err) {
      logger.error("Vocabulary loading error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load vocabulary",
      );
      setConnectionStatus("disconnected");

      // Fall back to sample data
      const normalizedSample = SAMPLE_VOCABULARY.map(
        normalizeLegacyVocabularyItem,
      );
      setItems(normalizedSample);
      setFilteredItems(normalizedSample);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadVocabulary();
    }
  }, [autoLoad, loadVocabulary]);

  // Real-time updates simulation
  useEffect(() => {
    if (!enableRealTime) return;

    const interval = setInterval(() => {
      // Simulate occasional data updates
      if (Math.random() > 0.8) {
        setLastUpdated(new Date());
        // Could trigger re-filtering or data refresh here
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enableRealTime]);

  // Filter functionality
  const applyFilters = useCallback(
    (vocabulary: VocabularyItem[], currentFilters: VocabularyFilters) => {
      let filtered = [...vocabulary];

      // Search filter
      if (currentFilters.search && currentFilters.search.trim()) {
        const searchTerm = currentFilters.search.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.spanish_text.toLowerCase().includes(searchTerm) ||
            item.english_translation.toLowerCase().includes(searchTerm) ||
            item.context_sentence_spanish?.toLowerCase().includes(searchTerm) ||
            item.context_sentence_english?.toLowerCase().includes(searchTerm),
        );
      }

      // Category filter
      if (currentFilters.category && currentFilters.category !== "all") {
        filtered = filtered.filter(
          (item) => item.category === currentFilters.category,
        );
      }

      // Difficulty filter (handle both string and numeric formats)
      if (currentFilters.difficulty && currentFilters.difficulty !== "all") {
        if (typeof currentFilters.difficulty === "string") {
          const difficultyLevel = currentFilters.difficulty as DifficultyLevel;
          filtered = filtered.filter((item) => {
            const itemDifficulty =
              item.difficulty_level <= 3
                ? "beginner"
                : item.difficulty_level <= 7
                  ? "intermediate"
                  : "advanced";
            return itemDifficulty === difficultyLevel;
          });
        } else {
          filtered = filtered.filter(
            (item) => item.difficulty_level === Number(currentFilters.difficulty),
          );
        }
      }

      // Part of speech filter
      if (
        currentFilters.partOfSpeech &&
        currentFilters.partOfSpeech !== "all"
      ) {
        filtered = filtered.filter(
          (item) => item.part_of_speech === currentFilters.partOfSpeech,
        );
      }

      // Mastery level filter
      if (typeof currentFilters.masteryLevel === "number") {
        filtered = filtered.filter(
          (item) => (item.mastery_level || 0) === currentFilters.masteryLevel,
        );
      }

      return filtered;
    },
    [],
  );

  // Apply filters whenever items or filters change
  useEffect(() => {
    const filtered = applyFilters(items, filters);
    setFilteredItems(filtered);
  }, [items, filters, applyFilters]);

  // Statistics calculation
  const stats = useMemo((): VocabularyStats => {
    const stats: VocabularyStats = {
      total: items.length,
      byCategory: {},
      byDifficulty: { beginner: 0, intermediate: 0, advanced: 0 },
      byPartOfSpeech: {
        noun: 0,
        verb: 0,
        adjective: 0,
        adverb: 0,
        preposition: 0,
        conjunction: 0,
        interjection: 0,
        article: 0,
        pronoun: 0,
        other: 0,
      },
      averageDifficulty: 0,
      averageFrequency: 0,
      masteryDistribution: {},
      withAudio: 0,
      withContext: 0,
    };

    if (items.length === 0) return stats;

    let totalDifficulty = 0;
    let totalFrequency = 0;
    let frequencyCount = 0;

    items.forEach((item) => {
      // Category distribution
      stats.byCategory[item.category] =
        (stats.byCategory[item.category] || 0) + 1;

      // Difficulty distribution (convert numeric to string)
      const difficultyLevel =
        item.difficulty_level <= 3
          ? "beginner"
          : item.difficulty_level <= 7
            ? "intermediate"
            : "advanced";
      stats.byDifficulty[difficultyLevel] =
        (stats.byDifficulty[difficultyLevel] || 0) + 1;
      totalDifficulty += item.difficulty_level;

      // Part of speech distribution
      const pos =
        item.part_of_speech as keyof VocabularyStats["byPartOfSpeech"];
      stats.byPartOfSpeech[pos] = (stats.byPartOfSpeech[pos] || 0) + 1;

      // Count items with audio and context
      if (item.audio_url) stats.withAudio++;
      if (item.context_sentence_spanish) stats.withContext++;

      // Frequency score
      if (item.frequency_score) {
        totalFrequency += item.frequency_score;
        frequencyCount++;
      }

      // Mastery distribution
      const masteryLevel = item.mastery_level || 0;
      stats.masteryDistribution[masteryLevel] =
        (stats.masteryDistribution[masteryLevel] || 0) + 1;
    });

    stats.averageDifficulty =
      Math.round((totalDifficulty / items.length) * 10) / 10;
    stats.averageFrequency =
      frequencyCount > 0 ? Math.round(totalFrequency / frequencyCount) : 0;

    return stats;
  }, [items]);

  // Filter management
  const setFilter = useCallback(
    <K extends keyof VocabularyFilters>(
      key: K,
      value: VocabularyFilters[K],
    ) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value === "all" ? undefined : value,
      }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasFilters = useMemo(() => {
    return Object.values(filters).some(
      (value) => value !== undefined && value !== "",
    );
  }, [filters]);

  // Search functionality
  const search = useCallback(
    (query: string) => {
      setFilter("search", query);
    },
    [setFilter],
  );

  // Utility functions
  const getUniqueCategories = useCallback(() => {
    return Array.from(new Set(items.map((item) => item.category))).sort();
  }, [items]);

  const getUniqueDifficulties = useCallback(() => {
    return Array.from(new Set(items.map((item) => item.difficulty_level))).sort(
      (a, b) => a - b,
    );
  }, [items]);

  const getUniquePartsOfSpeech = useCallback(() => {
    return Array.from(new Set(items.map((item) => item.part_of_speech))).sort();
  }, [items]);

  // CRUD operations (would connect to actual API in real implementation)
  const addItem = useCallback(
    async (item: Omit<VocabularyItem, "id" | "created_at">) => {
      const newItem: VocabularyItem = {
        ...item,
        id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };

      setItems((prev) => [...prev, newItem]);
      return newItem;
    },
    [],
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<VocabularyItem>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updates, updated_at: new Date().toISOString() }
            : item,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Bulk operations
  const addBulkItems = useCallback(
    async (items: Omit<VocabularyItem, "id" | "created_at">[]) => {
      const newItems = items.map((item) => ({
        ...item,
        id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      }));

      setItems((prev) => [...prev, ...newItems]);
      return newItems;
    },
    [],
  );

  const removeBulkItems = useCallback(async (ids: string[]) => {
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
  }, []);

  // Export functionality
  const exportToCSV = useCallback(() => {
    const headers = [
      "Spanish Text",
      "English Translation",
      "Category",
      "Difficulty Level",
      "Part of Speech",
      "Frequency Score",
      "Context Spanish",
      "Context English",
      "Mastery Level",
      "Review Count",
      "Created At",
    ];

    const rows = filteredItems.map((item) => [
      item.spanish_text,
      item.english_translation,
      item.category,
      item.difficulty_level.toString(),
      item.part_of_speech,
      (item.frequency_score || "").toString(),
      item.context_sentence_spanish || "",
      item.context_sentence_english || "",
      (item.mastery_level || "").toString(),
      (item.review_count || "").toString(),
      item.created_at,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `vocabulary-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [filteredItems]);

  return {
    // Data
    items: filteredItems, // Return filtered items as the main items
    allItems: items, // Provide access to all items if needed
    stats,

    // State
    loading,
    error,
    connectionStatus,
    isConnected,
    lastUpdated,

    // Filters
    filters,
    setFilter,
    clearFilters,
    hasFilters,
    search,

    // Utilities
    getUniqueCategories,
    getUniqueDifficulties,
    getUniquePartsOfSpeech,

    // CRUD operations
    loadVocabulary,
    addItem,
    updateItem,
    removeItem,
    addBulkItems,
    removeBulkItems,

    // Export
    exportToCSV,
  };
}
