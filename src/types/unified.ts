// ==============================================
// UNIFIED TYPE SYSTEM - VOCABULARY TYPES
// ==============================================
// Single source of truth for all vocabulary-related types
// Resolves conflicts between database types and UI representation

// ==============================================
// BASE VOCABULARY ITEM (DATABASE FORMAT)
// ==============================================

export interface VocabularyItem {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: number; // 1-10 scale (database format)
  part_of_speech: string; // noun, verb, adjective, adverb, etc.
  frequency_score?: number; // 0-100, how common the word is
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  phonetic_pronunciation?: string;
  audio_url?: string;
  created_at: string;
  updated_at?: string;
  // Additional fields for user progress
  user_notes?: string;
  mastery_level?: number; // 0-100
  last_reviewed?: string;
  review_count?: number;
}

// ==============================================
// UI REPRESENTATION TYPES
// ==============================================

// For UI components that need string difficulty levels
export interface VocabularyItemUI {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: "beginner" | "intermediate" | "advanced"; // UI format
  part_of_speech: string;
  frequency_score?: number;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  phonetic_pronunciation?: string;
  audio_url?: string;
  created_at: string;
  updated_at?: string;
  user_notes?: string;
  mastery_level?: number;
  last_reviewed?: string;
  review_count?: number;
}

// ==============================================
// TYPE GUARDS
// ==============================================

export function isVocabularyItem(obj: any): obj is VocabularyItem {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.spanish_text === "string" &&
    typeof obj.english_translation === "string" &&
    typeof obj.category === "string" &&
    typeof obj.difficulty_level === "number" &&
    typeof obj.part_of_speech === "string" &&
    typeof obj.created_at === "string"
  );
}

export function isVocabularyItemUI(obj: any): obj is VocabularyItemUI {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.spanish_text === "string" &&
    typeof obj.english_translation === "string" &&
    typeof obj.category === "string" &&
    typeof obj.difficulty_level === "string" &&
    ["beginner", "intermediate", "advanced"].includes(obj.difficulty_level) &&
    typeof obj.part_of_speech === "string" &&
    typeof obj.created_at === "string"
  );
}

// ==============================================
// CONVERSION FUNCTIONS
// ==============================================

/**
 * Convert numeric difficulty level to string representation
 */
export function difficultyNumberToString(
  level: number,
): "beginner" | "intermediate" | "advanced" {
  if (level <= 3) return "beginner";
  if (level <= 7) return "intermediate";
  return "advanced";
}

/**
 * Convert string difficulty level to numeric representation
 */
export function difficultyStringToNumber(
  level: "beginner" | "intermediate" | "advanced",
): number {
  switch (level) {
    case "beginner":
      return 2; // Middle of 1-3 range
    case "intermediate":
      return 5; // Middle of 4-7 range
    case "advanced":
      return 9; // Higher end of 8-10 range
  }
}

/**
 * Convert database VocabularyItem to UI representation
 */
export function vocabularyItemToUI(item: VocabularyItem): VocabularyItemUI {
  return {
    ...item,
    difficulty_level: difficultyNumberToString(item.difficulty_level),
  };
}

/**
 * Convert UI VocabularyItem to database representation
 */
export function vocabularyItemFromUI(item: VocabularyItemUI): VocabularyItem {
  return {
    ...item,
    difficulty_level: difficultyStringToNumber(item.difficulty_level),
  };
}

/**
 * Batch convert array of database items to UI format
 */
export function vocabularyItemsToUI(
  items: VocabularyItem[],
): VocabularyItemUI[] {
  return items.map(vocabularyItemToUI);
}

/**
 * Batch convert array of UI items to database format
 */
export function vocabularyItemsFromUI(
  items: VocabularyItemUI[],
): VocabularyItem[] {
  return items.map(vocabularyItemFromUI);
}

// ==============================================
// UTILITY TYPES
// ==============================================

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type DifficultyNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "article"
  | "pronoun"
  | "other";

// ==============================================
// FILTER AND SEARCH TYPES
// ==============================================

