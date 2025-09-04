// Session Logging Types and Interfaces

export interface SessionInteraction {
  id: string;
  timestamp: number;
  type: InteractionType;
  data: InteractionData;
  metadata?: SessionMetadata;
}

export type InteractionType =
  | "search_query"
  | "image_selected"
  | "description_generated"
  | "description_viewed"
  | "qa_generated"
  | "qa_viewed"
  | "phrase_extracted"
  | "vocabulary_selected"
  | "settings_changed"
  | "modal_opened"
  | "modal_closed"
  | "page_view"
  | "error_occurred"
  | "export_initiated"
  | "session_started"
  | "session_ended";

export interface InteractionData {
  // Search interactions
  searchQuery?: string;
  searchResultCount?: number;
  searchDuration?: number;

  // Image interactions
  imageId?: string;
  imageUrl?: string;
  imageDescription?: string;
  selectionTime?: number;

  // Description interactions
  descriptionStyle?: string;
  descriptionLanguage?: string;
  descriptionWordCount?: number;
  descriptionGenerationTime?: number;
  descriptionText?: string;

  // Q&A interactions
  questionText?: string;
  answerText?: string;
  qaDifficulty?: string;
  qaCategory?: string;
  qaGenerationTime?: number;

  // Phrase interactions
  extractedPhrases?: string[];
  phraseCategories?: Record<string, string[]>;

  // Vocabulary interactions
  selectedWords?: string[];
  vocabularyCategory?: string;

  // Settings interactions
  settingName?: string;
  oldValue?: unknown;
  newValue?: unknown;

  // Error data
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;

  // General metadata
  componentName?: string;
  duration?: number;
  userAgent?: string;
  url?: string;
}

export interface SessionMetadata {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  totalDuration?: number;
  deviceType?: "desktop" | "tablet" | "mobile";
  browserName?: string;
  language?: string;
  timezone?: string;
}

export interface SessionSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  totalInteractions: number;
  interactionBreakdown: Record<InteractionType, number>;

  // Search statistics
  totalSearches: number;
  uniqueQueries: string[];
  averageSearchTime: number;

  // Image statistics
  imagesViewed: number;
  uniqueImages: string[];
  averageSelectionTime: number;

  // Description statistics
  descriptionsGenerated: number;
  descriptionsByStyle: Record<string, number>;
  descriptionsByLanguage: Record<string, number>;
  averageDescriptionTime: number;
  totalWordsGenerated: number;

  // Q&A statistics
  questionsGenerated: number;
  questionsByDifficulty: Record<string, number>;
  questionsByCategory: Record<string, number>;
  averageQATime: number;

  // Vocabulary statistics
  phrasesExtracted: number;
  vocabularySelected: number;
  vocabularyByCategory: Record<string, number>;

  // Error statistics
  errorCount: number;
  errorsByType: Record<string, number>;

  // Learning progress
  learningScore: number;
  engagementScore: number;
  comprehensionLevel: "beginner" | "intermediate" | "advanced";

  // Export data
  exportCount: number;
  exportFormats: string[];
}

export interface LearningMetrics {
  timeSpentReading: number;
  descriptionsRead: number;
  questionsAnswered: number;
  vocabularyEncountered: number;
  repetitionPatterns: Record<string, number>;
  difficultyProgression: string[];
  focusAreas: string[];
  improvementSuggestions: string[];
}

export interface SessionReport {
  summary: SessionSummary;
  interactions: SessionInteraction[];
  learningMetrics: LearningMetrics;
  recommendations: string[];
  exportFormat: "json" | "text" | "csv";
  generatedAt: number;
}

export interface SessionStorage {
  currentSession: SessionMetadata | null;
  interactions: SessionInteraction[];
  settings: SessionLoggerSettings;
}

export interface SessionLoggerSettings {
  enabled: boolean;
  maxInteractions: number;
  persistToStorage: boolean;
  trackUserAgent: boolean;
  trackLocation: boolean;
  anonymizeData: boolean;
  autoExport: boolean;
  exportInterval: number; // minutes
}

export interface SessionPersistence {
  save(sessionId: string, data: SessionStorage): Promise<void>;
  load(sessionId: string): Promise<SessionStorage | null>;
  clear(sessionId: string): Promise<void>;
  list(): Promise<string[]>;
  export(sessionId: string, format: "json" | "text" | "csv"): Promise<string>;
}
