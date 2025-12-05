/**
 * Core Domain Entities - Single Source of Truth
 *
 * These types represent the core business entities of the application.
 * All database tables and UI components should use these as the canonical reference.
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ENUMS AND UNION TYPES
// ============================================================================

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type DifficultyNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type DescriptionStyle =
  | 'narrativo'
  | 'poetico'
  | 'academico'
  | 'conversacional'
  | 'infantil';

export type LanguageCode = 'en' | 'es' | 'english' | 'spanish';

export type SessionType =
  | 'practice'
  | 'flashcards'
  | 'quiz'
  | 'matching'
  | 'writing';

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export type QuestionType =
  | 'factual'
  | 'inferential'
  | 'evaluative'
  | 'creative';

export type QADifficulty = 'easy' | 'medium' | 'hard';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'article'
  | 'pronoun'
  | 'other';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type SubscriptionStatus = 'free' | 'premium' | 'trial';
export type LearningPhase = 'new' | 'learning' | 'review' | 'mastered';

// ============================================================================
// USER ENTITY
// ============================================================================

export interface User extends BaseEntity {
  email?: string;
  full_name?: string;
  avatar_url?: string;
  learning_level: DifficultyLevel;
  subscription_status: SubscriptionStatus;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_at?: string;
}

export interface UserSettings extends BaseEntity {
  user_id: string;
  language_level: DifficultyLevel;
  daily_goal: number;
  reminder_enabled: boolean;
  reminder_time: string;
  theme_preference: ThemePreference;
  language_preference: LanguageCode;
  default_description_style: DescriptionStyle;
  auto_save: boolean;
  notifications: boolean;
  max_history_items: number;
}

// ============================================================================
// IMAGE ENTITY
// ============================================================================

export interface ImageEntity extends BaseEntity {
  unsplash_id: string;
  url: string;
  urls?: {
    raw?: string;
    small: string;
    regular: string;
    full: string;
    thumb?: string;
    small_s3?: string;
  };
  alt_description?: string;
  description?: string;
  width: number;
  height: number;
  color?: string;
  likes: number;
  photographer: string;
  photographer_url?: string;
  photographer_username?: string;
}

// ============================================================================
// DESCRIPTION ENTITY
// ============================================================================

export interface Description extends BaseEntity {
  image_id: string;
  image_url?: string;
  user_id?: string;
  style: DescriptionStyle;
  content_spanish: string;
  content_english: string;
  difficulty_level: DifficultyLevel;
  is_completed?: boolean;
  completed_at?: string;
  completion_time_seconds?: number;
  user_rating?: number;
}

// ============================================================================
// VOCABULARY ENTITY
// ============================================================================

export interface VocabularyItem extends BaseEntity {
  user_id?: string;
  vocabulary_list_id?: string;
  list_id?: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: DifficultyNumber;
  part_of_speech: PartOfSpeech;
  frequency_score?: number;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  phonetic_pronunciation?: string;
  pronunciation_ipa?: string;
  audio_url?: string;
  // Extended fields
  gender?: string;
  article?: string;
  plural_form?: string;
  conjugation_info?: Record<string, any>;
  subcategory?: string;
  syllable_count?: number;
  stress_pattern?: string;
  usage_notes?: string;
  commonality_rank?: number;
  register?: string;
  synonyms?: string[];
  antonyms?: string[];
  related_words?: string[];
  word_family?: string[];
  memory_hints?: string[];
  cultural_notes?: string;
  false_friends?: string[];
  associated_image_urls?: string[];
  emoji_representation?: string;
  // User progress fields
  user_notes?: string;
  mastery_level?: number;
  last_reviewed?: string;
  review_count?: number;
}

export interface VocabularyList extends BaseEntity {
  user_id: string;
  name: string;
  description?: string;
  category?: string;
  item_count: number;
}

// More entity definitions...
