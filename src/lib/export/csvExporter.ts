/**
 * Enhanced CSV Export Utilities for Vocabulary Learning App
 * Provides functions to export vocabulary, responses, and session data with advanced formatting
 */

import { saveAs } from "file-saver";
import {
  ExportData,
  CSVExportOptions,
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
  SessionExportItem,
} from "../../types/export";
import { VocabularyItem } from "../../types/unified";

export interface ResponseItem {
  question: string;
  user_answer: string;
  correct_answer: string;
  timestamp: string;
}

export interface SessionData {
  timestamp: string;
  activity_type: "vocabulary" | "qa" | "search" | "description";
  content: string;
  details: string;
}

/**
 * Converts array of objects to CSV format
 */
function arrayToCSV(data: any[], headers: string[]): string {
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] || "";
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(",") ||
        escaped.includes("\n") ||
        escaped.includes('"')
        ? `"${escaped}"`
        : escaped;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Downloads CSV content as a file
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export vocabulary data to CSV
 * Saves as target_word_list.csv
 */
export function exportVocabulary(vocabularyData: VocabularyExportItem[]): void {
  try {
    const headers = [
      "spanish_text",
      "english_translation",
      "category",
      "part_of_speech",
      "difficulty_level",
      "created_at",
    ];
    const csvContent = arrayToCSV(vocabularyData, headers);
    downloadCSV(csvContent, "target_word_list.csv");
    console.log("Vocabulary exported successfully");
  } catch (error) {
    console.error("Error exporting vocabulary:", error);
    throw new Error("Failed to export vocabulary data");
  }
}

/**
 * Export Q&A responses to CSV
 * Saves as responses_export.csv
 */
export function exportResponses(responsesData: ResponseItem[]): void {
  try {
    const headers = ["question", "user_answer", "correct_answer", "timestamp"];
    const csvContent = arrayToCSV(responsesData, headers);
    downloadCSV(csvContent, "responses_export.csv");
    console.log("Responses exported successfully");
  } catch (error) {
    console.error("Error exporting responses:", error);
    throw new Error("Failed to export responses data");
  }
}

/**
 * Export comprehensive session data to CSV
 * Includes all activity with timestamps
 */
export function exportSession(sessionData: SessionData[]): void {
  try {
    const headers = ["timestamp", "activity_type", "content", "details"];
    const csvContent = arrayToCSV(sessionData, headers);
    const timestamp = new Date().toISOString().split("T")[0];
    downloadCSV(csvContent, `session_export_${timestamp}.csv`);
    console.log("Session exported successfully");
  } catch (error) {
    console.error("Error exporting session:", error);
    throw new Error("Failed to export session data");
  }
}

/**
 * Helper function to format current date for exports
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Helper function to format current timestamp for exports
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validate export data before processing
 */
export function validateExportData(
  data: any[],
  requiredFields: string[],
): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  return data.every((item) =>
    requiredFields.every((field) => item.hasOwnProperty(field)),
  );
}

/**
 * Enhanced CSV Exporter Class
 */
export class CSVExporter {
  private options: CSVExportOptions;

  constructor(options: CSVExportOptions = {}) {
    this.options = {
      delimiter: ",",
      encoding: "utf-8",
      includeHeaders: true,
      quoteStrings: true,
      escapeHtml: false,
      ...options,
    };
  }

  /**
   * Export comprehensive data to CSV format
   */
  async exportToCSV(data: ExportData): Promise<Blob> {
    try {
      const csvSections: string[] = [];

      // Add metadata section
      if (data.metadata) {
        csvSections.push(this.createMetadataSection(data.metadata));
      }

      // Add each data type as a section
      if (data.vocabulary && data.vocabulary.length > 0) {
        csvSections.push(this.createVocabularySection(data.vocabulary));
      }

      if (data.descriptions && data.descriptions.length > 0) {
        csvSections.push(this.createDescriptionsSection(data.descriptions));
      }

      if (data.qa && data.qa.length > 0) {
        csvSections.push(this.createQASection(data.qa));
      }

      if (data.sessions && data.sessions.length > 0) {
        csvSections.push(this.createSessionsSection(data.sessions));
      }

      // Add summary section
      if (data.summary) {
        csvSections.push(this.createSummarySection(data.summary));
      }

      const csvContent = csvSections.join("\n\n");

      return new Blob([csvContent], {
        type: `text/csv;charset=${this.options.encoding}`,
      });
    } catch (error) {
      console.error("Error generating CSV export:", error);
      throw new Error("Failed to generate CSV export");
    }
  }

