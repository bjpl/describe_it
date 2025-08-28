/**
 * Database Types for Spanish Learning App
 * Generated from Supabase schema definitions
 */

export interface Json {
  [key: string]: any
}

// Enums
export type LearningLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type PreferredLanguage = 'en' | 'es'
export type SubscriptionStatus = 'free' | 'premium' | 'premium_plus'
export type SessionType = 'practice' | 'review' | 'challenge' | 'free_play'
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'paused'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type ContentRating = 'safe' | 'moderate' | 'explicit'
export type DescriptionStyle = 'simple' | 'detailed' | 'poetic' | 'narrative' | 'technical' | 'conversational'
export type TenseFocus = 'present' | 'past' | 'future' | 'mixed'
export type VocabularyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert'
export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced'
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'translation' | 'comprehension' | 'grammar' | 'vocabulary' | 'sentence_order'
export type PhraseCategory = 'vocabulary' | 'expression' | 'idiom' | 'phrase' | 'grammar_pattern' | 'collocation' | 'verb_conjugation' | 'cultural_reference'
export type WordType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'article' | 'interjection' | 'phrase' | 'expression'
export type Gender = 'masculine' | 'feminine' | 'neutral'
export type VerbTense = 'infinitive' | 'present' | 'preterite' | 'imperfect' | 'future' | 'conditional' | 'subjunctive' | 'imperative'
export type FormalityLevel = 'formal' | 'neutral' | 'informal' | 'slang'
export type ProgressType = 'daily' | 'weekly' | 'monthly' | 'skill' | 'vocabulary' | 'grammar' | 'achievement' | 'milestone' | 'session_summary' | 'audit_log'
export type SkillCategory = 'reading_comprehension' | 'vocabulary_recognition' | 'grammar_understanding' | 'translation_accuracy' | 'cultural_awareness' | 'listening_comprehension'
export type ExportType = 'vocabulary' | 'progress' | 'sessions' | 'descriptions' | 'questions' | 'full_data' | 'learning_report' | 'achievement_summary' | 'custom' | 'cleanup'
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'xlsx' | 'txt' | 'xml' | 'log'
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired'

