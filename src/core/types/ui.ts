/**
 * UI Types - Component Props and UI State
 *
 * These types define the shape of data used in React components,
 * including props, state, and UI-specific transformations.
 */

import type { DifficultyLevel, DescriptionStyle, LanguageCode } from './entities';

// ============================================================================
// VOCABULARY UI TYPES
// ============================================================================

/**
 * UI-friendly representation of VocabularyItem with string difficulty
 */
export interface VocabularyItemUI {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: DifficultyLevel; // String instead of number for UI
  part_of_speech: string;
  frequency_score?: number;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  phonetic_pronunciation?: string;
  audio_url?: string;
  created_at: string;
  updated_at?: string;
  user_notes?: string;
  mastery_level?: number;
  last_reviewed?: string;
  review_count?: number;
}

export interface VocabularyFiltersUI {
  search: string;
  category: string;
  difficulty: DifficultyLevel | 'all';
  partOfSpeech: string;
  masteryLevel: number | 'all';
  hasAudio: boolean;
  hasContext: boolean;
}

export interface VocabularyStatsUI {
  total: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byPartOfSpeech: Record<string, number>;
  averageDifficulty: number;
  withAudio: number;
  withContext: number;
}

// ============================================================================
// IMAGE & SEARCH UI TYPES
// ============================================================================

export interface ImageUI {
  id: string;
  urls: {
    raw?: string;
    small: string;
    regular: string;
    full: string;
    thumb?: string;
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

export interface SearchResultUI {
  total: number;
  total_pages: number;
  results: ImageUI[];
}

export interface SearchStateUI {
  query: string;
  results: ImageUI[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

// ============================================================================
// DESCRIPTION UI TYPES
// ============================================================================

export interface DescriptionUI {
  id: string;
  imageId: string;
  style: DescriptionStyle;
  content: string;
  language: LanguageCode;
  createdAt: Date;
  isLoading?: boolean;
  error?: string;
}

export interface StyleDescriptionUI {
  style: DescriptionStyle;
  english: string;
  spanish: string;
  isLoading: boolean;
  error?: string;
}

export interface MultiStyleDescriptionsUI {
  [style: string]: StyleDescriptionUI;
}

export interface DescriptionStateUI {
  descriptions: Record<string, DescriptionUI[]>;
  isLoading: boolean;
  error: string | null;
  activeImageId: string | null;
  selectedStyles: DescriptionStyle[];
}

export interface LanguageVisibilityUI {
  showEnglish: boolean;
  showSpanish: boolean;
}

// ============================================================================
// Q&A UI TYPES
// ============================================================================

export interface QuestionAnswerPairUI {
  id: string;
  imageId: string;
  question: string;
  answer: string;
  createdAt: Date;
  confidence?: number;
}

export interface QAStateUI {
  questionAnswers: Record<string, QuestionAnswerPairUI[]>;
  isLoading: boolean;
  error: string | null;
  activeImageId: string | null;
  pendingQuestion: string;
}

export interface QAResponseUI {
  question: string;
  user_answer: string;
  correct_answer: string;
  timestamp: string;
  isCorrect?: boolean;
  explanation?: string;
}

// ============================================================================
// PHRASE/VOCABULARY BUILDER UI TYPES
// ============================================================================

export interface ExtractedPhraseUI {
  id: string;
  imageId: string;
  phrase: string;
  definition: string;
  partOfSpeech: string;
  difficulty: DifficultyLevel;
  context: string;
  createdAt: Date;
}

export interface PhraseStateUI {
  phrases: Record<string, ExtractedPhraseUI[]>;
  isLoading: boolean;
  error: string | null;
  activeImageId: string | null;
  selectedDifficulty: DifficultyLevel | null;
}

// ============================================================================
// SESSION & PROGRESS UI TYPES
// ============================================================================

export interface UserSessionUI {
  id: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  searchHistory: SearchHistoryItemUI[];
  preferences: UserPreferencesUI;
  isAuthenticated: boolean;
}

export interface SearchHistoryItemUI {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

export interface UserPreferencesUI {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultDescriptionStyle: DescriptionStyle;
  autoSaveDescriptions: boolean;
  maxHistoryItems: number;
  exportFormat: 'json' | 'csv' | 'pdf';
}

// ============================================================================
// EXPORT UI TYPES
// ============================================================================

export interface ExportDataUI {
  images: ImageUI[];
  descriptions: DescriptionUI[];
  questionAnswers: QuestionAnswerPairUI[];
  phrases: ExtractedPhraseUI[];
  exportedAt: Date;
  sessionInfo: Partial<UserSessionUI>;
}

export interface ExportOptionsUI {
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

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface ImageComponentPropsUI {
  id: string;
  urls: ImageUI['urls'];
  alt_description: string | null;
  description: string | null;
  user: ImageUI['user'];
  width: number;
  height: number;
  color: string;
  likes?: number;
  created_at: string;
}

export interface VocabularyCardPropsUI {
  item: VocabularyItemUI;
  onEdit?: (item: VocabularyItemUI) => void;
  onDelete?: (id: string) => void;
  onPlayAudio?: (audioUrl: string) => void;
  showProgress?: boolean;
}

export interface DescriptionCardPropsUI {
  description: DescriptionUI;
  language: LanguageCode;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

// ============================================================================
// APP STATE UI TYPES
// ============================================================================

export interface AppStateUI {
  currentImage: ImageUI | null;
  sidebarOpen: boolean;
  activeTab: 'search' | 'descriptions' | 'qa' | 'phrases' | 'export';
  isFullscreen: boolean;
  preferences: UserPreferencesUI;
  searchHistory: SearchHistoryItemUI[];
  isLoading: boolean;
  error: string | null;
}

export interface LoadingStateUI {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  error?: string | null;
}

export interface PaginationStateUI {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// MODAL & DIALOG UI TYPES
// ============================================================================

export interface ModalStateUI {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
}

export interface ToastUI {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  autoClose?: boolean;
}

// ============================================================================
// FORM UI TYPES
// ============================================================================

export interface FormFieldUI {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox';
  value: any;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  options?: Array<{ value: any; label: string }>;
}

export interface FormStateUI {
  data: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// ============================================================================
// SETTINGS UI TYPES
// ============================================================================

export interface UserSettingsUI {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es';
  autoSave: boolean;
  notifications: boolean;
  defaultDescriptionStyle: DescriptionStyle;
  maxHistoryItems: number;
  exportFormat: 'json' | 'csv' | 'pdf';
}

export interface SettingsUpdateRequestUI {
  userId: string;
  settings: Partial<UserSettingsUI>;
  metadata?: {
    timestamp: string;
    source: string;
    version?: string;
  };
}
