// API Types and Interfaces
export interface UnsplashImage {
  id: string;
  created_at: string;
  updated_at: string;
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
    small_s3: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string | null;
    instagram_username: string | null;
    twitter_username: string | null;
    portfolio_url: string | null;
    bio: string | null;
    location: string | null;
    total_likes: number;
    total_photos: number;
    accepted_tos: boolean;
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
    };
  };
  tags?: Array<{
    type: string;
    title: string;
  }>;
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

export interface UnsplashSearchParams {
  query: string;
  page?: number;
  per_page?: number;
  order_by?: "latest" | "oldest" | "popular" | "views" | "downloads";
  collections?: string;
  content_filter?: "low" | "high";
  color?:
    | "black_and_white"
    | "black"
    | "white"
    | "yellow"
    | "orange"
    | "red"
    | "purple"
    | "magenta"
    | "green"
    | "teal"
    | "blue";
  orientation?: "landscape" | "portrait" | "squarish";
}

export interface ProcessedImage extends UnsplashImage {
  canonicalUrl: string;
  isDuplicate: boolean;
  duplicateOf?: string;
}

export type DescriptionStyle =
  | "narrativo"
  | "poetico"
  | "academico"
  | "conversacional"
  | "infantil";

export interface DescriptionRequest {
  imageUrl: string;
  style: DescriptionStyle;
  language?: "es" | "en";
  maxLength?: number;
  customPrompt?: string;
}

export interface GeneratedDescription {
  style: DescriptionStyle;
  text: string;
  language: string;
  wordCount: number;
  generatedAt: string;
}

// Multi-Style System Types
export interface MultiStyleRequest {
  imageUrl: string;
  styles: DescriptionStyle[];
  language?: "es" | "en";
  maxLength?: number;
}

export interface StyleGenerationStatus {
  style: DescriptionStyle;
  status: "pending" | "generating" | "completed" | "error";
  description?: GeneratedDescription;
  error?: string;
  retryCount?: number;
}

export interface MultiStyleResponse {
  results: StyleGenerationStatus[];
  totalRequested: number;
  totalCompleted: number;
  totalErrors: number;
  sessionId: string;
  generatedAt: string;
}

export interface StyleDisplaySettings {
  showSpanish: boolean;
  showEnglish: boolean;
  activeTab: DescriptionStyle | null;
}

export interface QAGeneration {
  question: string;
  answer: string;
  difficulty: "facil" | "medio" | "dificil";
  category: string;
}

export interface PhraseCategories {
  objetos: string[];
  acciones: string[];
  lugares: string[];
  colores: string[];
  emociones: string[];
  conceptos: string[];
}

export interface TranslationRequest {
  text: string;
  fromLanguage: string;
  toLanguage: string;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
  isBlocked: boolean;
}

export interface APIError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  retryAfter?: number;
}

// Export APIError as both interface and class for compatibility
export class APIError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  retryAfter?: number;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    retryAfter?: number;
  });
  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
    retryAfter?: number,
  );
  constructor(
    messageOrParams:
      | string
      | {
          code: string;
          message: string;
          status: number;
          details?: Record<string, unknown>;
          retryAfter?: number;
        },
    code?: string,
    status?: number,
    details?: Record<string, unknown>,
    retryAfter?: number,
  ) {
    if (typeof messageOrParams === "object") {
      super(messageOrParams.message);
      this.code = messageOrParams.code;
      this.status = messageOrParams.status;
      this.details = messageOrParams.details;
      this.retryAfter = messageOrParams.retryAfter;
    } else {
      super(messageOrParams);
      this.code = code!;
      this.status = status!;
      this.details = details;
      this.retryAfter = retryAfter;
    }
    this.name = "APIError";
  }
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: APIError) => boolean;
}

export interface ServiceConfig {
  baseURL: string;
  apiKey: string;
  timeout: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  cache: {
    defaultTTL: number;
    maxSize: number;
  };
  retry: RetryConfig;
}

// Supabase Types
// Vocabulary and Phrase System Types - Agent Gamma-3 Implementation
export interface CategorizedPhrase {
  id: string;
  phrase: string;
  definition: string;
  category: string;
  partOfSpeech: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  context: string;
  sortKey: string;
  saved: boolean;
  createdAt: Date;
  // Spanish-specific properties
  gender?: "masculino" | "femenino" | "neutro";
  article?: string; // el, la, los, las
  conjugation?: string; // for verbs - infinitive form
}

export interface SavedPhrase extends CategorizedPhrase {
  saved: true;
  savedAt: Date;
  translation?: string;
  studyProgress: {
    correctAnswers: number;
    totalAttempts: number;
    lastReviewed?: Date;
    nextReview?: Date;
  };
}

export interface VocabularySet {
  id: string;
  name: string;
  description: string;
  phrases: SavedPhrase[];
  createdAt: Date;
  lastModified: Date;
  studyStats: {
    totalPhrases: number;
    masteredPhrases: number;
    reviewsDue: number;
    averageProgress: number;
  };
}

export interface VocabularyExtractionRequest {
  description: string;
  imageUrl: string;
  targetLevel: "beginner" | "intermediate" | "advanced";
  maxPhrases: number;
  categories?: (
    | "sustantivos"
    | "verbos"
    | "adjetivos"
    | "adverbios"
    | "frasesClaves"
  )[];
}

export interface VocabularyExtractionResponse {
  categorizedPhrases: Record<string, CategorizedPhrase[]>;
  totalExtracted: number;
  extractionTime: number;
  imageUrl: string;
  extractedAt: string;
}

export interface Database {
  public: {
    Tables: {
      images: {
        Row: {
          id: string;
          unsplash_id: string;
          url: string;
          description: string | null;
          alt_description: string | null;
          width: number;
          height: number;
          color: string;
          user_id: string;
          username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unsplash_id: string;
          url: string;
          description?: string | null;
          alt_description?: string | null;
          width: number;
          height: number;
          color: string;
          user_id: string;
          username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unsplash_id?: string;
          url?: string;
          description?: string | null;
          alt_description?: string | null;
          width?: number;
          height?: number;
          color?: string;
          user_id?: string;
          username?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      descriptions: {
        Row: {
          id: string;
          image_id: string;
          style: DescriptionStyle;
          text: string;
          language: string;
          word_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_id: string;
          style: DescriptionStyle;
          text: string;
          language: string;
          word_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_id?: string;
          style?: DescriptionStyle;
          text?: string;
          language?: string;
          word_count?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      description_style: DescriptionStyle;
    };
  };
}