  /**
   * Create metadata section
   */
  private createMetadataSection(metadata: any): string {
    const lines = [
      "# EXPORT METADATA",
      `Export ID${this.options.delimiter}${metadata.exportId}`,
      `Created At${this.options.delimiter}${metadata.createdAt}`,
      `Format${this.options.delimiter}${metadata.format}`,
      `Total Items${this.options.delimiter}${metadata.totalItems}`,
      `Categories${this.options.delimiter}${metadata.categories.join("; ")}`,
      `Version${this.options.delimiter}${metadata.version}`,
    ];

    return lines.join("\n");
  }

  /**
   * Create vocabulary section
   */
  private createVocabularySection(vocabulary: VocabularyExportItem[]): string {
    const headers = [
      "Phrase",
      "Translation",
      "Definition",
      "Part of Speech",
      "Difficulty",
      "Category",
      "Context",
      "Date Added",
      "Last Reviewed",
      "Review Count",
      "Confidence Score",
    ];

    const lines = ["# VOCABULARY"];

    if (this.options.includeHeaders) {
      lines.push(headers.join(this.options.delimiter));
    }

    vocabulary.forEach((item) => {
      const values = [
        item.phrase,
        item.translation,
        item.definition,
        item.partOfSpeech,
        item.difficulty,
        item.category,
        item.context,
        item.dateAdded,
        item.lastReviewed || "Never",
        item.reviewCount?.toString() || "0",
        item.confidence?.toString() || "0",
      ];

      lines.push(this.formatCSVRow(values));
    });

    return lines.join("\n");
  }

  /**
   * Create descriptions section
   */
  private createDescriptionsSection(
    descriptions: DescriptionExportItem[],
  ): string {
    const headers = [
      "ID",
      "Image ID",
      "Style",
      "Content",
      "Word Count",
      "Language",
      "Created At",
      "Generation Time (ms)",
    ];

    const lines = ["# DESCRIPTIONS"];

    if (this.options.includeHeaders) {
      lines.push(headers.join(this.options.delimiter));
    }

    descriptions.forEach((item) => {
      const values = [
        item.id,
        item.imageId,
        item.style,
        item.content,
        item.wordCount.toString(),
        item.language,
        item.createdAt,
        item.generationTime?.toString() || "0",
      ];

      lines.push(this.formatCSVRow(values));
    });

    return lines.join("\n");
  }

  /**
   * Create Q&A section
   */
  private createQASection(qa: QAExportItem[]): string {
    const headers = [
      "ID",
      "Question",
      "Answer",
      "Category",
      "Difficulty",
      "Confidence",
      "Created At",
      "Response Time (ms)",
      "Correct",
      "User Answer",
    ];

    const lines = ["# QUESTIONS & ANSWERS"];

    if (this.options.includeHeaders) {
      lines.push(headers.join(this.options.delimiter));
    }

    qa.forEach((item) => {
      const values = [
        item.id,
        item.question,
        item.answer,
        item.category || "General",
        item.difficulty || "Medium",
        item.confidence?.toString() || "0",
        item.createdAt,
        item.responseTime?.toString() || "0",
        item.correct ? "Yes" : "No",
        item.userAnswer || "",
      ];

      lines.push(this.formatCSVRow(values));
    });

    return lines.join("\n");
  }

  /**
   * Create sessions section
   */
  private createSessionsSection(sessions: SessionExportItem[]): string {
    const headers = [
      "Timestamp",
      "Session ID",
      "Activity Type",
      "Content",
      "Details",
      "Duration (ms)",
    ];

    const lines = ["# SESSIONS"];

    if (this.options.includeHeaders) {
      lines.push(headers.join(this.options.delimiter));
    }

    sessions.forEach((item) => {
      const values = [
        item.timestamp,
        item.sessionId,
        item.activityType,
        item.content,
        item.details,
        item.duration?.toString() || "0",
      ];

      lines.push(this.formatCSVRow(values));
    });

    return lines.join("\n");
  }

