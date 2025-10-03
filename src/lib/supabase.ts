import { createClient } from "@supabase/supabase-js";
import { createDatabaseService } from "./services/database";
import type { 
  Database,
  QAResponse,
  UserSettings,
  VocabularyList,
  Session,
  UserProgress as LearningProgress,
  DescriptionRecord as SavedDescription
} from "../types/database";
import type { VocabularyItem } from "../types/unified";
// Import the singleton client from our client module
import { supabase as singletonClient } from "./supabase/client";
import { dbLogger } from '@/lib/logger';

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  dbLogger.warn(
    "Missing Supabase environment variables. Some features may not work correctly.",
  );
}

// Export the singleton client instead of creating a new one
export const supabase = singletonClient;

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Enhanced database service instance with connection pooling and error handling
export const databaseService = createDatabaseService(
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
);

// Re-export database types for consistency - use unified types from database schema
export type User = Database['public']['Tables']['users']['Row'];

// Use unified VocabularyItem type for consistency
// Legacy interface kept for backward compatibility
// @deprecated Use VocabularyItem from unified types instead
export interface LegacyVocabularyItem {
  id: string;
  vocabulary_list_id: string;
  spanish_text: string;
  english_translation: string;
  part_of_speech:
    | "noun"
    | "verb"
    | "adjective"
    | "adverb"
    | "preposition"
    | "other";
  difficulty_level: number;
  category: string;
  context_sentence_spanish: string | null;
  context_sentence_english: string | null;
  pronunciation_ipa: string | null;
  usage_notes: string | null;
  frequency_score: number | null;
  created_at: string;
}

// Re-export unified VocabularyItem as the primary type
export type { VocabularyItem };

// Re-export additional database types using imported aliases
export { type Session, type VocabularyList, type QAResponse, type UserSettings };
export type { LearningProgress, SavedDescription };

// Type conversion functions to handle service vs database type differences
function convertServiceUserToDatabase(user: any): User | null {
  if (!user) return null;
  // Convert service User type to database User type - handle any field differences
  return user as User;
}

function convertServiceSessionToDatabase(session: any): Session | null {
  if (!session) return null;
  return session as Session;
}

function convertServiceQAResponseToDatabase(response: any): QAResponse | null {
  if (!response) return null;
  return response as QAResponse;
}

function convertServiceUserSettingsToDatabase(settings: any): UserSettings | null {
  if (!settings) return null;
  return settings as UserSettings;
}

function convertServiceSavedDescriptionToDatabase(description: any): SavedDescription | null {
  if (!description) return null;
  return description as SavedDescription;
}

function convertServiceLearningProgressToDatabase(progress: any): LearningProgress | null {
  if (!progress) return null;
  return progress as LearningProgress;
}

// Legacy DatabaseService class - now uses the enhanced service internally
export class DatabaseService {
  // Test connection
  static async testConnection(): Promise<boolean> {
    try {
      return await databaseService.testConnection();
    } catch (error) {
      dbLogger.error("Database connection test failed:", error);
      return false;
    }
  }

  // User operations
  static async createUser(userData: Partial<User>): Promise<User | null> {
    const result = await databaseService.createUser(userData);
    return result.success ? convertServiceUserToDatabase(result.data) : null;
  }

  static async getUser(userId: string): Promise<User | null> {
    const result = await databaseService.getUser(userId);
    return result.success ? convertServiceUserToDatabase(result.data) : null;
  }

