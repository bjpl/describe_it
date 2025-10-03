// Re-export generated types from database.generated.ts
export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums } from '../../types/database.generated'
import type { Database } from '../../types/database.generated'

// Convenience type exports based on the actual schema
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

export type LearningProgress = Database['public']['Tables']['learning_progress']['Row']
export type LearningProgressInsert = Database['public']['Tables']['learning_progress']['Insert']
export type LearningProgressUpdate = Database['public']['Tables']['learning_progress']['Update']

export type VocabularyList = Database['public']['Tables']['vocabulary_lists']['Row']
export type VocabularyListInsert = Database['public']['Tables']['vocabulary_lists']['Insert']
export type VocabularyListUpdate = Database['public']['Tables']['vocabulary_lists']['Update']

export type VocabularyItem = Database['public']['Tables']['vocabulary_items']['Row']
export type VocabularyItemInsert = Database['public']['Tables']['vocabulary_items']['Insert']
export type VocabularyItemUpdate = Database['public']['Tables']['vocabulary_items']['Update']

export type Answer = Database['public']['Tables']['answers']['Row']
export type AnswerInsert = Database['public']['Tables']['answers']['Insert']
export type AnswerUpdate = Database['public']['Tables']['answers']['Update']

// ========================================
// LEGACY TYPE ALIASES - FOR BACKWARD COMPATIBILITY ONLY
// ========================================
// WARNING: These types reference tables that DO NOT exist in the current Supabase schema
// TODO: Either create these tables or migrate to existing tables (learning_progress, etc.)

/**
 * @deprecated user_api_keys table does not exist in current schema
 * API keys are currently stored in localStorage only
 * Consider adding these fields to the users table or creating the user_api_keys table
 */
export type UserApiKeys = { openai_api_key?: string | null; unsplash_api_key?: string | null }
export type UserApiKeysInsert = UserApiKeys
export type UserApiKeysUpdate = UserApiKeys

/**
 * @deprecated user_progress table does not exist in current schema
 * Use LearningProgress type instead, which maps to the learning_progress table
 */
export type UserProgress = { user_id: string; total_descriptions?: number; total_images?: number }
export type UserProgressInsert = UserProgress
export type UserProgressUpdate = Partial<UserProgress>

/**
 * @deprecated export_history table does not exist in current schema
 * This table needs to be created if export history tracking is required
 */
export type ExportHistory = { id: string; user_id: string; export_type: string; created_at: string }
export type ExportHistoryInsert = Omit<ExportHistory, 'id' | 'created_at'>
export type ExportHistoryUpdate = Partial<ExportHistory>

// Extended types with relationships
export type DescriptionWithRelations = Description & {
  images?: Image[]
  phrases?: Phrase[]
  questions?: Question[]
}

/**
 * @deprecated UserWithProfile includes references to non-existent tables
 * user_api_keys and user_progress tables do not exist
 * Use User type directly and load API keys from localStorage
 * Use LearningProgress for progress tracking
 */
export type UserWithProfile = User & {
  user_api_keys?: UserApiKeys[] // WARNING: Table does not exist
  user_progress?: UserProgress[] // WARNING: Table does not exist - use learning_progress instead
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