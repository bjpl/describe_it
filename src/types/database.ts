// Database types for Supabase or other database integration
// Import unified types to ensure consistency
import type { VocabularyItem } from "./unified";

// Re-export unified VocabularyItem as the primary database type
export type { VocabularyItem } from "./unified";

export interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface VocabularyListItem {
  id: string;
  list_id: string;
  vocabulary_item_id: string;
  order_index: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  vocabulary_item_id: string;
  mastery_level: number; // 0-100
  times_reviewed: number;
  times_correct: number;
  last_reviewed: string;
  next_review_date: string;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  session_type: "flashcards" | "quiz" | "matching" | "writing";
  vocabulary_items: string[]; // Array of vocabulary item IDs
  score: number;
  accuracy: number;
  time_spent: number; // in seconds
  session_data: any; // JSON data for session specifics
  started_at: string;
  completed_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  language_level: "beginner" | "intermediate" | "advanced";
  daily_goal: number; // words per day
  reminder_enabled: boolean;
  reminder_time: string;
  theme_preference: "light" | "dark" | "auto";
  created_at: string;
  updated_at: string;
}

export interface ImageDescription {
  id: string;
  image_url: string;
  image_id: string; // Unsplash ID
  description_english: string;
  description_spanish: string;
  description_style: string;
  generated_at: string;
  user_id?: string;
}

export interface QASession {
  id: string;
  image_description_id: string;
  questions: QAQuestion[];
  user_responses: QAResponse[];
  score: number;
  accuracy: number;
  time_spent: number;
  created_at: string;
  completed_at?: string;
  user_id?: string;
}

export interface QAQuestion {
  id: string;
  question: string;
  answer: string;
  options?: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
  explanation?: string;
}

export interface QAResponse {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent: number;
  confidence_level?: number; // 1-5 scale
  answered_at: string;
}

// API Response types
export interface DatabaseResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter and search types - use unified VocabularyFilters instead
export type { VocabularyFilters } from "./unified";

// Legacy database-specific filters (deprecated)
// @deprecated Use VocabularyFilters from unified types
export interface DatabaseVocabularyFilters {
  category?: string;
  difficulty_min?: number;
  difficulty_max?: number;
  part_of_speech?: string;
  search_term?: string;
  mastery_level?: number;
}

export interface StudySessionFilters {
  session_type?: string;
  date_from?: string;
  date_to?: string;
  min_score?: number;
  max_score?: number;
}

// Statistics types
export interface VocabularyStats {
  total_words: number;
  mastered_words: number;
  learning_words: number;
  new_words: number;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_part_of_speech: Record<string, number>;
  mastery_distribution: Record<string, number>;
}

export interface StudyStats {
  total_sessions: number;
  total_time_spent: number;
  average_score: number;
  average_accuracy: number;
  streak_current: number;
  streak_longest: number;
  sessions_this_week: number;
  sessions_this_month: number;
  by_session_type: Record<string, number>;
}

// Export types for convenience
export type DatabaseTables =
  | "vocabulary_items"
  | "vocabulary_lists"
  | "vocabulary_list_items"
  | "user_progress"
  | "study_sessions"
  | "user_settings"
  | "image_descriptions"
  | "qa_sessions";
