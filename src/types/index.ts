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
  createdAt: Date;
  isLoading?: boolean;
  error?: string;
}

export type DescriptionStyle = 
  | 'detailed'
  | 'simple'
  | 'creative'
  | 'technical'
  | 'educational'
  | 'artistic';

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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
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
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultDescriptionStyle: DescriptionStyle;
  autoSaveDescriptions: boolean;
  maxHistoryItems: number;
  exportFormat: 'json' | 'csv' | 'pdf';
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
  format: 'json' | 'csv' | 'pdf';
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
  selectedDifficulty: ExtractedPhrase['difficulty'] | null;
}

export interface AppState {
  currentImage: Image | null;
  sidebarOpen: boolean;
  activeTab: 'search' | 'descriptions' | 'qa' | 'phrases' | 'export';
  isFullscreen: boolean;
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
  generateDescription: (request: DescriptionRequest) => Promise<Description>;
  regenerateDescription: (descriptionId: string) => Promise<Description>;
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
  extractPhrases: (request: PhraseExtractionRequest) => Promise<ExtractedPhrase[]>;
  deletePhrase: (phraseId: string) => void;
  clearPhrases: () => void;
}

export interface UseSessionReturn {
  session: UserSession;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addToHistory: (item: Omit<SearchHistoryItem, 'id'>) => void;
  clearHistory: () => void;
  exportSession: () => Promise<Blob>;
}

export interface UseExportReturn {
  isExporting: boolean;
  error: string | null;
  exportData: (options: ExportOptions) => Promise<Blob>;
  downloadExport: (blob: Blob, filename: string) => void;
}