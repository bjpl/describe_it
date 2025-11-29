/**
 * Shared Vocabulary Utilities
 * Common operations extracted from GammaVocabularyExtractor and GammaVocabularyManager
 */

import { CategorizedPhrase, SavedPhrase } from "@/types/api";
import { PhraseCategory, PhraseExtractor } from "@/lib/services/phraseExtractor";
import { VocabularyManager } from "@/lib/services/vocabularyManager";
import { logger } from "@/lib/logger";

/**
 * Get all category configurations
 */
export function getCategoryConfigs() {
  return PhraseExtractor.getAllCategories();
}

/**
 * Export vocabulary as CSV file with download
 * @param manager - VocabularyManager instance
 * @param options - Export options
 */
export async function exportVocabulary(
  manager: VocabularyManager,
  options: {
    setId?: string;
    includeTranslations?: boolean;
    filename?: string;
  } = {}
): Promise<void> {
  try {
    await manager.downloadTargetWordList(
      options.setId,
      options.includeTranslations ?? true
    );
  } catch (error) {
    logger.error("Export error:", error);
    throw new Error("Failed to export vocabulary");
  }
}

/**
 * Filter phrases by search term and category
 * @param phrases - Array of phrases to filter
 * @param searchTerm - Search query string
 * @param category - Optional category filter
 */
export function filterPhrases<T extends CategorizedPhrase | SavedPhrase>(
  phrases: T[],
  searchTerm: string,
  category?: PhraseCategory | "all"
): T[] {
  if (!searchTerm && (!category || category === "all")) {
    return phrases;
  }

  return phrases.filter((phrase) => {
    const matchesSearch =
      !searchTerm ||
      phrase.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (phrase.definition ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (phrase.context ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      ("translation" in phrase &&
        phrase.translation &&
        phrase.translation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      !category || category === "all" || phrase.category === category;

    return matchesSearch && matchesCategory;
  });
}

/**
 * Filter categorized phrases by search term
 * @param categorizedPhrases - Phrases organized by category
 * @param searchTerm - Search query string
 */
export function filterCategorizedPhrases(
  categorizedPhrases: Record<PhraseCategory, CategorizedPhrase[]>,
  searchTerm: string
): Record<PhraseCategory, CategorizedPhrase[]> {
  if (!searchTerm) {
    return categorizedPhrases;
  }

  const filtered: Record<PhraseCategory, CategorizedPhrase[]> = {
    sustantivos: [],
    verbos: [],
    adjetivos: [],
    adverbios: [],
    frasesClaves: [],
  };

  Object.entries(categorizedPhrases).forEach(([category, phrases]) => {
    filtered[category as PhraseCategory] = filterPhrases(
      phrases,
      searchTerm,
      category as PhraseCategory
    );
  });

  return filtered;
}

/**
 * Get total phrase count from categorized phrases
 */
export function getTotalPhraseCount(
  categorizedPhrases: Record<PhraseCategory, CategorizedPhrase[]>
): number {
  return Object.values(categorizedPhrases).reduce(
    (sum, phrases) => sum + phrases.length,
    0
  );
}

/**
 * Get category display name mapping
 */
export function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    sustantivos: "Nouns",
    verbos: "Verbs",
    adjetivos: "Adjectives",
    adverbios: "Adverbs",
    frasesClaves: "Key Phrases",
  };
  return categoryMap[category] || category;
}

/**
 * Category settings pattern used in multiple components
 */
export interface CategorySettings {
  autoSave: boolean;
  enableTranslation: boolean;
  sortIgnoreArticles: boolean;
  maxPhrasesPerSet?: number;
  coordinateWithAlpha1?: boolean;
  logToDelta4?: boolean;
}

/**
 * Get default category settings
 */
export function getDefaultCategorySettings(): CategorySettings {
  return {
    autoSave: true,
    enableTranslation: true,
    sortIgnoreArticles: true,
    maxPhrasesPerSet: 100,
    coordinateWithAlpha1: true,
    logToDelta4: true,
  };
}

/**
 * Validate phrase data
 */
export function validatePhrase(phrase: CategorizedPhrase | SavedPhrase): boolean {
  return !!(
    phrase &&
    phrase.id &&
    phrase.phrase &&
    phrase.category &&
    phrase.partOfSpeech &&
    phrase.difficulty
  );
}

/**
 * Merge phrase arrays and remove duplicates
 */
export function mergePhrases<T extends CategorizedPhrase | SavedPhrase>(
  phrases1: T[],
  phrases2: T[]
): T[] {
  const phraseMap = new Map<string, T>();

  [...phrases1, ...phrases2].forEach((phrase) => {
    if (!phraseMap.has(phrase.id)) {
      phraseMap.set(phrase.id, phrase);
    }
  });

  return Array.from(phraseMap.values());
}

/**
 * Group phrases by difficulty level
 */
export function groupPhrasesByDifficulty<T extends CategorizedPhrase | SavedPhrase>(
  phrases: T[]
): Record<"beginner" | "intermediate" | "advanced", T[]> {
  return phrases.reduce(
    (acc, phrase) => {
      acc[phrase.difficulty].push(phrase);
      return acc;
    },
    {
      beginner: [] as T[],
      intermediate: [] as T[],
      advanced: [] as T[],
    }
  );
}

/**
 * Calculate phrase statistics
 */
export interface PhraseStatistics {
  totalCount: number;
  byCategoryCount: Record<string, number>;
  byDifficultyCount: Record<string, number>;
  averagePhraseLength: number;
}

export function calculatePhraseStatistics(
  phrases: (CategorizedPhrase | SavedPhrase)[]
): PhraseStatistics {
  const byCategoryCount: Record<string, number> = {};
  const byDifficultyCount: Record<string, number> = {};
  let totalLength = 0;

  phrases.forEach((phrase) => {
    byCategoryCount[phrase.category] = (byCategoryCount[phrase.category] || 0) + 1;
    byDifficultyCount[phrase.difficulty] = (byDifficultyCount[phrase.difficulty] || 0) + 1;
    totalLength += phrase.phrase.length;
  });

  return {
    totalCount: phrases.length,
    byCategoryCount,
    byDifficultyCount,
    averagePhraseLength: phrases.length > 0 ? totalLength / phrases.length : 0,
  };
}
