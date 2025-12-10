// Database types for Supabase or other database integration
// Import unified types to ensure consistency
import type { VocabularyItem } from "./unified";

// Re-export unified VocabularyItem as the primary database type
export type { VocabularyItem } from "./unified";

export interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  category?: string;
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
  last_review_score?: number | null;
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
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  error?: string | null;
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    has_more: boolean;
  };
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

// Database interface using the TableTypeMap for type safety
export interface Database {
  public: {
    Tables: TableTypeMap;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: {
      description_style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
      session_type: 'practice' | 'flashcards' | 'quiz' | 'matching' | 'writing';
      session_status: 'active' | 'completed' | 'abandoned';
      difficulty_level: 'beginner' | 'intermediate' | 'advanced';
      user_level: 'beginner' | 'intermediate' | 'advanced';
      subscription_status: 'free' | 'premium' | 'trial';
      qa_difficulty: 'easy' | 'medium' | 'hard';
    };
  };
}

export type UserProgressInsert = Omit<UserProgress, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Phrase {
  id: string;
  user_id: string;
  phrase_text: string;
  translation?: string;
  definition?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  is_user_selected: boolean;
  is_mastered: boolean;
  study_count: number;
  correct_count: number;
  last_studied_at?: string;
  mastered_at?: string;
  created_at: string;
  updated_at: string;
}

export type PhraseInsert = Omit<Phrase, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Session {
  id: string;
  user_id: string;
  session_type: 'practice' | 'flashcards' | 'quiz' | 'matching' | 'writing';
  status: 'active' | 'completed' | 'abandoned';
  vocabulary_items?: string[];
  score?: number;
  accuracy?: number;
  time_spent?: number;
  session_data?: any;
  device_info?: any;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type SessionInsert = Omit<Session, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Image and Description types for database tables
export interface ImageRecord {
  id: string;
  unsplash_id: string;
  url: string;
  alt_description?: string;
  description?: string;
  width: number;
  height: number;
  color?: string;
  likes: number;
  photographer: string;
  photographer_url: string;
  created_at: string;
  updated_at: string;
}

export type ImageInsert = Omit<ImageRecord, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface DescriptionRecord {
  id: string;
  image_id: string;
  image_url?: string | null;
  style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
  description_style?: string;
  description_english: string;
  description_spanish: string;
  is_completed?: boolean;
  completed_at?: string;
  completion_time_seconds?: number;
  user_rating?: number;
  created_at: string;
  updated_at: string;
}

export type DescriptionInsert = Omit<DescriptionRecord, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Missing type exports required by database utils - using concrete type mappings
export type DatabaseSchema = Database;

// Define table type mappings - exported for use in other files
export type TableTypeMap = {
  users: {
    Row: {
      id: string;
      email?: string;
      full_name?: string;
      learning_level: "beginner" | "intermediate" | "advanced";
      subscription_status: "free" | "premium" | "trial";
      total_points: number;
      current_streak: number;
      longest_streak: number;
      last_active_at?: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      email?: string;
      full_name?: string;
      learning_level?: "beginner" | "intermediate" | "advanced";
      subscription_status?: "free" | "premium" | "trial";
      total_points?: number;
      current_streak?: number;
      longest_streak?: number;
      last_active_at?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      email?: string;
      full_name?: string;
      learning_level?: "beginner" | "intermediate" | "advanced";
      subscription_status?: "free" | "premium" | "trial";
      total_points?: number;
      current_streak?: number;
      longest_streak?: number;
      last_active_at?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  sessions: {
    Row: Session;
    Insert: SessionInsert;
    Update: Partial<SessionInsert>;
  };
  descriptions: {
    Row: DescriptionRecord;
    Insert: DescriptionInsert;
    Update: Partial<DescriptionInsert>;
  };
  images: {
    Row: ImageRecord;
    Insert: ImageInsert;
    Update: Partial<ImageInsert>;
  };
  questions: {
    Row: QAQuestion & { id: string; created_at: string; updated_at: string };
    Insert: QAQuestion & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<QAQuestion & { id?: string; created_at?: string; updated_at?: string }>;
  };
  phrases: {
    Row: Phrase;
    Insert: PhraseInsert;
    Update: Partial<PhraseInsert>;
  };
  user_progress: {
    Row: UserProgress;
    Insert: UserProgressInsert;
    Update: Partial<UserProgressInsert>;
  };
  export_history: {
    Row: {
      id: string;
      user_id: string;
      export_type: string;
      status: string;
      data?: any;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      export_type: string;
      status?: string;
      data?: any;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      export_type?: string;
      status?: string;
      data?: any;
      created_at?: string;
      updated_at?: string;
    };
  };
};

// Type helpers for accessing table types
export type Tables<T extends keyof TableTypeMap> = TableTypeMap[T]["Row"];
export type TablesInsert<T extends keyof TableTypeMap> = TableTypeMap[T]["Insert"];
export type TablesUpdate<T extends keyof TableTypeMap> = TableTypeMap[T]["Update"];

// API Response type alias (matches existing DatabaseResponse but also supports just data/error)
export type ApiResponse<T> = DatabaseResponse<T> | {
  data: T | null;
  error: string | null;
};

// Learning Analytics interface
export interface LearningAnalytics {
  user_id: string;
  overall_performance: {
    total_points: number;
    accuracy_rate: number;
    consistency_score: number;
    improvement_trend: "improving" | "stable" | "declining";
  };
  skill_breakdown: Record<string, number>;
  recent_activity: {
    sessions_last_week: number;
    descriptions_completed: number;
    new_phrases_learned: number;
  };
  recommendations: {
    focus_areas: string[];
    suggested_difficulty: string;
    next_milestones: string[];
  };
}

// Enhanced user type with progress data
export interface UserWithProgress {
  id: string;
  email?: string;
  full_name?: string;
  learning_level: "beginner" | "intermediate" | "advanced";
  subscription_status: "free" | "premium" | "trial";
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
  recent_progress?: UserProgress[];
  achievements: string[];
}

// Enhanced session type with related data
export interface SessionWithDetails extends Session {
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  descriptions?: DescriptionRecord[];
  questions?: QAQuestion[];
  phrases?: Phrase[];
}

// Enhanced description type with relations
export interface DescriptionWithRelations extends DescriptionRecord {
  session?: Session;
  image?: ImageRecord;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  questions?: QAQuestion[];
  phrases?: Phrase[];
}

// Additional type exports needed by service files
export type DatabaseUser = Tables<"users">;
export type SessionType = Tables<"sessions">["session_type"];
export type DescriptionStyle = Database["public"]["Enums"]["description_style"];
export type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];
export type QADifficulty = Database["public"]["Enums"]["qa_difficulty"];
export type VocabularyCategory = string; // Could be enum if needed
export type ThemePreference = "light" | "dark" | "auto";
export type LanguagePreference = "en" | "es";
export type ExportFormat = "csv" | "json" | "anki" | "pdf";
export type QuestionType = "factual" | "inferential" | "evaluative" | "creative";
export type LearningPhase = "new" | "learning" | "review" | "mastered";

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
