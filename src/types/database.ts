// Database Types and Interfaces

export interface DatabaseUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  preferences: UserPreferences | null;
  subscription_tier: 'free' | 'premium' | 'pro';
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  daily_goal_points: number;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  auto_play_pronunciation: boolean;
  preferred_description_length: 'short' | 'medium' | 'detailed';
  spaced_repetition_enabled: boolean;
}

export interface Phrase {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: PhraseCategory;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  word_type: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'expression' | null;
  formality_level: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
  phonetic_pronunciation: string | null;
  usage_notes: string | null;
  context_sentence_spanish: string | null;
  context_sentence_english: string | null;
  
  // Study tracking
  is_user_selected: boolean;
  is_mastered: boolean;
  study_count: number;
  correct_count: number;
  last_studied_at: string | null;
  
  // Spaced repetition
  easiness_factor: number;
  repetition_number: number;
  inter_repetition_interval: number;
  next_review_date: string | null;
  
  // User data
  user_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PhraseCategory = 
  | 'vocabulary'
  | 'expression' 
  | 'idiom'
  | 'phrase'
  | 'grammar_pattern'
  | 'verb_conjugation'
  | 'cultural_reference';

export interface LearningSession {
  id: string;
  user_id: string;
  session_type: 'description' | 'vocabulary_review' | 'spaced_repetition' | 'practice';
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  
  // Performance metrics
  total_questions: number;
  correct_answers: number;
  points_earned: number;
  accuracy_percentage: number;
  
  // Content
  image_id: string | null;
  phrases_studied: string[]; // Array of phrase IDs
  description_generated: string | null;
  
  // Session data
  session_data: Record<string, any>;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  
  // Overall stats
  total_points: number;
  total_sessions: number;
  total_study_time_minutes: number;
  phrases_learned_count: number;
  phrases_mastered_count: number;
  
  // Streaks
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  
  // Performance
  overall_accuracy: number;
  improvement_trend: 'improving' | 'stable' | 'declining';
  skill_breakdown: Record<string, number>; // skill -> proficiency score
  
  // Achievements
  achievements_unlocked: string[];
  badges_earned: string[];
  milestones_reached: string[];
  
  // Weekly/Monthly stats
  this_week_stats: WeeklyStats;
  this_month_stats: MonthlyStats;
  
  created_at: string;
  updated_at: string;
}

export interface WeeklyStats {
  sessions_completed: number;
  points_earned: number;
  accuracy_percentage: number;
  study_time_minutes: number;
  new_phrases_learned: number;
  phrases_reviewed: number;
}

export interface MonthlyStats {
  sessions_completed: number;
  points_earned: number;
  accuracy_percentage: number;
  study_time_minutes: number;
  new_phrases_learned: number;
  phrases_mastered: number;
  best_streak_days: number;
}

export interface SpacedRepetitionCard {
  id: string;
  user_id: string;
  phrase_id: string;
  
  // SM-2 Algorithm fields
  easiness_factor: number; // E-Factor (2.5 default)
  repetition_number: number; // n
  inter_repetition_interval: number; // I(n) in days
  next_review_date: string;
  
  // Review history
  last_reviewed_at: string | null;
  total_reviews: number;
  consecutive_correct: number;
  
  // Performance tracking
  average_response_time: number; // in seconds
  difficulty_rating: number; // 1-5 scale
  retention_strength: number; // calculated retention probability
  
  // Status
  is_due_for_review: boolean;
  is_new_card: boolean;
  is_learning: boolean;
  is_mature: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface ReviewResponse {
  id: string;
  card_id: string;
  user_id: string;
  session_id: string;
  
  // Response data
  response_quality: number; // 0-4 scale (SM-2)
  response_time_seconds: number;
  was_correct: boolean;
  
  // Context
  review_type: 'new' | 'learning' | 'review';
  previous_interval: number;
  new_interval: number;
  previous_easiness: number;
  new_easiness: number;
  
  created_at: string;
}

export interface ImageDescription {
  id: string;
  user_id: string;
  image_url: string;
  image_source: 'unsplash' | 'upload' | 'url';
  unsplash_id: string | null;
  
  // Descriptions
  description_spanish: string;
  description_english: string;
  description_length: 'short' | 'medium' | 'detailed';
  
  // Analysis data
  extracted_phrases: string[]; // Array of phrase IDs
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  topics_covered: string[];
  grammar_patterns: string[];
  
  // Generation metadata
  ai_model_used: string;
  generation_time_ms: number;
  confidence_score: number;
  
  // User interaction
  user_rating: number | null; // 1-5 stars
  user_notes: string | null;
  is_favorite: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface UnsplashImage {
  id: string;
  created_at: string;
  updated_at: string;
  promoted_at: string | null;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  categories: string[];
  likes: number;
  liked_by_user: boolean;
  current_user_collections: any[];
  sponsorship: any;
  topic_submissions: Record<string, any>;
  user: {
    id: string;
    updated_at: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string | null;
    twitter_username: string | null;
    portfolio_url: string | null;
    bio: string | null;
    location: string | null;
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
      following: string;
      followers: string;
    };
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    instagram_username: string | null;
    total_collections: number;
    total_likes: number;
    total_photos: number;
    accepted_tos: boolean;
    for_hire: boolean;
    social: {
      instagram_username: string | null;
      portfolio_url: string | null;
      twitter_username: string | null;
    };
  };
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  message?: string;
}

// Hook return types
export interface UsePhrasesResult {
  phrases: Phrase[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseProgressResult {
  progress: UserProgress | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseReviewSessionResult {
  session: {
    id: string;
    cards_due: SpacedRepetitionCard[];
    total_due: number;
    new_cards: number;
    learning_cards: number;
    review_cards: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Form types
export interface CreatePhraseForm {
  spanish_text: string;
  english_translation: string;
  category: PhraseCategory;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  word_type?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'expression';
  formality_level?: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
  phonetic_pronunciation?: string;
  usage_notes?: string;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  user_notes?: string;
}

export interface UpdatePhraseForm extends Partial<CreatePhraseForm> {
  id: string;
}

export interface ProcessReviewForm {
  phrase_id: string;
  response_quality: number; // 0-4
  response_time_seconds: number;
}

// Error types
export interface DatabaseError {
  message: string;
  code?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Component prop types
export interface PhrasesFilterOptions {
  category?: PhraseCategory | 'all';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  isUserSelected?: boolean;
  isMastered?: boolean;
  search_query?: string;
  limit?: number;
  offset?: number;
}

export interface ProgressStatsOptions {
  timeframe?: 'week' | 'month' | 'year' | 'all';
  include_analytics?: boolean;
}