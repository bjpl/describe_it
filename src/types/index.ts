// Core Types
export interface Image {
  id: string;
  urls: {
    raw?: string;
    small: string;
    regular: string;
    full: string;
    thumb?: string;
    small_s3?: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
  color: string;
  likes?: number;
  created_at: string;
}

// Alias for backward compatibility with Unsplash references
export type UnsplashImage = Image;

export interface SearchResult {
  total: number;
  total_pages: number;
  results: Image[];
}

// Description Types
export interface Description {
  id: string;
  imageId: string;
  style: DescriptionStyle;
  content: string;
  language: 'en' | 'es' | 'english' | 'spanish';
  createdAt: Date;
  isLoading?: boolean;
  error?: string;
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
  customPrompt?: string;
}

// Q&A Types
export interface QuestionAnswerPair {
  id: string;
  imageId: string;
  question: string;
  answer: string;
  createdAt: Date;
  confidence?: number;
}

export interface QARequest {
  imageUrl: string;
  question: string;
}

// Phrase Extraction Types
export interface ExtractedPhrase {
  id: string;
  imageId: string;
  phrase: string;
  definition: string;
  partOfSpeech: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  context: string;
  createdAt: Date;
}

export interface PhraseExtractionRequest {
  imageUrl: string;
  targetLevel?: string;
  maxPhrases?: number;
}

// Session Types
export interface UserSession {
  id: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  searchHistory: SearchHistoryItem[];
  preferences: UserPreferences;
  isAuthenticated: boolean;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: string;
  defaultDescriptionStyle: DescriptionStyle;
  autoSaveDescriptions: boolean;
  maxHistoryItems: number;
  exportFormat: "json" | "csv" | "pdf";
}

// Export Types
export interface ExportData {
  images: Image[];
  descriptions: Description[];
  questionAnswers: QuestionAnswerPair[];
  phrases: ExtractedPhrase[];
  exportedAt: Date;
  sessionInfo: Partial<UserSession>;
}

export interface ExportOptions {
  format: "json" | "csv" | "pdf";
  includeImages: boolean;
  includeDescriptions: boolean;
  includeQA: boolean;
  includePhrases: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: unknown;
}

// State Types
export interface SearchState {
  query: string;
  results: Image[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface DescriptionState {
  descriptions: Record<string, Description[]>;
  isLoading: boolean;
  error: string | null;
  activeImageId: string | null;
  selectedStyles: DescriptionStyle[];
}

export interface QAState {
  questionAnswers: Record<string, QuestionAnswerPair[]>;
  isLoading: boolean;
  error: string | null;
  activeImageId: string | null;
  pendingQuestion: string;
}

export interface PhraseState {
  phrases: Record<string, ExtractedPhrase[]>;
  isLoading: boolean;
  error: string | null;
  activeImageId: string | null;
  selectedDifficulty: ExtractedPhrase["difficulty"] | null;
}

export interface AppState {
  currentImage: Image | null;
  sidebarOpen: boolean;
  activeTab: "search" | "descriptions" | "qa" | "phrases" | "export";
  isFullscreen: boolean;
  preferences: UserPreferences;
  searchHistory: SearchHistoryItem[];
  isLoading: boolean;
  error: string | null;
}

// Multi-style Description Types
export interface StyleDescription {
  style: DescriptionStyle;
  english: string;
  spanish: string;
  isLoading: boolean;
  error?: string;
}

export interface LanguageVisibility {
  showEnglish: boolean;
  showSpanish: boolean;
}

export interface MultiStyleDescriptions {
  [key: string]: StyleDescription; // key is the style name
}

export interface DescriptionNotebookState {
  activeStyle: DescriptionStyle;
  descriptions: MultiStyleDescriptions;
  languageVisibility: LanguageVisibility;
  isGenerating: boolean;
}

// Component Props Types
export interface ImageComponentProps {
  id: string;
  urls: Image["urls"];
  alt_description: string | null;
  description: string | null;
  user: Image["user"];
  width: number;
  height: number;
  color: string;
  likes?: number;
  created_at: string;
}

export interface QAResponse {
  question: string;
  user_answer: string;
  correct_answer: string;
  timestamp: string;
  isCorrect?: boolean;
  explanation?: string;
}

// Re-export unified vocabulary types
export type {
  VocabularyItem,
  VocabularyItemUI,
  DifficultyLevel,
  DifficultyNumber,
  PartOfSpeech,
  VocabularyFilters,
  VocabularyStats,
  BulkVocabularyOperation,
  BulkOperationResult as UnifiedBulkOperationResult,
  VocabularyExportOptions,
  VocabularyImportOptions,
  VocabularyImportResult,
} from "./unified";

// Re-export utility functions
export {
  isVocabularyItem,
  isVocabularyItemUI,
  difficultyNumberToString,
  difficultyStringToNumber,
  vocabularyItemToUI,
  vocabularyItemFromUI,
  vocabularyItemsToUI,
  vocabularyItemsFromUI,
  normalizeLegacyVocabularyItem,
  validateVocabularyItem,
} from "./unified";

export interface ExportableData {
  descriptions?: DescriptionExportItem[];
  qaResponses?: QAResponse[];
  vocabulary?: import('./unified').VocabularyItem[];
  sessionData?: SessionInteractionExport[];
}

export interface DescriptionExportItem {
  imageId: string;
  imageUrl: string;
  style: DescriptionStyle;
  english: string;
  spanish: string;
  timestamp: string;
}

export interface SessionInteractionExport {
  interaction_type: string;
  component: string;
  data: string;
  timestamp: string;
}

// Settings Types
export interface UserSettings {
  theme: "light" | "dark" | "auto";
  language: "en" | "es";
  autoSave: boolean;
  notifications: boolean;
  defaultDescriptionStyle: DescriptionStyle;
  maxHistoryItems: number;
  exportFormat: "json" | "csv" | "pdf";
}

export interface SettingsUpdateRequest {
  userId: string;
  settings: Partial<UserSettings>;
  metadata?: {
    timestamp: string;
    source: string;
    version?: string;
  };
}

// Hook Return Types
export interface UseImageSearchReturn {
  searchState: SearchState;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
  selectImage: (image: Image) => void;
}

export interface UseDescriptionsReturn {
  descriptions: Description[];
  isLoading: boolean;
  error: string | null;
  generateDescription: (request: DescriptionRequest) => Promise<Description[]>;
  regenerateDescription: (descriptionId: string) => Promise<Description[]>;
  deleteDescription: (descriptionId: string) => void;
  clearDescriptions: () => void;
}

export interface UseQuestionAnswerReturn {
  questionAnswers: QuestionAnswerPair[];
  isLoading: boolean;
  error: string | null;
  askQuestion: (request: QARequest) => Promise<QuestionAnswerPair>;
  deleteQA: (qaId: string) => void;
  clearQA: () => void;
}

export interface UsePhraseExtractionReturn {
  phrases: ExtractedPhrase[];
  isLoading: boolean;
  error: string | null;
  extractPhrases: (
    request: PhraseExtractionRequest,
  ) => Promise<ExtractedPhrase[]>;
  deletePhrase: (phraseId: string) => void;
  clearPhrases: () => void;
}

export interface UseSessionReturn {
  session: UserSession;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addToHistory: (item: Omit<SearchHistoryItem, "id">) => void;
  clearHistory: () => void;
  exportSession: () => Promise<Blob>;
}

export interface UseExportReturn {
  isExporting: boolean;
  error: string | null;
  exportData: (options: ExportOptions) => Promise<Blob>;
  downloadExport: (blob: Blob, filename: string) => void;
}

// Enhanced API Response Types
export interface APIResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Legacy filter types - use VocabularyFilters from unified types instead
// @deprecated Use VocabularyFilters from unified types
export interface VocabularyFilter {
  category?: string;
  difficulty?: import('./unified').DifficultyLevel;
  searchTerm?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface DescriptionFilter {
  style?: DescriptionStyle;
  language?: "en" | "es";
  imageId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Bulk Operations Types
export interface BulkVocabularyRequest {
  userId: string;
  vocabularyItems: Omit<import('./unified').VocabularyItem, "id" | "created_at">[];
  collectionName: string;
  metadata?: {
    source: string;
    importedAt: string;
    totalItems: number;
  };
}

export interface BulkOperationResult<TItem = unknown> {
  success: boolean;
  processed: number;
  failed: number;
  results: {
    successful: TItem[];
    failed: {
      item: TItem;
      error: string;
    }[];
  };
}

// Collection Management Types
export interface VocabularyCollection {
  id: string;
  name: string;
  description?: string;
  userId: string;
  itemCount: number;
  categories: string[];
  created_at: string;
  updated_at: string;
  metadata?: {
    source?: string;
    tags?: string[];
    difficulty_distribution?: Record<string, number>;
  };
}

export interface CollectionIndex {
  collections: {
    [collectionName: string]: {
      itemCount: number;
      lastModified: string;
      categories: string[];
    };
  };
  items: {
    id: string;
    collectionName: string;
    lastModified: string;
  }[];
  totalItems: number;
  lastUpdated: string;
}
