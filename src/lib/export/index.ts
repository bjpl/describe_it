/**
 * Export Library Entry Point
 * Provides comprehensive export functionality for the Vocabulary Learning App
 */

// Type exports
export type {
  ExportFormat,
  ExportCategory,
  ExportOptions,
  AnkiExportOptions,
  CSVExportOptions,
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
  SessionExportItem,
  ImageExportItem,
  ExportData,
  ExportResult,
  BatchExportRequest,
  BatchExportResult,
  ExportTemplate,
  ScheduledExport,
  IExportManager,
  ExportEvent,
  ExportHistoryItem,
} from "../../types/export";

// Core exporters
export * from "./csvExporter";
export * from "./jsonExporter";
// export * from "./pdfExporter"; // Temporarily disabled due to type conflicts
export * from "./ankiExporter";
export * from "./exportManager";

// Re-export commonly used functions for convenience
export {
  ExportManager,
  createExportManager,
  DEFAULT_EXPORT_OPTIONS,
} from "./exportManager";

// export { exportToPDF, exportStudySheet } from "./pdfExporter"; // Temporarily disabled


export {
  exportToAnki,
  exportVocabularyToAnki,
  downloadAnkiDeck,
} from "./ankiExporter";

export {
  exportToJSON,
  exportToCompactJSON,
  exportToFullJSON,
  downloadJSON,
  parseImportedJSON,
  normalizeDataForJSON,
} from "./jsonExporter";

export {
  CSVExporter,
  exportToEnhancedCSV,
  downloadEnhancedCSV,
  exportAllData as exportAllDataToCSV,
} from "./csvExporter";

/**
 * Quick export functions for common use cases
 */

import { ExportManager, createExportManager } from "./exportManager";
import { DEFAULT_EXPORT_OPTIONS } from "./exportManager";
import type {
  ExportOptions,
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
  SessionExportItem,
  ImageExportItem,
  ExportFormat,
} from "../../types/export";

/**
 * Quick vocabulary export to specified format
 */
export async function quickVocabularyExport(
  vocabulary: VocabularyExportItem[],
  format: ExportFormat = "csv",
): Promise<void> {
  // Create a mock data sources object for the export manager
  const dataSources = {
    getVocabulary: async () => vocabulary,
    getDescriptions: async () => [],
    getQA: async () => [],
    getSessions: async () => [],
    getImages: async () => [],
  };

  const exportManager = createExportManager(dataSources);

  const options: ExportOptions = {
    format,
    categories: ["vocabulary"],
    includeMetadata: true,
  };

  const result = await exportManager.exportData(options);

  if (result.success && result.blob) {
    exportManager.downloadExport(result);
  } else {
    throw new Error(result.error || "Export failed");
  }
}

/**
 * Quick study sheet export (PDF format)
 */
export async function quickStudySheetExport(
  vocabulary: VocabularyExportItem[],
): Promise<void> {
  return quickVocabularyExport(vocabulary, "pdf");
}

/**
 * Quick Anki deck export
 */
export async function quickAnkiExport(
  vocabulary: VocabularyExportItem[],
): Promise<void> {
  return quickVocabularyExport(vocabulary, "anki");
}

/**
 * Quick comprehensive data backup (JSON)
 */
export async function quickDataBackup(
  vocabulary: VocabularyExportItem[],
  descriptions: DescriptionExportItem[] = [],
  qa: QAExportItem[] = [],
  sessions: SessionExportItem[] = [],
  images: ImageExportItem[] = [],
): Promise<void> {
  const dataSources = {
    getVocabulary: async () => vocabulary,
    getDescriptions: async () => descriptions,
    getQA: async () => qa,
    getSessions: async () => sessions,
    getImages: async () => images,
  };

  const exportManager = createExportManager(dataSources);

  const options: ExportOptions = {
    format: "json",
    categories: ["all"],
    includeMetadata: true,
  };

  const result = await exportManager.exportData(options);

  if (result.success && result.blob) {
    exportManager.downloadExport(result);
  } else {
    throw new Error(result.error || "Backup failed");
  }
}

/**
 * Export template presets for common scenarios
 */
