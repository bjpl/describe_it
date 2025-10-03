// Auto-generated Supabase types
// Generated on: 2025-10-02T22:19:00.000Z
// Project: arjrpdccaczbybbrchvc
// Schema: public

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          spanish_level: 'beginner' | 'intermediate' | 'advanced'
          is_authenticated: boolean
          profile_completed: boolean
          theme: 'light' | 'dark' | 'auto'
          language: 'en' | 'es'
          default_description_style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
          target_words_per_day: number
          preferred_difficulty: 'beginner' | 'intermediate' | 'advanced'
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
          spanish_level?: 'beginner' | 'intermediate' | 'advanced'
          is_authenticated?: boolean
          profile_completed?: boolean
          theme?: 'light' | 'dark' | 'auto'
          language?: 'en' | 'es'
          default_description_style?: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
          target_words_per_day?: number
          preferred_difficulty?: 'beginner' | 'intermediate' | 'advanced'
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
          spanish_level?: 'beginner' | 'intermediate' | 'advanced'
          is_authenticated?: boolean
          profile_completed?: boolean
          theme?: 'light' | 'dark' | 'auto'
          language?: 'en' | 'es'
          default_description_style?: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
          target_words_per_day?: number
          preferred_difficulty?: 'beginner' | 'intermediate' | 'advanced'
          enable_notifications?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string | null
          session_type: 'description' | 'qa' | 'vocabulary' | 'mixed'
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
          session_type: 'description' | 'qa' | 'vocabulary' | 'mixed'
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
          session_type?: 'description' | 'qa' | 'vocabulary' | 'mixed'
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
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: []
      }
      vocabulary_lists: {
        Row: {
          id: string
          name: string
          description: string | null
          category: 'basic' | 'intermediate' | 'advanced' | 'custom' | 'thematic'
          difficulty_level: number
          total_words: number
          is_active: boolean
          is_public: boolean
          created_by: string | null
          shared_with: string[] | null
          completion_rate: number
          average_mastery: number
          tags: string[] | null
          source_url: string | null
          language_pair: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: 'basic' | 'intermediate' | 'advanced' | 'custom' | 'thematic'
          difficulty_level?: number
          total_words?: number
          is_active?: boolean
          is_public?: boolean
          created_by?: string | null
          shared_with?: string[] | null
          completion_rate?: number
          average_mastery?: number
          tags?: string[] | null
          source_url?: string | null
          language_pair?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: 'basic' | 'intermediate' | 'advanced' | 'custom' | 'thematic'
          difficulty_level?: number
          total_words?: number
          is_active?: boolean
          is_public?: boolean
          created_by?: string | null
          shared_with?: string[] | null
          completion_rate?: number
          average_mastery?: number
          tags?: string[] | null
          source_url?: string | null
          language_pair?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vocabulary_lists_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      vocabulary_items: {
        Row: {
          id: string
          vocabulary_list_id: string | null
          spanish_text: string
          english_translation: string
          part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'pronoun' | 'conjunction' | 'interjection' | 'other'
          difficulty_level: 'beginner' | 'intermediate' | 'advanced'
          gender: 'masculino' | 'femenino' | 'neutro' | null
          article: string | null
          plural_form: string | null
          conjugation_info: Json | null
          category: string | null
          subcategory: string | null
          context_sentence_spanish: string | null
          context_sentence_english: string | null
          pronunciation_ipa: string | null
          pronunciation_audio_url: string | null
          syllable_count: number | null
          stress_pattern: string | null
          usage_notes: string | null
          frequency_score: number
          commonality_rank: number | null
          register: string
          synonyms: string[] | null
          antonyms: string[] | null
          related_words: string[] | null
          word_family: string[] | null
          memory_hints: string[] | null
          cultural_notes: string | null
          false_friends: string[] | null
          associated_image_urls: string[] | null
          emoji_representation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          vocabulary_list_id?: string | null
          spanish_text: string
          english_translation: string
          part_of_speech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'pronoun' | 'conjunction' | 'interjection' | 'other'
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
          gender?: 'masculino' | 'femenino' | 'neutro' | null
          article?: string | null
          plural_form?: string | null
          conjugation_info?: Json | null
          category?: string | null
          subcategory?: string | null
          context_sentence_spanish?: string | null
          context_sentence_english?: string | null
          pronunciation_ipa?: string | null
          pronunciation_audio_url?: string | null
          syllable_count?: number | null
          stress_pattern?: string | null
          usage_notes?: string | null
          frequency_score?: number
          commonality_rank?: number | null
          register?: string
          synonyms?: string[] | null
          antonyms?: string[] | null
          related_words?: string[] | null
          word_family?: string[] | null
          memory_hints?: string[] | null
          cultural_notes?: string | null
          false_friends?: string[] | null
          associated_image_urls?: string[] | null
          emoji_representation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          vocabulary_list_id?: string | null
          spanish_text?: string
          english_translation?: string
          part_of_speech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'pronoun' | 'conjunction' | 'interjection' | 'other'
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
          gender?: 'masculino' | 'femenino' | 'neutro' | null
          article?: string | null
          plural_form?: string | null
          conjugation_info?: Json | null
          category?: string | null
          subcategory?: string | null
          context_sentence_spanish?: string | null
          context_sentence_english?: string | null
          pronunciation_ipa?: string | null
          pronunciation_audio_url?: string | null
          syllable_count?: number | null
          stress_pattern?: string | null
          usage_notes?: string | null
          frequency_score?: number
          commonality_rank?: number | null
          register?: string
          synonyms?: string[] | null
          antonyms?: string[] | null
          related_words?: string[] | null
          word_family?: string[] | null
          memory_hints?: string[] | null
          cultural_notes?: string | null
          false_friends?: string[] | null
          associated_image_urls?: string[] | null
          emoji_representation?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vocabulary_items_vocabulary_list_id_fkey'
            columns: ['vocabulary_list_id']
            isOneToOne: false
            referencedRelation: 'vocabulary_lists'
            referencedColumns: ['id']
          }
        ]
      }
      learning_progress: {
        Row: {
          id: string
          user_id: string
          vocabulary_item_id: string
          session_id: string | null
          mastery_level: number
          review_count: number
          correct_count: number
          incorrect_count: number
          streak_count: number
          last_reviewed: string | null
          next_review: string | null
          first_learned: string
          difficulty_adjustment: number
          learning_phase: 'new' | 'learning' | 'review' | 'mastered'
          confidence_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vocabulary_item_id: string
          session_id?: string | null
          mastery_level?: number
          review_count?: number
          correct_count?: number
          incorrect_count?: number
          streak_count?: number
          last_reviewed?: string | null
          next_review?: string | null
          first_learned?: string
          difficulty_adjustment?: number
          learning_phase?: 'new' | 'learning' | 'review' | 'mastered'
          confidence_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vocabulary_item_id?: string
          session_id?: string | null
          mastery_level?: number
          review_count?: number
          correct_count?: number
          incorrect_count?: number
          streak_count?: number
          last_reviewed?: string | null
          next_review?: string | null
          first_learned?: string
          difficulty_adjustment?: number
          learning_phase?: 'new' | 'learning' | 'review' | 'mastered'
          confidence_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'learning_progress_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'learning_progress_vocabulary_item_id_fkey'
            columns: ['vocabulary_item_id']
            isOneToOne: false
            referencedRelation: 'vocabulary_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'learning_progress_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      descriptions: {
        Row: {
          id: string
          session_id: string | null
          image_id: string | null
          user_id: string | null
          description_spanish: string
          description_english: string | null
          style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
          word_count: number
          complexity_score: number
          key_vocabulary: string[] | null
          grammar_points: string[] | null
          cultural_references: string[] | null
          is_completed: boolean
          completion_time_seconds: number | null
          user_rating: number | null
          feedback_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          image_id?: string | null
          user_id?: string | null
          description_spanish: string
          description_english?: string | null
          style?: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
          word_count?: number
          complexity_score?: number
          key_vocabulary?: string[] | null
          grammar_points?: string[] | null
          cultural_references?: string[] | null
          is_completed?: boolean
          completion_time_seconds?: number | null
          user_rating?: number | null
          feedback_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          image_id?: string | null
          user_id?: string | null
          description_spanish?: string
          description_english?: string | null
          style?: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
          word_count?: number
          complexity_score?: number
          key_vocabulary?: string[] | null
          grammar_points?: string[] | null
          cultural_references?: string[] | null
          is_completed?: boolean
          completion_time_seconds?: number | null
          user_rating?: number | null
          feedback_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'descriptions_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'descriptions_image_id_fkey'
            columns: ['image_id']
            isOneToOne: false
            referencedRelation: 'images'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'descriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      questions: {
        Row: {
          id: string
          description_id: string | null
          session_id: string | null
          question_spanish: string
          question_english: string | null
          correct_answer_spanish: string
          correct_answer_english: string | null
          incorrect_answers: string[] | null
          question_type: string
          difficulty: 'facil' | 'medio' | 'dificil'
          grammar_focus: string | null
          vocabulary_focus: string[] | null
          explanation_spanish: string | null
          explanation_english: string | null
          hints: string[] | null
          time_limit_seconds: number | null
          points_value: number
          created_at: string
        }
        Insert: {
          id?: string
          description_id?: string | null
          session_id?: string | null
          question_spanish: string
          question_english?: string | null
          correct_answer_spanish: string
          correct_answer_english?: string | null
          incorrect_answers?: string[] | null
          question_type?: string
          difficulty?: 'facil' | 'medio' | 'dificil'
          grammar_focus?: string | null
          vocabulary_focus?: string[] | null
          explanation_spanish?: string | null
          explanation_english?: string | null
          hints?: string[] | null
          time_limit_seconds?: number | null
          points_value?: number
          created_at?: string
        }
        Update: {
          id?: string
          description_id?: string | null
          session_id?: string | null
          question_spanish?: string
          question_english?: string | null
          correct_answer_spanish?: string
          correct_answer_english?: string | null
          incorrect_answers?: string[] | null
          question_type?: string
          difficulty?: 'facil' | 'medio' | 'dificil'
          grammar_focus?: string | null
          vocabulary_focus?: string[] | null
          explanation_spanish?: string | null
          explanation_english?: string | null
          hints?: string[] | null
          time_limit_seconds?: number | null
          points_value?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'questions_description_id_fkey'
            columns: ['description_id']
            isOneToOne: false
            referencedRelation: 'descriptions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'questions_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      answers: {
        Row: {
          id: string
          user_id: string
          question_id: string
          session_id: string | null
          user_answer: string
          is_correct: boolean
          time_taken_seconds: number | null
          confidence_rating: number | null
          points_earned: number
          hints_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          session_id?: string | null
          user_answer: string
          is_correct?: boolean
          time_taken_seconds?: number | null
          confidence_rating?: number | null
          points_earned?: number
          hints_used?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          session_id?: string | null
          user_answer?: string
          is_correct?: boolean
          time_taken_seconds?: number | null
          confidence_rating?: number | null
          points_earned?: number
          hints_used?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'answers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'answers_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'answers_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      phrases: {
        Row: {
          id: string
          user_id: string
          description_id: string | null
          session_id: string | null
          phrase_spanish: string
          phrase_english: string | null
          context: string | null
          category: string | null
          difficulty_level: 'beginner' | 'intermediate' | 'advanced'
          is_mastered: boolean
          review_count: number
          last_reviewed: string | null
          mastery_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description_id?: string | null
          session_id?: string | null
          phrase_spanish: string
          phrase_english?: string | null
          context?: string | null
          category?: string | null
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
          is_mastered?: boolean
          review_count?: number
          last_reviewed?: string | null
          mastery_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description_id?: string | null
          session_id?: string | null
          phrase_spanish?: string
          phrase_english?: string | null
          context?: string | null
          category?: string | null
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
          is_mastered?: boolean
          review_count?: number
          last_reviewed?: string | null
          mastery_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'phrases_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'phrases_description_id_fkey'
            columns: ['description_id']
            isOneToOne: false
            referencedRelation: 'descriptions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'phrases_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      spanish_level: 'beginner' | 'intermediate' | 'advanced'
      session_type: 'description' | 'qa' | 'vocabulary' | 'mixed'
      description_style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'
      part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'pronoun' | 'conjunction' | 'interjection' | 'other'
      difficulty_level: 'beginner' | 'intermediate' | 'advanced'
      learning_phase: 'new' | 'learning' | 'review' | 'mastered'
      qa_difficulty: 'facil' | 'medio' | 'dificil'
      vocabulary_category: 'basic' | 'intermediate' | 'advanced' | 'custom' | 'thematic'
      spanish_gender: 'masculino' | 'femenino' | 'neutro'
      theme_preference: 'light' | 'dark' | 'auto'
      language_preference: 'en' | 'es'
      export_format: 'json' | 'csv' | 'pdf'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for table access
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
      Database['public']['Views'])
  ? (Database['public']['Tables'] &
      Database['public']['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
  ? Database['public']['Enums'][PublicEnumNameOrOptions]
  : never
