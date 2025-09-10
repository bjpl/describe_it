// Main entry point for Supabase client
export {
  default as supabase,
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
  SupabaseClient,
} from './types'

// Re-export Supabase types for convenience
export type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'
export type { createBrowserClient, createServerClient } from '@supabase/ssr'