  static async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    const result = await databaseService.updateUser(userId, updates);
    return result.success ? convertServiceUserToDatabase(result.data) : null;
  }

  // Session operations
  static async createSession(
    sessionData: Omit<Session, "id" | "created_at">,
  ): Promise<Session | null> {
    const result = await databaseService.createSession(sessionData);
    return result.success ? convertServiceSessionToDatabase(result.data) : null;
  }

  static async endSession(
    sessionId: string,
    endData: Partial<Session>,
  ): Promise<Session | null> {
    const result = await databaseService.endSession(sessionId, endData);
    return result.success ? convertServiceSessionToDatabase(result.data) : null;
  }

  static async getUserSessions(
    userId: string,
    limit: number = 10,
  ): Promise<Session[]> {
    const result = await databaseService.getUserSessions(userId, { limit });
    return result.success ? (result.data || []).map(convertServiceSessionToDatabase).filter(Boolean) as Session[] : [];
  }

  // Vocabulary operations
  static async getVocabularyLists(): Promise<VocabularyList[]> {
    const result = await databaseService.getVocabularyLists();
    return result.success ? result.data || [] : [];
  }

  static async createVocabularyList(
    listData: Omit<VocabularyList, "id" | "created_at" | "updated_at">,
  ): Promise<VocabularyList | null> {
    const result = await databaseService.createVocabularyList(listData);
    return result.success ? result.data : null;
  }

  static async getVocabularyItems(listId: string): Promise<VocabularyItem[]> {
    const result = await databaseService.getVocabularyItems(listId);
    return result.success ? result.data || [] : [];
  }

  static async addVocabularyItem(
    itemData: Omit<VocabularyItem, "id" | "created_at">,
  ): Promise<VocabularyItem | null> {
    const result = await databaseService.addVocabularyItem(itemData);
    return result.success ? result.data : null;
  }

  // Learning progress operations
  static async updateLearningProgress(
    userId: string,
    vocabularyItemId: string,
    progressData: Partial<LearningProgress>,
  ): Promise<LearningProgress | null> {
    const result = await databaseService.updateLearningProgress(
      userId,
      vocabularyItemId,
      progressData,
    );
    return result.success ? convertServiceLearningProgressToDatabase(result.data) : null;
  }

  static async getLearningProgress(
    userId: string,
    limit: number = 50,
  ): Promise<LearningProgress[]> {
    const result = await databaseService.getLearningProgress(userId, { limit });
    return result.success ? (result.data || []).map(convertServiceLearningProgressToDatabase).filter(Boolean) as LearningProgress[] : [];
  }

  // Saved descriptions operations
  static async saveDescription(
    descriptionData: Omit<SavedDescription, "id" | "created_at" | "updated_at">,
  ): Promise<SavedDescription | null> {
    const result = await databaseService.saveDescription(descriptionData);
    return result.success ? convertServiceSavedDescriptionToDatabase(result.data) : null;
  }

  static async getSavedDescriptions(
    userId?: string,
    limit: number = 20,
  ): Promise<SavedDescription[]> {
    const result = await databaseService.getSavedDescriptions(userId, {
      limit,
    });
    return result.success ? (result.data || []).map(convertServiceSavedDescriptionToDatabase).filter(Boolean) as SavedDescription[] : [];
  }

  static async toggleFavoriteDescription(
    descriptionId: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const result = await databaseService.toggleFavoriteDescription(
      descriptionId,
      isFavorite,
    );
    return result.success;
  }

  // Enhanced methods using the new service
  static async searchVocabulary(
    searchTerm: string,
    filters: any = {},
    options: any = {},
  ): Promise<VocabularyItem[]> {
    const result = await databaseService.searchVocabulary(
      searchTerm,
      filters,
      options,
    );
    return result.success ? result.data || [] : [];
  }

  static async getUserAnalytics(
    userId: string,
    dateRange: { start: string; end: string },
  ): Promise<any> {
    const result = await databaseService.getUserAnalytics(userId, dateRange);
    return result.success ? result.data : null;
  }

  static async saveQAResponse(
    responseData: Partial<QAResponse>,
  ): Promise<QAResponse | null> {
    const result = await databaseService.saveQAResponse(responseData);
    return result.success ? convertServiceQAResponseToDatabase(result.data) : null;
  }

  static async getQAResponses(
    userId?: string,
    options: any = {},
  ): Promise<QAResponse[]> {
    const result = await databaseService.getQAResponses(userId, options);
    return result.success ? (result.data || []).map(convertServiceQAResponseToDatabase).filter(Boolean) as QAResponse[] : [];
  }

  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    const result = await databaseService.getUserSettings(userId);
    return result.success ? convertServiceUserSettingsToDatabase(result.data) : null;
  }

  static async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>,
  ): Promise<UserSettings | null> {
    const result = await databaseService.updateUserSettings(userId, settings);
    return result.success ? convertServiceUserSettingsToDatabase(result.data) : null;
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
export default DatabaseService;
