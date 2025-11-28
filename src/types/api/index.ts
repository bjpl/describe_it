/**
 * API types barrel export
 */

export * from './request-types';
export * from './response-types';
export * from './middleware';
export * from './client-types';

// Legacy re-exports for backward compatibility
// These will be deprecated in future versions
export {
  APIError,
  type DescriptionStyle,
  type DescriptionRequest,
  type GeneratedDescription,
  type TranslationRequest,
  type QAGeneration,
  type PhraseCategories,
  type RetryConfig,
} from './legacy';

// Additional backward compatibility exports
export type { CategorizedPhrase } from './response-types';

// Legacy type aliases for backward compatibility
// TODO: Migrate components to use unified types from @/types/database and @/types/unified
export interface SavedPhrase {
  id: string;
  phrase: string;
  translation: string;
  definition?: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  partOfSpeech: string;
  context?: string;
  notes?: string;
  tags?: string[];
  examples?: string[];
  saved: boolean;
  gender?: "masculino" | "femenino" | "neutro";
  article?: string;
  conjugation?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  savedAt?: Date | string;
  studyProgress?: {
    totalAttempts: number;
    correctAnswers: number;
    lastReviewed?: Date | string;
  };
}

export interface VocabularySet {
  id: string;
  name: string;
  description?: string;
  phrases: SavedPhrase[];
  createdAt: Date | string;
  updatedAt?: Date | string;
  lastModified?: Date | string;
  userId?: string;
  isPublic?: boolean;
  category?: string;
  studyStats?: {
    totalStudied: number;
    totalPhrases?: number;
    masteredPhrases?: number;
    reviewsDue?: number;
    averageScore: number;
    averageProgress?: number;
    lastStudied?: Date | string;
  };
}

// Re-export common types from client-types for consistency
export type { UnsplashImage, RateLimitInfo } from './client-types';

export interface VocabularyExtractionRequest {
  text: string;
  language?: "es" | "en";
  difficulty?: "beginner" | "intermediate" | "advanced";
  targetLevel?: "beginner" | "intermediate" | "advanced";
  includeDefinitions?: boolean;
  includeContext?: boolean;
  maxPhrases?: number;
  description?: string;
  imageUrl?: string;
  categories?: string[];
}

export interface AuthResponse {
  success?: boolean;
  error?: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
  };
  profile?: {
    id: string;
    user_id: string;
    full_name?: string;
    learning_level?: "beginner" | "intermediate" | "advanced";
    subscription_status?: "free" | "premium" | "trial";
  };
}