// Base table interfaces
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      sessions: {
        Row: Session
        Insert: SessionInsert
        Update: SessionUpdate
      }
      images: {
        Row: Image
        Insert: ImageInsert
        Update: ImageUpdate
      }
      descriptions: {
        Row: Description
        Insert: DescriptionInsert
        Update: DescriptionUpdate
      }
      questions: {
        Row: Question
        Insert: QuestionInsert
        Update: QuestionUpdate
      }
      phrases: {
        Row: Phrase
        Insert: PhraseInsert
        Update: PhraseUpdate
      }
      user_progress: {
        Row: UserProgress
        Insert: UserProgressInsert
        Update: UserProgressUpdate
      }
      export_history: {
        Row: ExportHistory
        Insert: ExportHistoryInsert
        Update: ExportHistoryUpdate
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // User functions
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      
      // Session functions
      calculate_session_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      
      // Image functions
      increment_image_usage: {
        Args: { image_id: string }
        Returns: undefined
      }
      update_image_success_rate: {
        Args: { 
          image_id: string
          completion_time: number
          was_successful: boolean
        }
        Returns: undefined
      }
      
      // Description functions
      get_user_description_history: {
        Args: { 
          user_uuid: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          description_id: string
          image_url: string
          spanish_text: string
          english_translation: string
          style: DescriptionStyle
          difficulty_score: number
          is_completed: boolean
          created_at: string
        }[]
      }
      
      // Question functions
      generate_questions_for_description: {
        Args: {
          desc_id: string
          sess_id: string
          usr_id: string
          question_count?: number
        }
        Returns: undefined
      }
      get_user_question_stats: {
        Args: {
          user_uuid: string
          days_back?: number
        }
        Returns: {
          total_questions: number
          correct_answers: number
          accuracy_percentage: number
          avg_response_time: number
          questions_by_type: Json
          questions_by_difficulty: Json
        }[]
      }
      
      // Phrase functions
      extract_phrases_from_description: {
        Args: {
          desc_id: string
          sess_id: string
          usr_id: string
        }
        Returns: number
      }
      get_user_vocabulary_stats: {
        Args: {
          user_uuid: string
          category_filter?: string
        }
        Returns: {
          total_phrases: number
          selected_phrases: number
          mastered_phrases: number
          mastery_percentage: number
          avg_study_count: number
          phrases_by_difficulty: Json
          phrases_by_category: Json
          recent_activity: Json
        }[]
      }
      
      // Progress functions
      calculate_daily_progress: {
        Args: {
          user_uuid: string
          target_date?: string
        }
        Returns: undefined
      }
      calculate_period_progress: {
        Args: {
          user_uuid: string
          period_type: string
          target_date?: string
        }
        Returns: undefined
      }
      get_user_progress_summary: {
        Args: {
          user_uuid: string
          days_back?: number
        }
        Returns: {
          overall_level: LearningLevel
          total_points: number
          current_streak: number
          completion_rate: number
          improvement_trend: string
          top_skills: Json
          recent_achievements: string[]
          next_milestones: Json
        }[]
      }
      
      // Export functions
      request_data_export: {
        Args: {
          user_uuid: string
          export_type_param: ExportType
          export_format_param?: ExportFormat
          date_start?: string
          date_end?: string
          export_settings_param?: Json
        }
        Returns: string
      }
      get_user_export_stats: {
        Args: {
          user_uuid: string
          days_back?: number
        }
        Returns: {
          total_exports: number
          completed_exports: number
          total_downloads: number
          exports_by_type: Json
          exports_by_format: Json
          recent_activity: Json
          storage_used_bytes: number
        }[]
      }
      get_exportable_data_info: {
        Args: { user_uuid: string }
        Returns: {
          vocabulary_phrases: number
          learning_sessions: number
          descriptions_created: number
          questions_answered: number
          progress_records: number
          date_range_start: string
          date_range_end: string
          estimated_file_size_kb: number
        }[]
      }
      
      // Utility functions
      check_achievements: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      generate_recommendations: {
        Args: { user_uuid: string }
        Returns: Json
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          rows_affected: number
        }[]
      }
      batch_calculate_progress: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      learning_level: LearningLevel
      preferred_language: PreferredLanguage
      subscription_status: SubscriptionStatus
      session_type: SessionType
      session_status: SessionStatus
      difficulty_level: DifficultyLevel
      content_rating: ContentRating
      description_style: DescriptionStyle
      tense_focus: TenseFocus
      vocabulary_level: VocabularyLevel
      complexity_level: ComplexityLevel
      question_type: QuestionType
      phrase_category: PhraseCategory
      word_type: WordType
      gender: Gender
      verb_tense: VerbTense
      formality_level: FormalityLevel
      progress_type: ProgressType
      skill_category: SkillCategory
      export_type: ExportType
      export_format: ExportFormat
      export_status: ExportStatus
    }
  }
}

// Table type definitions
export interface User {
  id: string
  email: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  preferred_language: PreferredLanguage
  learning_level: LearningLevel
  daily_goal: number
  streak_count: number
  total_points: number
  is_premium: boolean
  subscription_status: SubscriptionStatus
  timezone: string
  notification_settings: Json
  preferences: Json
  created_at: string
  updated_at: string
  last_active_at: string
  deleted_at: string | null
}

export interface UserInsert {
  id: string
  email: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
  preferred_language?: PreferredLanguage
  learning_level?: LearningLevel
  daily_goal?: number
  streak_count?: number
  total_points?: number
  is_premium?: boolean
  subscription_status?: SubscriptionStatus
  timezone?: string
  notification_settings?: Json
  preferences?: Json
  created_at?: string
  updated_at?: string
  last_active_at?: string
  deleted_at?: string | null
}

export interface UserUpdate {
  id?: string
  email?: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
  preferred_language?: PreferredLanguage
  learning_level?: LearningLevel
  daily_goal?: number
  streak_count?: number
  total_points?: number
  is_premium?: boolean
  subscription_status?: SubscriptionStatus
  timezone?: string
  notification_settings?: Json
  preferences?: Json
  created_at?: string
  updated_at?: string
  last_active_at?: string
  deleted_at?: string | null
}

