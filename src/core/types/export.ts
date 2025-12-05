/**
 * Export Types
 *
 * Type definitions for export functionality (PDF, CSV, JSON, Anki, Quizlet)
 */

import type { DifficultyLevel } from './entities';

// ============================================================================
// EXPORT REQUEST & RESPONSE
// ============================================================================

export type ExportType = 'pdf' | 'csv' | 'json' | 'txt' | 'anki' | 'quizlet';

export type ContentType = 'vocabulary' | 'phrases' | 'qa' | 'progress' | 'all';

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

export type ExportTemplate = 'minimal' | 'standard' | 'detailed';

export interface ExportFormatting {
  includeDefinitions?: boolean;
  includeExamples?: boolean;
  includeTranslations?: boolean;
  includeImages?: boolean;
  language?: string;
  template?: ExportTemplate;
}

export interface ExportRequest {
  userId: string;
  exportType: ExportType;
  contentType: ContentType;
  filters?: ExportFilters;
  formatting?: ExportFormatting;
}

export interface ExportResult {
  data: string;
  filename: string;
  contentType: string;
  note?: string;
}

export interface ExportResponse {
  success: boolean;
  data: ExportResult & {
    size: number;
    downloadUrl: string;
  };
  metadata: {
    userId: string;
    exportType: ExportType;
    contentType: ContentType;
    filters: ExportFilters;
    formatting: ExportFormatting;
    responseTime: string;
    fromCache: boolean;
    timestamp: string;
  };
}

// ============================================================================
// CONTENT ITEMS
// ============================================================================

export interface VocabularyExportItem {
  type: 'vocabulary';
  phrase: string;
  definition: string;
  category?: string;
  difficulty?: DifficultyLevel;
  partOfSpeech?: string;
  gender?: string;
  translation?: string;
  examples?: string[];
  createdAt?: string;
  confidence?: number;
  collectionName?: string;
}

export interface PhraseExportItem {
  type: 'phrase';
  phrase: string;
  definition?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  examples?: string[];
  translation?: string;
}

export interface QAExportItem {
  type: 'qa';
  question: string;
  answer: string;
  category?: string;
  difficulty?: DifficultyLevel;
  correct?: boolean;
  score?: number;
}

export interface ProgressExportItem {
  type: 'progress';
  [key: string]: unknown;
}

export type ExportContentItem =
  | VocabularyExportItem
  | PhraseExportItem
  | QAExportItem
  | ProgressExportItem;

// ============================================================================
// CACHE STRUCTURES
// ============================================================================

export interface VocabularyIndex {
  items: VocabularyExportItem[];
  lastUpdated: string;
  version: number;
}

// ============================================================================
// CSV & DATA TRANSFORMATION
// ============================================================================

export interface CSVColumn {
  key: string;
  header: string;
  required: boolean;
}

export interface ExportMetadata {
  exportType: ExportType;
  exportDate: string;
  itemCount: number;
  formatting: ExportFormatting;
}

export interface JSONExportData {
  metadata: ExportMetadata;
  content: ExportContentItem[];
}

// ============================================================================
// ANKI & QUIZLET FORMATS
// ============================================================================

export interface AnkiCard {
  front: string;
  back: string;
  tags: string[];
}

export interface QuizletCard {
  term: string;
  definition: string;
}
