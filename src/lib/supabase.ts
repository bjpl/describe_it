import { createClient } from '@supabase/supabase-js';
import { DatabaseService, createDatabaseService } from './services/database';
import type { Database } from '../types/database';

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Some features may not work correctly.');
}

// Client for browser/frontend use (uses anon key with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Enhanced database service instance with connection pooling and error handling
export const databaseService = createDatabaseService(
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey
);

// Database table types
export interface User {
  id: string
  email: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  spanish_level: 'beginner' | 'intermediate' | 'advanced'
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  session_type: 'description' | 'qa' | 'vocabulary' | 'mixed'
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  images_processed: number
  descriptions_generated: number
  qa_attempts: number
  qa_correct: number
  vocabulary_learned: number
  session_data: any
  created_at: string
}

export interface VocabularyList {
  id: string
  name: string
  description: string | null
  category: 'basic' | 'intermediate' | 'advanced' | 'custom'
  difficulty_level: number
  total_words: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VocabularyItem {
  id: string
  vocabulary_list_id: string
  spanish_text: string
  english_translation: string
  part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'other'
  difficulty_level: number
  category: string
  context_sentence_spanish: string | null
  context_sentence_english: string | null
  pronunciation_ipa: string | null
  usage_notes: string | null
  frequency_score: number | null
  created_at: string
}

export interface LearningProgress {
  id: string
  user_id: string
  vocabulary_item_id: string
  session_id: string | null
  mastery_level: number // 0-100
  review_count: number
  correct_count: number
  last_reviewed: string | null
  next_review: string | null
  difficulty_adjustment: number
  learning_phase: 'new' | 'learning' | 'review' | 'mastered'
  created_at: string
  updated_at: string
}

export interface SavedDescription {
  id: string
  user_id: string | null
  session_id: string | null
  image_id: string
  image_url: string
  english_description: string
  spanish_description: string
  description_style: 'conversacional' | 'académico' | 'creativo' | 'técnico' | 'narrativo'
  generated_vocabulary: any[]
  qa_pairs: any[]
  is_favorite: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

// Legacy DatabaseService class - now uses the enhanced service internally
export class DatabaseService {
  // Test connection
  static async testConnection(): Promise<boolean> {
    try {
      return await databaseService.testConnection();
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // User operations
  static async createUser(userData: Partial<User>): Promise<User | null> {
    const result = await databaseService.createUser(userData);
    return result.success ? result.data : null;
  }

  static async getUser(userId: string): Promise<User | null> {
    const result = await databaseService.getUser(userId);
    return result.success ? result.data : null;
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const result = await databaseService.updateUser(userId, updates);
    return result.success ? result.data : null;
  }

  // Session operations
  static async createSession(sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session | null> {
    const result = await databaseService.createSession(sessionData);
    return result.success ? result.data : null;
  }

  static async endSession(sessionId: string, endData: Partial<Session>): Promise<Session | null> {
    const result = await databaseService.endSession(sessionId, endData);
    return result.success ? result.data : null;
  }

  static async getUserSessions(userId: string, limit: number = 10): Promise<Session[]> {
    const result = await databaseService.getUserSessions(userId, { limit });
    return result.success ? result.data || [] : [];
  }

  // Vocabulary operations
  static async getVocabularyLists(): Promise<VocabularyList[]> {
    const result = await databaseService.getVocabularyLists();
    return result.success ? result.data || [] : [];
  }

  static async createVocabularyList(listData: Omit<VocabularyList, 'id' | 'created_at' | 'updated_at'>): Promise<VocabularyList | null> {
    const result = await databaseService.createVocabularyList(listData);
    return result.success ? result.data : null;
  }

  static async getVocabularyItems(listId: string): Promise<VocabularyItem[]> {
    const result = await databaseService.getVocabularyItems(listId);
    return result.success ? result.data || [] : [];
  }

  static async addVocabularyItem(itemData: Omit<VocabularyItem, 'id' | 'created_at'>): Promise<VocabularyItem | null> {
    const result = await databaseService.addVocabularyItem(itemData);
    return result.success ? result.data : null;
  }

  // Learning progress operations
  static async updateLearningProgress(
    userId: string,
    vocabularyItemId: string,
    progressData: Partial<LearningProgress>
  ): Promise<LearningProgress | null> {
    const result = await databaseService.updateLearningProgress(userId, vocabularyItemId, progressData);
    return result.success ? result.data : null;
  }

  static async getLearningProgress(userId: string, limit: number = 50): Promise<LearningProgress[]> {
    const result = await databaseService.getLearningProgress(userId, { limit });
    return result.success ? result.data || [] : [];
  }

  // Saved descriptions operations
  static async saveDescription(descriptionData: Omit<SavedDescription, 'id' | 'created_at' | 'updated_at'>): Promise<SavedDescription | null> {
    const result = await databaseService.saveDescription(descriptionData);
    return result.success ? result.data : null;
  }

  static async getSavedDescriptions(userId?: string, limit: number = 20): Promise<SavedDescription[]> {
    const result = await databaseService.getSavedDescriptions(userId, { limit });
    return result.success ? result.data || [] : [];
  }

  static async toggleFavoriteDescription(descriptionId: string, isFavorite: boolean): Promise<boolean> {
    const result = await databaseService.toggleFavoriteDescription(descriptionId, isFavorite);
    return result.success;
  }

  // Enhanced methods using the new service
  static async searchVocabulary(
    searchTerm: string,
    filters: any = {},
    options: any = {}
  ): Promise<VocabularyItem[]> {
    const result = await databaseService.searchVocabulary(searchTerm, filters, options);
    return result.success ? result.data || [] : [];
  }

  static async getUserAnalytics(userId: string, dateRange: { start: string; end: string }): Promise<any> {
    const result = await databaseService.getUserAnalytics(userId, dateRange);
    return result.success ? result.data : null;
  }

  static async saveQAResponse(responseData: Partial<QAResponse>): Promise<QAResponse | null> {
    const result = await databaseService.saveQAResponse(responseData);
    return result.success ? result.data : null;
  }

  static async getQAResponses(userId?: string, options: any = {}): Promise<QAResponse[]> {
    const result = await databaseService.getQAResponses(userId, options);
    return result.success ? result.data || [] : [];
  }

  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    const result = await databaseService.getUserSettings(userId);
    return result.success ? result.data : null;
  }

  static async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings | null> {
    const result = await databaseService.updateUserSettings(userId, settings);
    return result.success ? result.data : null;
  }

  // Get service metrics
  static getMetrics() {
    return databaseService.getMetrics();
  }

  // Clear cache
  static clearCache() {
    return databaseService.clearCache();
  }
}

// Export the service for easy imports
export default DatabaseService