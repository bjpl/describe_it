/**
 * Enhanced Export Types and Interfaces
 * Supporting multiple export formats and advanced filtering options
 */

// Core Export Formats
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'anki' | 'excel';

// Export Data Categories
export type ExportCategory = 
  | 'vocabulary' 
  | 'descriptions' 
  | 'qa' 
  | 'phrases' 
  | 'session' 
  | 'images'
  | 'all';

// Enhanced Export Options
export interface ExportOptions {
  format: ExportFormat;
  categories: ExportCategory[];
  
  // Date filtering
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  // Content filtering
  includeMedia?: boolean;
  includeMetadata?: boolean;
  
  // Category-specific filters
  vocabularyFilters?: {
    difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
    partOfSpeech?: string[];
    minWordCount?: number;
  };
  
  descriptionFilters?: {
    styles?: ('detailed' | 'simple' | 'creative' | 'technical' | 'educational' | 'artistic')[];
    minLength?: number;
    language?: string;
  };
  
  qaFilters?: {
    categories?: string[];
    difficulty?: string[];
    minConfidence?: number;
  };
  
  // Format-specific options
  pdfOptions?: PDFExportOptions;
  excelOptions?: ExcelExportOptions;
  ankiOptions?: AnkiExportOptions;
  csvOptions?: CSVExportOptions;
}

// PDF Export Configuration
export interface PDFExportOptions {
  pageSize?: 'A4' | 'Letter' | 'A3';
  orientation?: 'portrait' | 'landscape';
  includeImages?: boolean;
  studySheetFormat?: boolean;
  fontSize?: number;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  branding?: {
    includeHeader?: boolean;
    includeFooter?: boolean;
    title?: string;
  };
  sections?: {
    vocabulary?: boolean;
    descriptions?: boolean;
    qa?: boolean;
    summary?: boolean;
  };
}

// Excel Export Configuration
export interface ExcelExportOptions {
  worksheets?: string[]; // Separate sheets for different data types
  formatting?: {
    headers?: boolean;
    autoWidth?: boolean;
    freezePanes?: boolean;
  };
  charts?: {
    progressChart?: boolean;
    categoryBreakdown?: boolean;
    timelineChart?: boolean;
  };
  conditional?: {
    difficultyColors?: boolean;
    progressBars?: boolean;
  };
}

// Anki Deck Configuration
export interface AnkiExportOptions {
  deckName?: string;
  noteType?: 'basic' | 'cloze' | 'image-occlusion';
  tags?: string[];
  includeImages?: boolean;
  mediaFolder?: string;
  cardTemplate?: {
    front?: string;
    back?: string;
    css?: string;
  };
}

// CSV Export Configuration  
export interface CSVExportOptions {
  delimiter?: ',' | ';' | '\t';
  encoding?: 'utf-8' | 'utf-16' | 'ascii';
  includeHeaders?: boolean;
  quoteStrings?: boolean;
  escapeHtml?: boolean;
}

// Export Data Structures
export interface VocabularyExportItem {
  phrase: string;
  translation: string;
  definition: string;
  partOfSpeech: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  context: string;
  category: string;
  imageId?: string;
  imageUrl?: string;
  dateAdded: string;
  lastReviewed?: string;
  reviewCount?: number;
  confidence?: number;
}

export interface DescriptionExportItem {
  id: string;
  imageId: string;
  imageUrl?: string;
  style: string;
  content: string;
  wordCount: number;
  language: string;
  createdAt: string;
  generationTime?: number;
  metadata?: Record<string, any>;
}

export interface QAExportItem {
  id: string;
  imageId: string;
  imageUrl?: string;
  question: string;
  answer: string;
  category?: string;
  difficulty?: string;
  confidence?: number;
  createdAt: string;
  responseTime?: number;
  correct?: boolean;
  userAnswer?: string;
}

export interface SessionExportItem {
  timestamp: string;
  sessionId: string;
  activityType: string;
  content: string;
  details: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ImageExportItem {
  id: string;
  url: string;
  originalUrl?: string;
  description?: string;
  altDescription?: string;
  photographer: string;
  photographerUrl?: string;
  source: string;
  width: number;
  height: number;
  color?: string;
  tags?: string[];
  downloadedAt?: string;
}

// Comprehensive Export Data
export interface ExportData {
  metadata: {
    exportId: string;
    createdAt: string;
    format: ExportFormat;
    options: ExportOptions;
    totalItems: number;
    categories: ExportCategory[];
    version: string;
    user?: {
      id?: string;
      sessionId: string;
    };
  };
  
  vocabulary?: VocabularyExportItem[];
  descriptions?: DescriptionExportItem[];
  qa?: QAExportItem[];
  phrases?: VocabularyExportItem[];  // Using same structure
  sessions?: SessionExportItem[];
  images?: ImageExportItem[];
  
  summary?: {
    totalVocabulary: number;
    totalDescriptions: number;
    totalQA: number;
    totalSessions: number;
    totalImages: number;
    dateRange: {
      start: string;
      end: string;
    };
    categories: Record<string, number>;
    progress: {
      beginnerWords: number;
      intermediateWords: number;
      advancedWords: number;
    };
  };
}

// Export Results
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  size: number;
  downloadUrl?: string;
  blob?: Blob;
  error?: string;
  duration: number;
  itemsExported: number;
}

// Batch Export Operations
export interface BatchExportRequest {
  exports: {
    format: ExportFormat;
    options: ExportOptions;
    filename?: string;
  }[];
  parallel?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchExportResult {
  results: ExportResult[];
  totalDuration: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

// Export Templates
export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  options: ExportOptions;
  isDefault?: boolean;
  createdAt: string;
  lastUsed?: string;
  useCount?: number;
}

// Scheduled Export
export interface ScheduledExport {
  id: string;
  name: string;
  template: ExportTemplate;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  destination?: {
    type: 'download' | 'email' | 'cloud';
    config?: Record<string, any>;
  };
}

// Export Manager Interface
export interface IExportManager {
  // Core export functions
  exportData(options: ExportOptions): Promise<ExportResult>;
  batchExport(request: BatchExportRequest): Promise<BatchExportResult>;
  
  // Template management
  saveTemplate(template: Omit<ExportTemplate, 'id' | 'createdAt'>): Promise<ExportTemplate>;
  loadTemplate(id: string): Promise<ExportTemplate | null>;
  listTemplates(): Promise<ExportTemplate[]>;
  deleteTemplate(id: string): Promise<void>;
  
  // Scheduled exports
  scheduleExport(exportData: ScheduledExport): Promise<void>;
  cancelScheduledExport(id: string): Promise<void>;
  listScheduledExports(): Promise<ScheduledExport[]>;
  
  // Utility functions
  validateOptions(options: ExportOptions): boolean;
  estimateSize(options: ExportOptions): Promise<number>;
  previewData(options: ExportOptions): Promise<any>;
}

// Export Event Types
export interface ExportEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  exportId: string;
  format: ExportFormat;
  progress?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

// Export History
export interface ExportHistoryItem {
  id: string;
  format: ExportFormat;
  filename: string;
  size: number;
  itemCount: number;
  duration: number;
  success: boolean;
  error?: string;
  createdAt: string;
  options: ExportOptions;
}