  /**
   * Create summary section
   */
  private createSummarySection(summary: any): string {
    const lines = [
      "# SUMMARY STATISTICS",
      `Total Vocabulary${this.options.delimiter}${summary.totalVocabulary || 0}`,
      `Total Descriptions${this.options.delimiter}${summary.totalDescriptions || 0}`,
      `Total Q&A${this.options.delimiter}${summary.totalQA || 0}`,
      `Total Sessions${this.options.delimiter}${summary.totalSessions || 0}`,
      `Date Range Start${this.options.delimiter}${summary.dateRange?.start || "N/A"}`,
      `Date Range End${this.options.delimiter}${summary.dateRange?.end || "N/A"}`,
      `Beginner Words${this.options.delimiter}${summary.progress?.beginnerWords || 0}`,
      `Intermediate Words${this.options.delimiter}${summary.progress?.intermediateWords || 0}`,
      `Advanced Words${this.options.delimiter}${summary.progress?.advancedWords || 0}`,
    ];

    // Add category breakdown
    if (summary.categories) {
      lines.push("");
      lines.push("# CATEGORY BREAKDOWN");
      Object.entries(summary.categories).forEach(([category, count]) => {
        lines.push(`${category}${this.options.delimiter}${count}`);
      });
    }

    return lines.join("\n");
  }

  /**
   * Format a single CSV row with proper escaping
   */
  private formatCSVRow(values: string[]): string {
    return values
      .map((value) => {
        let processedValue = value || "";

        // Escape HTML if requested
        if (this.options.escapeHtml) {
          processedValue = processedValue
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }

        // Handle quotes and special characters
        if (this.options.quoteStrings) {
          const needsQuoting =
            processedValue.includes(this.options.delimiter!) ||
            processedValue.includes("\n") ||
            processedValue.includes("\r") ||
            processedValue.includes('"');

          if (needsQuoting) {
            processedValue = `"${processedValue.replace(/"/g, '""')}"`;
          }
        }

        return processedValue;
      })
      .join(this.options.delimiter);
  }
}

/**
 * Export data to enhanced CSV format
 */
export async function exportToEnhancedCSV(
  data: ExportData,
  options: CSVExportOptions = {},
): Promise<Blob> {
  const exporter = new CSVExporter(options);
  return await exporter.exportToCSV(data);
}

/**
 * Export all data types in a single comprehensive CSV operation
 * Creates multiple CSV files for complete data export
 */
export async function exportAllData(
  vocabularyData: VocabularyExportItem[],
  responsesData: ResponseItem[],
  sessionData: SessionData[],
): Promise<void> {
  try {
    const timestamp = getCurrentDateString();

    // Export each data type with timestamped filenames
    if (vocabularyData.length > 0) {
      const vocabHeaders = ["phrase", "translation", "category", "date_added"];
      const vocabCSV = arrayToCSV(vocabularyData, vocabHeaders);
      downloadCSV(vocabCSV, `vocabulary_export_${timestamp}.csv`);
    }

    if (responsesData.length > 0) {
      const responseHeaders = [
        "question",
        "user_answer",
        "correct_answer",
        "timestamp",
      ];
      const responseCSV = arrayToCSV(responsesData, responseHeaders);
      downloadCSV(responseCSV, `responses_export_${timestamp}.csv`);
    }

    if (sessionData.length > 0) {
      const sessionHeaders = [
        "timestamp",
        "activity_type",
        "content",
        "details",
      ];
      const sessionCSV = arrayToCSV(sessionData, sessionHeaders);
      downloadCSV(sessionCSV, `session_export_${timestamp}.csv`);
    }

    console.log("All data exported successfully");
  } catch (error) {
    console.error("Error exporting all data:", error);
    throw new Error("Failed to export all data");
  }
}

/**
 * Download CSV file with enhanced options
 */
export function downloadEnhancedCSV(blob: Blob, filename: string): void {
  saveAs(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}