export interface Session {
  id: string
  user_id: string
  session_type: SessionType
  status: SessionStatus
  started_at: string
  completed_at: string | null
  duration_minutes: number
  images_viewed: number
  descriptions_completed: number
  questions_answered: number
  questions_correct: number
  phrases_selected: number
  points_earned: number
  accuracy_percentage: number
  session_data: Json
  device_info: Json
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export interface SessionInsert {
  id?: string
  user_id: string
  session_type?: SessionType
  status?: SessionStatus
  started_at?: string
  completed_at?: string | null
  duration_minutes?: number
  images_viewed?: number
  descriptions_completed?: number
  questions_answered?: number
  questions_correct?: number
  phrases_selected?: number
  points_earned?: number
  accuracy_percentage?: number
  session_data?: Json
  device_info?: Json
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
  updated_at?: string
}

export interface SessionUpdate {
  id?: string
  user_id?: string
  session_type?: SessionType
  status?: SessionStatus
  started_at?: string
  completed_at?: string | null
  duration_minutes?: number
  images_viewed?: number
  descriptions_completed?: number
  questions_answered?: number
  questions_correct?: number
  phrases_selected?: number
  points_earned?: number
  accuracy_percentage?: number
  session_data?: Json
  device_info?: Json
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
  updated_at?: string
}

export interface Image {
  id: string
  unsplash_id: string
  url_regular: string
  url_small: string
  url_thumb: string
  url_raw: string
  width: number
  height: number
  color: string | null
  blur_hash: string | null
  alt_description: string | null
  search_query: string
  photographer_name: string
  photographer_username: string
  photographer_profile_url: string | null
  download_location: string | null
  tags: string[]
  categories: string[]
  difficulty_level: DifficultyLevel
  content_rating: ContentRating
  is_active: boolean
  usage_count: number
  success_rate: number
  avg_completion_time: number
  metadata: Json
  first_used_at: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface ImageInsert {
  id?: string
  unsplash_id: string
  url_regular: string
  url_small: string
  url_thumb: string
  url_raw: string
  width: number
  height: number
  color?: string | null
  blur_hash?: string | null
  alt_description?: string | null
  search_query: string
  photographer_name: string
  photographer_username: string
  photographer_profile_url?: string | null
  download_location?: string | null
  tags?: string[]
  categories?: string[]
  difficulty_level?: DifficultyLevel
  content_rating?: ContentRating
  is_active?: boolean
  usage_count?: number
  success_rate?: number
  avg_completion_time?: number
  metadata?: Json
  first_used_at?: string | null
  last_used_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface ImageUpdate {
  id?: string
  unsplash_id?: string
  url_regular?: string
  url_small?: string
  url_thumb?: string
  url_raw?: string
  width?: number
  height?: number
  color?: string | null
  blur_hash?: string | null
  alt_description?: string | null
  search_query?: string
  photographer_name?: string
  photographer_username?: string
  photographer_profile_url?: string | null
  download_location?: string | null
  tags?: string[]
  categories?: string[]
  difficulty_level?: DifficultyLevel
  content_rating?: ContentRating
  is_active?: boolean
  usage_count?: number
  success_rate?: number
  avg_completion_time?: number
  metadata?: Json
  first_used_at?: string | null
  last_used_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Description {
  id: string
  session_id: string
  image_id: string
  user_id: string
  style: DescriptionStyle
  spanish_text: string
  english_translation: string
  difficulty_score: number
  word_count: number
  reading_time_seconds: number
  complexity_level: ComplexityLevel
  tense_focus: TenseFocus
  grammar_points: string[]
  vocabulary_level: VocabularyLevel
  cultural_context: string | null
  ai_model: string
  ai_prompt: string | null
  generation_metadata: Json
  quality_score: number
  user_rating: number | null
  is_favorite: boolean
  is_completed: boolean
  completion_time_seconds: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface DescriptionInsert {
  id?: string
  session_id: string
  image_id: string
  user_id: string
  style: DescriptionStyle
  spanish_text: string
  english_translation: string
  difficulty_score?: number
  word_count: number
  reading_time_seconds?: number
  complexity_level?: ComplexityLevel
  tense_focus?: TenseFocus
  grammar_points?: string[]
  vocabulary_level?: VocabularyLevel
  cultural_context?: string | null
  ai_model?: string
  ai_prompt?: string | null
  generation_metadata?: Json
  quality_score?: number
  user_rating?: number | null
  is_favorite?: boolean
  is_completed?: boolean
  completion_time_seconds?: number | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

export interface DescriptionUpdate {
  id?: string
  session_id?: string
  image_id?: string
  user_id?: string
  style?: DescriptionStyle
  spanish_text?: string
  english_translation?: string
  difficulty_score?: number
  word_count?: number
  reading_time_seconds?: number
  complexity_level?: ComplexityLevel
  tense_focus?: TenseFocus
  grammar_points?: string[]
  vocabulary_level?: VocabularyLevel
  cultural_context?: string | null
  ai_model?: string
  ai_prompt?: string | null
  generation_metadata?: Json
  quality_score?: number
  user_rating?: number | null
  is_favorite?: boolean
  is_completed?: boolean
  completion_time_seconds?: number | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

export interface Question {
  id: string
  description_id: string
  session_id: string
  user_id: string
  question_type: QuestionType
  question_text: string
  question_spanish: string | null
  question_english: string | null
  correct_answer: string
  user_response: string | null
  answer_options: Json
  explanation: string | null
  explanation_spanish: string | null
  explanation_english: string | null
  difficulty_level: DifficultyLevel
  grammar_focus: string[]
  vocabulary_focus: string[]
  points_value: number
  time_limit_seconds: number
  is_answered: boolean
  is_correct: boolean
  response_time_seconds: number | null
  hints_used: number
  attempts_count: number
  max_attempts: number
  question_order: number
  metadata: Json
  answered_at: string | null
  created_at: string
  updated_at: string
}

export interface QuestionInsert {
  id?: string
  description_id: string
  session_id: string
  user_id: string
  question_type: QuestionType
  question_text: string
  question_spanish?: string | null
  question_english?: string | null
  correct_answer: string
  user_response?: string | null
  answer_options?: Json
  explanation?: string | null
  explanation_spanish?: string | null
  explanation_english?: string | null
  difficulty_level?: DifficultyLevel
  grammar_focus?: string[]
  vocabulary_focus?: string[]
  points_value?: number
  time_limit_seconds?: number
  is_answered?: boolean
  is_correct?: boolean
  response_time_seconds?: number | null
  hints_used?: number
  attempts_count?: number
  max_attempts?: number
  question_order: number
  metadata?: Json
  answered_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface QuestionUpdate {
  id?: string
  description_id?: string
  session_id?: string
  user_id?: string
  question_type?: QuestionType
  question_text?: string
  question_spanish?: string | null
  question_english?: string | null
  correct_answer?: string
  user_response?: string | null
  answer_options?: Json
  explanation?: string | null
  explanation_spanish?: string | null
  explanation_english?: string | null
  difficulty_level?: DifficultyLevel
  grammar_focus?: string[]
  vocabulary_focus?: string[]
  points_value?: number
  time_limit_seconds?: number
  is_answered?: boolean
  is_correct?: boolean
  response_time_seconds?: number | null
  hints_used?: number
  attempts_count?: number
  max_attempts?: number
  question_order?: number
  metadata?: Json
  answered_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Phrase {
  id: string
  description_id: string
  session_id: string
  user_id: string
  category: PhraseCategory
  spanish_text: string
  english_translation: string
  phonetic_pronunciation: string | null
  difficulty_level: DifficultyLevel
  word_type: WordType | null
  gender: Gender | null
  is_plural: boolean
  verb_tense: VerbTense | null
  context_sentence_spanish: string | null
  context_sentence_english: string | null
  usage_notes: string | null
  regional_variants: string[]
  formality_level: FormalityLevel
  frequency_rank: number | null
  is_user_selected: boolean
  is_mastered: boolean
  study_count: number
  correct_count: number
  last_studied_at: string | null
  mastered_at: string | null
  extraction_confidence: number
  ai_generated_metadata: Json
  user_notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface PhraseInsert {
  id?: string
  description_id: string
  session_id: string
  user_id: string
  category: PhraseCategory
  spanish_text: string
  english_translation: string
  phonetic_pronunciation?: string | null
  difficulty_level?: DifficultyLevel
  word_type?: WordType | null
  gender?: Gender | null
  is_plural?: boolean
  verb_tense?: VerbTense | null
  context_sentence_spanish?: string | null
  context_sentence_english?: string | null
  usage_notes?: string | null
  regional_variants?: string[]
  formality_level?: FormalityLevel
  frequency_rank?: number | null
  is_user_selected?: boolean
  is_mastered?: boolean
  study_count?: number
  correct_count?: number
  last_studied_at?: string | null
  mastered_at?: string | null
  extraction_confidence?: number
  ai_generated_metadata?: Json
  user_notes?: string | null
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface PhraseUpdate {
  id?: string
  description_id?: string
  session_id?: string
  user_id?: string
  category?: PhraseCategory
  spanish_text?: string
  english_translation?: string
  phonetic_pronunciation?: string | null
  difficulty_level?: DifficultyLevel
  word_type?: WordType | null
  gender?: Gender | null
  is_plural?: boolean
  verb_tense?: VerbTense | null
  context_sentence_spanish?: string | null
  context_sentence_english?: string | null
  usage_notes?: string | null
  regional_variants?: string[]
  formality_level?: FormalityLevel
  frequency_rank?: number | null
  is_user_selected?: boolean
  is_mastered?: boolean
  study_count?: number
  correct_count?: number
  last_studied_at?: string | null
  mastered_at?: string | null
  extraction_confidence?: number
  ai_generated_metadata?: Json
  user_notes?: string | null
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface UserProgress {
  id: string
  user_id: string
  progress_type: ProgressType
  progress_date: string
  skill_category: SkillCategory | null
  current_level: LearningLevel
  points_earned: number
  total_points: number
  sessions_completed: number
  descriptions_completed: number
  questions_answered: number
  questions_correct: number
  phrases_learned: number
  phrases_mastered: number
  time_spent_minutes: number
  accuracy_percentage: number
  consistency_score: number
  improvement_rate: number
  streak_days: number
  longest_streak: number
  achievements_unlocked: string[]
  skill_breakdown: Json
  learning_preferences: Json
  performance_metrics: Json
  goals_status: Json
  challenges_completed: string[]
  weak_areas: string[]
  strong_areas: string[]
  recommendations: Json
  metadata: Json
  created_at: string
  updated_at: string
}

export interface UserProgressInsert {
  id?: string
  user_id: string
  progress_type: ProgressType
  progress_date?: string
  skill_category?: SkillCategory | null
  current_level?: LearningLevel
  points_earned?: number
  total_points?: number
  sessions_completed?: number
  descriptions_completed?: number
  questions_answered?: number
  questions_correct?: number
  phrases_learned?: number
  phrases_mastered?: number
  time_spent_minutes?: number
  accuracy_percentage?: number
  consistency_score?: number
  improvement_rate?: number
  streak_days?: number
  longest_streak?: number
  achievements_unlocked?: string[]
  skill_breakdown?: Json
  learning_preferences?: Json
  performance_metrics?: Json
  goals_status?: Json
  challenges_completed?: string[]
  weak_areas?: string[]
  strong_areas?: string[]
  recommendations?: Json
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface UserProgressUpdate {
  id?: string
  user_id?: string
  progress_type?: ProgressType
  progress_date?: string
  skill_category?: SkillCategory | null
  current_level?: LearningLevel
  points_earned?: number
  total_points?: number
  sessions_completed?: number
  descriptions_completed?: number
  questions_answered?: number
  questions_correct?: number
  phrases_learned?: number
  phrases_mastered?: number
  time_spent_minutes?: number
  accuracy_percentage?: number
  consistency_score?: number
  improvement_rate?: number
  streak_days?: number
  longest_streak?: number
  achievements_unlocked?: string[]
  skill_breakdown?: Json
  learning_preferences?: Json
  performance_metrics?: Json
  goals_status?: Json
  challenges_completed?: string[]
  weak_areas?: string[]
  strong_areas?: string[]
  recommendations?: Json
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface ExportHistory {
  id: string
  user_id: string
  export_type: ExportType
  export_format: ExportFormat
  file_name: string
  file_size_bytes: number
  download_url: string | null
  export_status: ExportStatus
  date_range_start: string | null
  date_range_end: string | null
  filters_applied: Json
  include_personal_data: boolean
  include_progress_data: boolean
  include_content_data: boolean
  export_settings: Json
  processing_started_at: string | null
  processing_completed_at: string | null
  download_count: number
  first_downloaded_at: string | null
  last_downloaded_at: string | null
  expires_at: string
  error_message: string | null
  metadata: Json
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export interface ExportHistoryInsert {
  id?: string
  user_id: string
  export_type: ExportType
  export_format?: ExportFormat
  file_name: string
  file_size_bytes?: number
  download_url?: string | null
  export_status?: ExportStatus
  date_range_start?: string | null
  date_range_end?: string | null
  filters_applied?: Json
  include_personal_data?: boolean
  include_progress_data?: boolean
  include_content_data?: boolean
  export_settings?: Json
  processing_started_at?: string | null
  processing_completed_at?: string | null
  download_count?: number
  first_downloaded_at?: string | null
  last_downloaded_at?: string | null
  expires_at?: string
  error_message?: string | null
  metadata?: Json
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
  updated_at?: string
}

export interface ExportHistoryUpdate {
  id?: string
  user_id?: string
  export_type?: ExportType
  export_format?: ExportFormat
  file_name?: string
  file_size_bytes?: number
  download_url?: string | null
  export_status?: ExportStatus
  date_range_start?: string | null
  date_range_end?: string | null
  filters_applied?: Json
  include_personal_data?: boolean
  include_progress_data?: boolean
  include_content_data?: boolean
  export_settings?: Json
  processing_started_at?: string | null
  processing_completed_at?: string | null
  download_count?: number
  first_downloaded_at?: string | null
  last_downloaded_at?: string | null
  expires_at?: string
  error_message?: string | null
  metadata?: Json
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
  updated_at?: string
}

// Utility types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]

// Custom utility types for application logic
export interface UserWithProgress extends User {
  recent_progress?: UserProgress[]
  achievements?: string[]
  current_session?: Session
}

export interface SessionWithDetails extends Session {
  user?: User
  descriptions?: Description[]
  questions?: Question[]
  phrases?: Phrase[]
}

export interface DescriptionWithRelations extends Description {
  session?: Session
  image?: Image
  user?: User
  questions?: Question[]
  phrases?: Phrase[]
}

export interface ImageWithUsage extends Image {
  usage_stats?: {
    recent_usage: number
    success_rate: number
    avg_completion_time: number
  }
}

export interface LearningAnalytics {
  user_id: string
  overall_performance: {
    total_points: number
    accuracy_rate: number
    consistency_score: number
    improvement_trend: 'improving' | 'stable' | 'declining'
  }
  skill_breakdown: {
    vocabulary: number
    grammar: number
    comprehension: number
    translation: number
  }
  recent_activity: {
    sessions_last_week: number
    descriptions_completed: number
    new_phrases_learned: number
  }
  recommendations: {
    focus_areas: string[]
    suggested_difficulty: DifficultyLevel
    next_milestones: string[]
  }
}

// API Response types
export interface ApiResponse<T = any> {
  data: T | null
  error: string | null
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    has_more?: boolean
  }
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: {
    total: number
    page: number
    limit: number
    has_more: boolean
    pages: number
  }
}

// Configuration types
export interface DatabaseConfig {
  url: string
  apiKey: string
  schema?: string
  poolSize?: number
  ssl?: boolean
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  reminders: boolean
  weekly_reports: boolean
  achievement_alerts: boolean
  study_reminders: boolean
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: PreferredLanguage
  difficulty_preference?: DifficultyLevel
  session_length?: number
  daily_goal?: number
  preferred_styles?: DescriptionStyle[]
  notifications?: NotificationSettings
  privacy_settings?: {
    share_progress: boolean
    public_profile: boolean
    data_collection: boolean
  }
}

// Export the main database type for use with Supabase client
export type { Database as DatabaseSchema }