export interface VocabularyFilters {
  search?: string;
  category?: string;
  difficulty?: DifficultyLevel | "all";
  partOfSpeech?: PartOfSpeech | "all";
  masteryLevel?: number | "all";
  hasAudio?: boolean;
  hasContext?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface VocabularyStats {
  total: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byPartOfSpeech: Record<PartOfSpeech, number>;
  averageDifficulty: number;
  averageFrequency: number;
  masteryDistribution: Record<number, number>;
  withAudio: number;
  withContext: number;
}

// ==============================================
// BULK OPERATIONS TYPES
// ==============================================

export interface BulkVocabularyOperation<T = VocabularyItem> {
  items: T[];
  operation: "create" | "update" | "delete";
  options?: {
    validateBeforeOperation?: boolean;
    skipDuplicates?: boolean;
    batchSize?: number;
  };
}

export interface BulkOperationResult<T = VocabularyItem> {
  success: boolean;
  processed: number;
  failed: number;
  results: {
    successful: T[];
    failed: {
      item: T;
      error: string;
      index: number;
    }[];
  };
  errors: string[];
  duration?: number;
}

// ==============================================
// EXPORT/IMPORT TYPES
// ==============================================

export interface VocabularyExportOptions {
  format: "csv" | "json" | "xlsx";
  includeProgress?: boolean;
  includeAudio?: boolean;
  filters?: VocabularyFilters;
  fields?: (keyof VocabularyItem)[];
}

export interface VocabularyImportOptions {
  format: "csv" | "json" | "xlsx";
  validateData?: boolean;
  skipDuplicates?: boolean;
  overwriteExisting?: boolean;
  assignToCategory?: string;
}

export interface VocabularyImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  items: VocabularyItem[];
}

// ==============================================
// MIGRATION HELPERS
// ==============================================

/**
 * Normalize legacy vocabulary item objects to unified format
 * Handles various field naming conventions found in the codebase
 */
export function normalizeLegacyVocabularyItem(item: any): VocabularyItem {
  // Handle various difficulty level formats
  let difficulty_level: number;
  if (typeof item.difficulty_level === "string") {
    difficulty_level = difficultyStringToNumber(
      item.difficulty_level as DifficultyLevel,
    );
  } else if (typeof item.difficulty === "string") {
    difficulty_level = difficultyStringToNumber(
      item.difficulty as DifficultyLevel,
    );
  } else if (typeof item.difficulty_level === "number") {
    difficulty_level = item.difficulty_level;
  } else if (typeof item.difficulty === "number") {
    difficulty_level = item.difficulty;
  } else {
    difficulty_level = 2; // Default to beginner
  }

  // Normalize field names
  const normalized: VocabularyItem = {
    id:
      item.id ||
      `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    spanish_text: item.spanish_text || item.spanish || item.phrase || "",
    english_translation:
      item.english_translation ||
      item.english ||
      item.translation ||
      item.definition ||
      "",
    category: item.category || "uncategorized",
    difficulty_level,
    part_of_speech:
      item.part_of_speech || item.partOfSpeech || item.pos || "other",
    frequency_score: item.frequency_score || item.frequency || undefined,
    context_sentence_spanish:
      item.context_sentence_spanish ||
      item.context ||
      item.contextSpanish ||
      undefined,
    context_sentence_english:
      item.context_sentence_english || item.contextEnglish || undefined,
    phonetic_pronunciation:
      item.phonetic_pronunciation ||
      item.pronunciation ||
      item.ipa ||
      undefined,
    audio_url: item.audio_url || item.audioUrl || item.audio || undefined,
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || undefined,
    user_notes: item.user_notes || item.notes || undefined,
    mastery_level: item.mastery_level || item.masteryLevel || undefined,
    last_reviewed: item.last_reviewed || item.lastReviewed || undefined,
    review_count: item.review_count || item.reviewCount || undefined,
  };

  return normalized;
}

/**
 * Validate vocabulary item data integrity
 */
export function validateVocabularyItem(item: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.id || typeof item.id !== "string") {
    errors.push("Missing or invalid id");
  }

  if (
    !item.spanish_text ||
    typeof item.spanish_text !== "string" ||
    item.spanish_text.trim().length === 0
  ) {
    errors.push("Missing or invalid spanish_text");
  }

  if (
    !item.english_translation ||
    typeof item.english_translation !== "string" ||
    item.english_translation.trim().length === 0
  ) {
    errors.push("Missing or invalid english_translation");
  }

  if (!item.category || typeof item.category !== "string") {
    errors.push("Missing or invalid category");
  }

  if (
    typeof item.difficulty_level !== "number" ||
    item.difficulty_level < 1 ||
    item.difficulty_level > 10
  ) {
    errors.push("difficulty_level must be a number between 1 and 10");
  }

  if (!item.part_of_speech || typeof item.part_of_speech !== "string") {
    errors.push("Missing or invalid part_of_speech");
  }

  if (!item.created_at || typeof item.created_at !== "string") {
    errors.push("Missing or invalid created_at");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
