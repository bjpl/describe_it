// Main entry point for Supabase client
// Export a single default client to prevent multiple instances
export { supabase as default, supabase } from './client'

// Export other utilities separately
export {
  createBrowserSupabaseClient,
  authHelpers,
  realtimeHelpers,
  dbHelpers,
  withErrorHandling,
} from './client'

export {
  createServerSupabaseClient,
  serverAuthHelpers,
  serverDbHelpers,
} from './server'

export {
  updateSession,
  getUserFromRequest,
  config as middlewareConfig,
} from './middleware'

export type {
  Database,
  User,
  UserInsert,
  UserUpdate,
  Description,
  DescriptionInsert,
  DescriptionUpdate,
  DescriptionWithRelations,
  Image,
  ImageInsert,
  ImageUpdate,
  Phrase,
  PhraseInsert,
  PhraseUpdate,
  Question,
  QuestionInsert,
  QuestionUpdate,
  Session,
  SessionInsert,
  SessionUpdate,
  UserApiKeys,
  UserApiKeysInsert,
  UserApiKeysUpdate,
  UserProgress,
  UserProgressInsert,
  UserProgressUpdate,
  ExportHistory,
  ExportHistoryInsert,
  ExportHistoryUpdate,
  UserWithProfile,
  AuthSession,
  AuthError,
  RealtimePayload,
  SubscriptionOptions,
} from './types'

// Export SupabaseClient type from client instead
export type { SupabaseClient } from './client'

// Re-export Supabase types for convenience
export type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'
export type { createBrowserClient, createServerClient } from '@supabase/ssr'