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
      descriptions: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          description_type: string
          tags: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          description_type: string
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          description_type?: string
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "descriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      export_history: {
        Row: {
          id: string
          user_id: string
          export_type: string
          file_name: string
          file_size: number | null
          export_format: string
          description_ids: string[] | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          export_type: string
          file_name: string
          file_size?: number | null
          export_format: string
          description_ids?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          export_type?: string
          file_name?: string
          file_size?: number | null
          export_format?: string
          description_ids?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      images: {
        Row: {
          id: string
          description_id: string
          url: string
          alt_text: string | null
          source: string | null
          width: number | null
          height: number | null
          file_size: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          description_id: string
          url: string
          alt_text?: string | null
          source?: string | null
          width?: number | null
          height?: number | null
          file_size?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          description_id?: string
          url?: string
          alt_text?: string | null
          source?: string | null
          width?: number | null
          height?: number | null
          file_size?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_description_id_fkey"
            columns: ["description_id"]
            referencedRelation: "descriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      phrases: {
        Row: {
          id: string
          description_id: string
          phrase: string
          phrase_type: string
          context: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          description_id: string
          phrase: string
          phrase_type: string
          context?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          description_id?: string
          phrase?: string
          phrase_type?: string
          context?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrases_description_id_fkey"
            columns: ["description_id"]
            referencedRelation: "descriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: string
          description_id: string
          question: string
          question_type: string
          answer: string | null
          context: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          description_id: string
          question: string
          question_type: string
          answer?: string | null
          context?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          description_id?: string
          question?: string
          question_type?: string
          answer?: string | null
          context?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_description_id_fkey"
            columns: ["description_id"]
            referencedRelation: "descriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          expires_at: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          expires_at: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          expires_at?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          openai_api_key: string | null
          unsplash_api_key: string | null
          claude_api_key: string | null
          google_api_key: string | null
          other_api_keys: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          openai_api_key?: string | null
          unsplash_api_key?: string | null
          claude_api_key?: string | null
          google_api_key?: string | null
          other_api_keys?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          openai_api_key?: string | null
          unsplash_api_key?: string | null
          claude_api_key?: string | null
          google_api_key?: string | null
          other_api_keys?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          total_descriptions: number
          total_images: number
          total_phrases: number
          total_questions: number
          total_exports: number
          last_activity: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_descriptions?: number
          total_images?: number
          total_phrases?: number
          total_questions?: number
          total_exports?: number
          last_activity?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_descriptions?: number
          total_images?: number
          total_phrases?: number
          total_questions?: number
          total_exports?: number
          last_activity?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          display_name: string | null
          avatar_url: string | null
          subscription_tier: string
          subscription_status: string
          subscription_end_date: string | null
          usage_limits: Json | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          display_name?: string | null
          avatar_url?: string | null
          subscription_tier?: string
          subscription_status?: string
          subscription_end_date?: string | null
          usage_limits?: Json | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          display_name?: string | null
          avatar_url?: string | null
          subscription_tier?: string
          subscription_status?: string
          subscription_end_date?: string | null
          usage_limits?: Json | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Description = Database['public']['Tables']['descriptions']['Row']
export type DescriptionInsert = Database['public']['Tables']['descriptions']['Insert']
export type DescriptionUpdate = Database['public']['Tables']['descriptions']['Update']

export type Image = Database['public']['Tables']['images']['Row']
export type ImageInsert = Database['public']['Tables']['images']['Insert']
export type ImageUpdate = Database['public']['Tables']['images']['Update']

export type Phrase = Database['public']['Tables']['phrases']['Row']
export type PhraseInsert = Database['public']['Tables']['phrases']['Insert']
export type PhraseUpdate = Database['public']['Tables']['phrases']['Update']

export type Question = Database['public']['Tables']['questions']['Row']
export type QuestionInsert = Database['public']['Tables']['questions']['Insert']
export type QuestionUpdate = Database['public']['Tables']['questions']['Update']

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

export type UserApiKeys = Database['public']['Tables']['user_api_keys']['Row']
export type UserApiKeysInsert = Database['public']['Tables']['user_api_keys']['Insert']
export type UserApiKeysUpdate = Database['public']['Tables']['user_api_keys']['Update']

export type UserProgress = Database['public']['Tables']['user_progress']['Row']
export type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert']
export type UserProgressUpdate = Database['public']['Tables']['user_progress']['Update']

export type ExportHistory = Database['public']['Tables']['export_history']['Row']
export type ExportHistoryInsert = Database['public']['Tables']['export_history']['Insert']
export type ExportHistoryUpdate = Database['public']['Tables']['export_history']['Update']

// Extended types with relationships
export type DescriptionWithRelations = Description & {
  images?: Image[]
  phrases?: Phrase[]
  questions?: Question[]
}

export type UserWithProfile = User & {
  user_api_keys?: UserApiKeys[]
  user_progress?: UserProgress[]
}

// Auth types
export interface AuthSession {
  access_token: string
  refresh_token?: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: User
}

export interface AuthError {
  message: string
  status?: number
}

// Real-time subscription types
export interface RealtimePayload<T = any> {
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  schema: string
  table: string
}

export interface SubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  table?: string
  filter?: string
}