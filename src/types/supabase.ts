/**
 * MANUAL SUPABASE TYPES
 *
 * This file was manually created from the database migration schemas
 * until the Supabase CLI access token can be obtained.
 *
 * To regenerate from actual database:
 * 1. Get access token from: https://supabase.com/dashboard/account/tokens
 * 2. Run: node scripts/generate-supabase-types.js
 *
 * Source: docs/safe-migration-001-complete.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// DATABASE ENUMS
// ============================================

export type SpanishLevel = 'beginner' | 'intermediate' | 'advanced'
export type SessionType = 'description' | 'qa' | 'vocabulary' | 'mixed'
export type DescriptionStyle = 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'pronoun' | 'conjunction' | 'interjection' | 'other'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type LearningPhase = 'new' | 'learning' | 'review' | 'mastered'
export type QaDifficulty = 'facil' | 'medio' | 'dificil'
export type VocabularyCategory = 'basic' | 'intermediate' | 'advanced' | 'custom' | 'thematic'
export type SpanishGender = 'masculino' | 'femenino' | 'neutro'
export type ThemePreference = 'light' | 'dark' | 'auto'
export type LanguagePreference = 'en' | 'es'
export type ExportFormat = 'json' | 'csv' | 'pdf'

// ============================================
// DATABASE TABLES
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          spanish_level: SpanishLevel
          is_authenticated: boolean
          profile_completed: boolean
          theme: ThemePreference
          language: LanguagePreference
          default_description_style: DescriptionStyle
          target_words_per_day: number
          preferred_difficulty: DifficultyLevel
          enable_notifications: boolean
          created_at: string
          updated_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          email: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          spanish_level?: SpanishLevel
          is_authenticated?: boolean
          profile_completed?: boolean
          theme?: ThemePreference
          language?: LanguagePreference
          default_description_style?: DescriptionStyle
          target_words_per_day?: number
          preferred_difficulty?: DifficultyLevel
          enable_notifications?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          spanish_level?: SpanishLevel
          is_authenticated?: boolean
          profile_completed?: boolean
          theme?: ThemePreference
          language?: LanguagePreference
          default_description_style?: DescriptionStyle
          target_words_per_day?: number
          preferred_difficulty?: DifficultyLevel
          enable_notifications?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string | null
          session_type: SessionType
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          images_processed: number
          descriptions_generated: number
          qa_attempts: number
          qa_correct: number
          vocabulary_learned: number
          phrases_saved: number
          session_data: Json
          user_agent: string | null
          ip_address: string | null
          device_type: string | null
          engagement_score: number
          completion_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_type: SessionType
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          images_processed?: number
          descriptions_generated?: number
          qa_attempts?: number
          qa_correct?: number
          vocabulary_learned?: number
          phrases_saved?: number
          session_data?: Json
          user_agent?: string | null
          ip_address?: string | null
          device_type?: string | null
          engagement_score?: number
          completion_rate?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_type?: SessionType
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          images_processed?: number
          descriptions_generated?: number
          qa_attempts?: number
          qa_correct?: number
          vocabulary_learned?: number
          phrases_saved?: number
          session_data?: Json
          user_agent?: string | null
          ip_address?: string | null
          device_type?: string | null
          engagement_score?: number
          completion_rate?: number
          created_at?: string
        }
      }
      images: {
        Row: {
          id: string
          unsplash_id: string | null
          url: string
          thumbnail_url: string | null
          description: string | null
          alt_description: string | null
          width: number | null
          height: number | null
          color: string | null
          aspect_ratio: number | null
          photographer_name: string | null
          photographer_username: string | null
          photographer_url: string | null
          usage_count: number
          last_used: string | null
          is_suitable_for_learning: boolean
          content_rating: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unsplash_id?: string | null
          url: string
          thumbnail_url?: string | null
          description?: string | null
          alt_description?: string | null
          width?: number | null
          height?: number | null
          color?: string | null
          aspect_ratio?: number | null
          photographer_name?: string | null
          photographer_username?: string | null
          photographer_url?: string | null
          usage_count?: number
          last_used?: string | null
          is_suitable_for_learning?: boolean
          content_rating?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unsplash_id?: string | null
          url?: string
          thumbnail_url?: string | null
          description?: string | null
          alt_description?: string | null
          width?: number | null
          height?: number | null
          color?: string | null
          aspect_ratio?: number | null
          photographer_name?: string | null
          photographer_username?: string | null
          photographer_url?: string | null
          usage_count?: number
          last_used?: string | null
          is_suitable_for_learning?: boolean
          content_rating?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      spanish_level: SpanishLevel
      session_type: SessionType
      description_style: DescriptionStyle
      part_of_speech: PartOfSpeech
      difficulty_level: DifficultyLevel
      learning_phase: LearningPhase
      qa_difficulty: QaDifficulty
      vocabulary_category: VocabularyCategory
      spanish_gender: SpanishGender
      theme_preference: ThemePreference
      language_preference: LanguagePreference
      export_format: ExportFormat
    }
  }
}

// ============================================
// HELPER TYPES
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Convenience exports
export type User = Tables<'users'>
export type Session = Tables<'sessions'>
export type Image = Tables<'images'>