export const EXPORT_PRESETS = {
  /**
   * Basic vocabulary list for review
   */
  VOCABULARY_REVIEW: {
    format: "csv" as ExportFormat,
    categories: ["vocabulary"] as const,
    csvOptions: {
      includeHeaders: true,
      quoteStrings: true,
    },
  },

  /**
   * Study sheet for printing
   */
  STUDY_SHEET: {
    format: "pdf" as ExportFormat,
    categories: ["vocabulary"] as const,
    pdfOptions: {
      studySheetFormat: true,
      pageSize: "A4" as const,
      orientation: "portrait" as const,
      sections: {
        vocabulary: true,
        summary: false,
      },
    },
  },

  /**
   * Anki flashcards
   */
  FLASHCARDS: {
    format: "anki" as ExportFormat,
    categories: ["vocabulary", "qa"] as const,
    ankiOptions: {
      deckName: "Language Learning Deck",
      noteType: "basic" as const,
      includeImages: false,
    },
  },

  /**
   * Progress report with charts
   */
  PROGRESS_REPORT: {
    format: "csv" as ExportFormat,
    categories: ["vocabulary", "session"] as const,
    csvOptions: {
      includeHeaders: true,
      quoteStrings: true,
    },
  },

  /**
   * Complete data backup
   */
  FULL_BACKUP: {
    format: "json" as ExportFormat,
    categories: ["all"] as const,
    includeMetadata: true,
    includeMedia: false,
  },

  /**
   * Weekly progress summary
   */
  WEEKLY_SUMMARY: {
    format: "pdf" as ExportFormat,
    categories: ["vocabulary", "descriptions", "qa"] as const,
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date(),
    },
    pdfOptions: {
      sections: {
        vocabulary: true,
        descriptions: true,
        qa: true,
        summary: true,
      },
    },
  },
};

/**
 * Utility function to get recommended export format based on data size
 */
export function getRecommendedFormat(itemCount: number): ExportFormat {
  if (itemCount < 50) {
    return "pdf"; // Good for small datasets, readable format
  } else if (itemCount < 500) {
    return "csv"; // Good for medium datasets
  } else if (itemCount < 2000) {
    return "csv"; // Good for large datasets, lightweight
  } else {
    return "json"; // Best for very large datasets, structured format
  }
}

/**
 * Utility function to estimate export file size
 */
export function estimateExportSize(
  itemCount: number,
  format: ExportFormat,
): string {
  const baseSize = itemCount * 100; // Rough estimate: 100 bytes per item

  const multipliers = {
    csv: 0.5,
    json: 1.0,
    pdf: 2.0,
    anki: 0.8,
  };

  const estimatedBytes = baseSize * (multipliers[format] || 1);

  if (estimatedBytes < 1024) {
    return `${Math.round(estimatedBytes)} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${Math.round(estimatedBytes / 1024)} KB`;
  } else {
    return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
  }
}

/**
 * Validation helper for export data
 */
export function validateExportData(
  vocabulary?: VocabularyExportItem[],
  descriptions?: DescriptionExportItem[],
  qa?: QAExportItem[],
  sessions?: SessionExportItem[],
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one data type has content
  const hasData =
    (vocabulary && vocabulary.length > 0) ||
    (descriptions && descriptions.length > 0) ||
    (qa && qa.length > 0) ||
    (sessions && sessions.length > 0);

  if (!hasData) {
    errors.push("No data available for export");
  }

  // Validate vocabulary items
  if (vocabulary) {
    vocabulary.forEach((item, index) => {
      if (!item.phrase) {
        errors.push(`Vocabulary item ${index + 1}: Missing phrase`);
      }
      if (!item.definition) {
        errors.push(`Vocabulary item ${index + 1}: Missing definition`);
      }
    });
  }

  // Validate descriptions
  if (descriptions) {
    descriptions.forEach((item, index) => {
      if (!item.content) {
        errors.push(`Description ${index + 1}: Missing content`);
      }
      if (!item.style) {
        errors.push(`Description ${index + 1}: Missing style`);
      }
    });
  }

  // Validate Q&A pairs
  if (qa) {
    qa.forEach((item, index) => {
      if (!item.question) {
        errors.push(`Q&A pair ${index + 1}: Missing question`);
      }
      if (!item.answer) {
        errors.push(`Q&A pair ${index + 1}: Missing answer`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
