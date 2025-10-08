// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  responseTime: string;
  timestamp: string;
  requestId?: string;
  demoMode?: boolean;
  version?: string;
  userId?: string;
  fallback?: boolean;
  fromCache?: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: string | any[];
  timestamp: string;
  requestId?: string;
  retry?: boolean;
}

export interface ValidationErrorResponse extends ErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// Image Search Types
export interface ImageSearchResponse {
  images: Image[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
}

export interface Image {
  id: string;
  urls: ImageUrls;
  alt_description?: string;
  description?: string;
  user: ImageUser;
  width: number;
  height: number;
  color?: string;
  likes?: number;
  created_at: string;
}

export interface ImageUrls {
  small: string;
  regular: string;
  full?: string;
}

export interface ImageUser {
  name: string;
  username?: string;
}

export interface ImageSearchParams {
  query: string;
  page?: number;
  per_page?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  color?: string;
  orderBy?: 'relevant' | 'latest' | 'oldest' | 'popular';
  api_key?: string;
}

// Description Generation Types
export type DescriptionStyle = 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
export type Language = 'english' | 'spanish' | 'es' | 'en';

export interface DescriptionGenerateRequest {
  imageUrl: string;
  style?: DescriptionStyle;
  maxLength?: number;
  customPrompt?: string;
}

export interface Description {
  id: string;
  imageId: string;
  style: DescriptionStyle;
  content: string;
  language: Language;
  createdAt: string;
}

export interface DescriptionResponse extends ApiResponse<Description[]> {
  metadata: ResponseMetadata & {
    demoMode: boolean;
  };
}

// Q&A Generation Types
export interface QAGenerateRequest {
  description: string;
  language?: 'es' | 'en';
  count?: number;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  difficulty: DifficultyLevel;
  type: 'comprehension' | 'detail' | 'inference' | 'analysis';
  language: 'es' | 'en';
}

export interface QAResponse extends ApiResponse<QAPair[]> {
  questions: QAPair[];
  metadata: ResponseMetadata & {
    count: number;
    language: string;
    generatedAt: string;
    source: string;
  };
}

// Phrase Extraction Types
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type PhraseCategory = 'sustantivos' | 'verbos' | 'adjetivos' | 'adverbios' | 'frasesClaves';
export type Gender = 'masculino' | 'femenino' | 'neutro';

export interface PhraseExtractionRequest {
  imageUrl: string;
  descriptionText: string;
  style?: DescriptionStyle;
  targetLevel?: DifficultyLevel;
  maxPhrases?: number;
  categories?: PhraseCategory[];
}

export interface Phrase {
  id: string;
  phrase: string;
  definition: string;
  partOfSpeech: string;
  difficulty: DifficultyLevel;
  context: string;
  category: PhraseCategory;
  gender?: Gender;
  article?: string;
  conjugation?: string;
  createdAt: string;
}

export interface CategorizedPhrases {
  [category: string]: Phrase[];
}

export interface PhraseExtractionResponse extends ApiResponse {
  phrases: Phrase[];
  categorizedPhrases: CategorizedPhrases;
  metadata: ResponseMetadata & {
    extractionMethod: string;
    totalPhrases: number;
    categoryCounts: Record<string, number>;
    targetLevel: DifficultyLevel;
  };
}

// Vocabulary Management Types
export interface VocabularyItem {
  id: string;
  phrase: string;
  definition: string;
  category: string;
  partOfSpeech?: string;
  difficulty: DifficultyLevel;
  context?: string;
  translation?: string;
  notes?: string;
  tags: string[];
  imageUrl?: string;
  gender?: Gender;
  article?: string;
  conjugation?: string;
  examples: string[];
}

export interface VocabularyItemFull extends VocabularyItem {
  userId: string;
  collectionName: string;
  createdAt: string;
  updatedAt: string;
  metadata?: VocabularyMetadata & {
    timestamp: string;
    saved: boolean;
    bulkImport?: boolean;
  };
}

export interface VocabularyMetadata {
  source?: string;
  timestamp?: string;
  confidence?: number;
  reviewCount?: number;
  lastReviewed?: string;
  masteryLevel?: number;
}

export interface VocabularySaveRequest {
  userId?: string;
  vocabulary: VocabularyItem;
  collectionName?: string;
  metadata?: VocabularyMetadata;
}

export interface VocabularyBulkSaveRequest {
  userId?: string;
  vocabularyItems: Omit<VocabularyItem, 'id'>[];
  collectionName?: string;
  metadata?: VocabularyMetadata;
}

export interface VocabularySaveResponse extends ApiResponse<VocabularyItemFull | VocabularyItemFull[]> {
  metadata: ResponseMetadata & {
    count?: number;
    userId: string;
    collectionName: string;
  };
}

export interface VocabularyQueryParams {
  userId?: string;
  collectionName?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'phrase' | 'difficulty' | 'createdAt' | 'masteryLevel';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface UserStats {
  totalItems: number;
  difficultyCounts: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  categoryCounts: Record<string, number>;
  lastUpdated: string;
}

export interface VocabularyListResponse extends ApiResponse<VocabularyItemFull[]> {
  pagination: PaginationInfo;
  stats: UserStats;
}

// Progress Tracking Types
export type ProgressEventType = 
  | 'vocabulary_learned'
  | 'vocabulary_reviewed'
  | 'vocabulary_mastered'
  | 'qa_answered'
  | 'qa_correct'
  | 'qa_incorrect'
  | 'phrase_learned'
  | 'phrase_reviewed'
  | 'phrase_mastered'
  | 'translation_completed'
  | 'description_generated'
  | 'session_started'
  | 'session_completed'
  | 'image_processed'
  | 'export_generated'
  | 'difficulty_adjusted'
  | 'goal_achieved';

export interface ProgressEventData {
  vocabularyId?: string;
  questionId?: string;
  phraseId?: string;
  imageUrl?: string;
  difficulty?: DifficultyLevel;
  category?: string;
  score?: number;
  timeSpent?: number;
  attempts?: number;
  correct?: boolean;
  confidence?: number;
  masteryLevel?: number;
  streak?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ProgressTrackRequest {
  userId?: string;
  sessionId?: string;
  eventType: ProgressEventType;
  eventData: ProgressEventData;
  timestamp?: string;
}

export interface ProgressEvent {
  id: string;
  userId: string;
  sessionId?: string;
  eventType: ProgressEventType;
  eventData: ProgressEventData;
  timestamp: string;
  dateKey: string;
}

export interface ProgressTrackResponse extends ApiResponse<ProgressEvent> {
  metadata: ResponseMetadata & {
    userId: string;
    sessionId?: string;
    eventType: ProgressEventType;
  };
}

export interface Achievement {
  id: string;
  title: string;
  unlockedAt: string;
  eventType: string;
  eventData: any;
}

export interface ProgressSummary {
  userId: string;
  totalEvents: number;
  firstActivity: string;
  lastActivity: string;
  streaks: {
    current: number;
    longest: number;
  };
  categories: Record<string, number>;
  difficulties: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  achievements: Achievement[];
  masteryScores: Record<string, number>;
  timeSpent: number;
  scores: {
    total: number;
    count: number;
    average: number;
  };
  aggregated?: DailyProgress[];
}

export interface DailyProgress {
  userId: string;
  date: string;
  events: Record<string, number>;
  totalEvents: number;
  timeSpent: number;
  score: {
    total: number;
    count: number;
    average: number;
  };
  categories: Record<string, number>;
  difficulties: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}

export interface ProgressDataResponse extends ApiResponse<ProgressSummary> {}

export interface ProgressQueryParams {
  userId?: string;
  sessionId?: string;
  eventType?: string[];
  category?: string;
  difficulty?: DifficultyLevel;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  aggregation?: 'daily' | 'weekly' | 'monthly';
}

// User Settings Types
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type QuestionType = 'multiple_choice' | 'open_ended' | 'true_false' | 'fill_blank' | 'comprehension';
export type ExportFormat = 'json' | 'csv' | 'txt' | 'pdf' | 'anki' | 'quizlet';
export type AutoExportInterval = 'never' | 'daily' | 'weekly' | 'monthly';
export type LearningDirection = 'primary_to_secondary' | 'secondary_to_primary' | 'bidirectional';

export interface UserSettings {
  language?: {
    primary: string;
    secondary: string;
    learningDirection: LearningDirection;
  };
  difficulty?: {
    preferred: DifficultyLevel;
    adaptive: boolean;
    autoAdjust: boolean;
  };
  content?: {
    style: DescriptionStyle;
    maxPhrases: number;
    maxQuestions: number;
    includeTranslations: boolean;
    includeExamples: boolean;
    includeContext: boolean;
    questionTypes: QuestionType[];
  };
  interface?: {
    theme: Theme;
    fontSize: FontSize;
    animations: boolean;
    soundEffects: boolean;
    compactMode: boolean;
    showProgress: boolean;
  };
  session?: {
    autoSave: boolean;
    sessionTimeout: number;
    reminderIntervals: number[];
    goalTracking: boolean;
    streakTracking: boolean;
    achievementNotifications: boolean;
  };
  privacy?: {
    saveProgress: boolean;
    saveVocabulary: boolean;
    analytics: boolean;
    shareProgress: boolean;
    dataRetention: number;
  };
  export?: {
    defaultFormat: ExportFormat;
    includeMetadata: boolean;
    includeProgress: boolean;
    autoExportInterval: AutoExportInterval;
  };
  advanced?: {
    cacheEnabled: boolean;
    preloadContent: boolean;
    debugMode: boolean;
    experimentalFeatures: boolean;
    apiTimeout: number;
    maxRetries: number;
  };
}

export interface UserSettingsRequest {
  userId?: string;
  settings: UserSettings;
  metadata?: {
    version?: string;
    source?: string;
    timestamp?: string;
    migrated?: boolean;
  };
}

export interface UserSettingsData {
  userId: string;
  settings: UserSettings;
  metadata: {
    version: string;
    timestamp: string;
    source: string;
    isDefault?: boolean;
    error?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsResponse extends ApiResponse<UserSettingsData> {
  metadata: ResponseMetadata & {
    sectionsUpdated?: string[];
    sectionsReset?: string[] | 'all';
    section?: string;
    includeDefaults?: boolean;
  };
}

export type SettingsSection = 'language' | 'difficulty' | 'content' | 'interface' | 'session' | 'privacy' | 'export' | 'advanced';

export interface SettingsQueryParams {
  userId?: string;
  section?: SettingsSection;
  includeDefaults?: boolean;
}

// Export Types
export type ExportContentType = 'vocabulary' | 'phrases' | 'qa' | 'progress' | 'all';
export type ExportTemplate = 'minimal' | 'standard' | 'detailed';

export interface ExportFilters {
  collectionName?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  includeMetadata?: boolean;
  includeProgress?: boolean;
}

export interface ExportFormatting {
  includeDefinitions?: boolean;
  includeExamples?: boolean;
  includeTranslations?: boolean;
  includeImages?: boolean;
  language?: string;
  template?: ExportTemplate;
}

export interface ExportRequest {
  userId?: string;
  exportType: ExportFormat;
  contentType: ExportContentType;
  filters?: ExportFilters;
  formatting?: ExportFormatting;
}

export interface ExportData {
  data: string;
  filename: string;
  contentType: string;
  size: number;
  downloadUrl: string;
  note?: string;
}

export interface ExportResponse extends ApiResponse<ExportData> {
  metadata: ResponseMetadata & {
    exportType: ExportFormat;
    contentType: ExportContentType;
    filters: ExportFilters;
    formatting: ExportFormatting;
    fromCache: boolean;
  };
}

// Health Check Types
export interface ServiceStatus {
  name: string;
  configured: boolean;
  demoMode: boolean;
  reason: string;
  status?: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: string;
  lastCheck?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  healthy: boolean;
  demo: boolean;
  message: string;
  timestamp: string;
  services?: ServiceStatus[];
  overall?: {
    healthy: boolean;
    status: string;
  };
  error?: string;
}

export interface StatusResponse {
  status: 'ok' | 'error';
  demo: boolean;
  timestamp: string;
  services: ServiceStatus[];
  message: string;
}

// Service Info Types
export interface ServiceInfoResponse extends ApiResponse {
  data: {
    service: string;
    status: string;
    version: string;
    capabilities: Record<string, any>;
  };
}

export interface EndpointInfoResponse {
  endpoint: string;
  method: string;
  description: string;
  parameters: Record<string, any>;
  response: Record<string, any>;
}

// Auth Types
export interface AuthResponse {
  success: boolean;
  error?: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    created_at?: string;
  };
  profile?: {
    id: string;
    email: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
    subscription_status?: 'free' | 'premium' | 'premium_plus';
  };
  session?: {
    access_token: string;
    refresh_token: string;
    user: any;
  };
}

export interface SignInResponse extends AuthResponse {}
export interface SignUpResponse extends AuthResponse {}

// API Client Types
export interface ApiClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

// Common utility types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RequestOptions {
  method: ApiMethod;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

// Type guards
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && response.success === false && typeof response.error === 'string';
}

export function isValidationErrorResponse(response: any): response is ValidationErrorResponse {
  return isErrorResponse(response) && 'errors' in response && Array.isArray(response.errors);
}

export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return response && typeof response.success === 'boolean';
}

export function hasMetadata(response: any): response is { metadata: ResponseMetadata } {
  return response && response.metadata && typeof response.metadata === 'object';
}

// API endpoint constants
export const API_ENDPOINTS = {
  IMAGES: {
    SEARCH: '/images/search',
  },
  DESCRIPTIONS: {
    GENERATE: '/descriptions/generate',
  },
  QA: {
    GENERATE: '/qa/generate',
  },
  PHRASES: {
    EXTRACT: '/phrases/extract',
  },
  VOCABULARY: {
    SAVE: '/vocabulary/save',
  },
  PROGRESS: {
    TRACK: '/progress/track',
  },
  SETTINGS: {
    SAVE: '/settings/save',
  },
  EXPORT: {
    GENERATE: '/export/generate',
  },
  HEALTH: '/health',
  STATUS: '/status',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Default values
export const DEFAULT_PAGINATION = {
  limit: 20,
  offset: 0,
} as const;

export const DEFAULT_IMAGE_SEARCH = {
  page: 1,
  per_page: 20,
  orderBy: 'relevant' as const,
} as const;

export const DEFAULT_DESCRIPTION = {
  style: 'conversacional' as const,
  maxLength: 200,
} as const;

export const DEFAULT_QA = {
  language: 'es' as const,
  count: 5,
} as const;

export const DEFAULT_PHRASE_EXTRACTION = {
  style: 'conversacional' as const,
  targetLevel: 'intermediate' as const,
  maxPhrases: 15,
} as const;

// ===================================================================
// LEGACY TYPES FROM api.ts - For backwards compatibility
// ===================================================================

// Unsplash Types (Extended versions with additional fields)
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

// Description Types (Legacy - maintains compatibility)
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

// Q&A Types
export interface QAGeneration {
  question: string;
  answer: string;
  difficulty: "facil" | "medio" | "dificil";
  category: string;
}

// Phrase Types
export interface PhraseCategories {
  objetos: string[];
  acciones: string[];
  lugares: string[];
  colores: string[];
  emociones: string[];
  conceptos: string[];
}

// Translation Types
export interface TranslationRequest {
  text: string;
  fromLanguage: string;
  toLanguage: string;
}

// Cache Types
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// Rate Limiting Types
export interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
  isBlocked: boolean;
}

// API Error Class
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

// Retry Configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: APIError) => boolean;
}

// Service Configuration
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

// Supabase Database Types
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