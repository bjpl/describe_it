/**
 * Unified Export System - Epsilon-5 Integration
 * Consolidates all CSV exports into a single system
 */

import { exportResponses } from "./csvExporter";
import { SessionReportGenerator } from "../logging/sessionReportGenerator";
import { getSessionLogger } from "../logging/sessionLogger";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

export interface ExportData {
  descriptions?: Array<{
    imageId: string;
    imageUrl: string;
    style: string;
    english: string;
    spanish: string;
    timestamp: string;
  }>;

  qaResponses?: Array<{
    question: string;
    user_answer: string;
    correct_answer: string;
    timestamp: string;
  }>;

  vocabulary?: Array<{
    spanish: string;
    english: string;
    category: string;
    difficulty: string;
    context?: string;
    timestamp: string;
  }>;

  sessionData?: Array<{
    interaction_type: string;
    component: string;
    data: string;
    timestamp: string;
  }>;
}

export interface ExportOptions {
  format: "csv" | "json";
  includeDescriptions: boolean;
  includeQA: boolean;
  includeVocabulary: boolean;
  includeSessionData: boolean;
  filename?: string;
}

export class UnifiedExporter {
  private sessionLogger: ReturnType<typeof getSessionLogger> | null = null;
  private reportGenerator: SessionReportGenerator | null = null;

  private getSessionLogger() {
    if (!this.sessionLogger) {
      this.sessionLogger = getSessionLogger();
    }
    return this.sessionLogger;
  }

  private getReportGenerator() {
    if (!this.reportGenerator) {
      this.reportGenerator = new SessionReportGenerator(
        this.getSessionLogger(),
      );
    }
    return this.reportGenerator;
  }

  async exportAll(data: ExportData, options: ExportOptions): Promise<void> {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, "-");
    const baseFilename = options.filename || `describe-it-export-${timestamp}`;

    try {
      if (options.format === "json") {
        await this.exportAsJson(data, options, baseFilename);
      } else {
        // Default CSV export - create separate files for each data type
        await this.exportAsCSV(data, options, baseFilename);
      }

      // Log the export action
      this.getSessionLogger().logInteraction("export_initiated", {
        exportFormat: options.format,
        componentName: baseFilename,
      });
    } catch (error) {
      logger.error("Export failed:", error);
      this.getSessionLogger().logError(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
        "export_error"
      );
      throw error;
    }
  }

  private async exportAsCSV(
    data: ExportData,
    options: ExportOptions,
    baseFilename: string,
  ): Promise<void> {
    const exports: Array<{ filename: string; data: any[]; headers: string[] }> =
      [];

    // Descriptions CSV
    if (options.includeDescriptions && data.descriptions?.length) {
      exports.push({
        filename: `${baseFilename}-descriptions.csv`,
        data: data.descriptions,
        headers: [
          "Image ID",
          "Image URL",
          "Style",
          "English",
          "Spanish",
          "Timestamp",
        ],
      });
    }

    // Q&A Responses CSV
    if (options.includeQA && data.qaResponses?.length) {
      exports.push({
        filename: `${baseFilename}-qa-responses.csv`,
        data: data.qaResponses,
        headers: ["Question", "User Answer", "Correct Answer", "Timestamp"],
      });
    }

    // Vocabulary CSV
    if (options.includeVocabulary && data.vocabulary?.length) {
      exports.push({
        filename: `${baseFilename}-vocabulary.csv`,
        data: data.vocabulary,
        headers: [
          "Spanish",
          "English",
          "Category",
          "Difficulty",
          "Context",
          "Timestamp",
        ],
      });
    }

    // Session Data CSV
    if (options.includeSessionData && data.sessionData?.length) {
      exports.push({
        filename: `${baseFilename}-session.csv`,
        data: data.sessionData,
        headers: ["Interaction Type", "Component", "Data", "Timestamp"],
      });
    }

    // Export each CSV file
    for (const exportItem of exports) {
      this.downloadCSV(
        exportItem.filename,
        exportItem.data,
        exportItem.headers,
      );
    }
  }

  private async exportAsJson(
    data: ExportData,
    options: ExportOptions,
    baseFilename: string,
  ): Promise<void> {
    const exportData: any = {};

    if (options.includeDescriptions && data.descriptions) {
      exportData.descriptions = data.descriptions;
    }

    if (options.includeQA && data.qaResponses) {
      exportData.qaResponses = data.qaResponses;
    }

    if (options.includeVocabulary && data.vocabulary) {
      exportData.vocabulary = data.vocabulary;
    }

    if (options.includeSessionData && data.sessionData) {
      exportData.sessionData = data.sessionData;
    }

    // Add session summary
    try {
      const sessionSummary = this.getSessionLogger().generateSummary();
      exportData.sessionSummary = sessionSummary;
    } catch (error) {
      logger.warn("Could not generate session summary for export");
    }

    // Add metadata
    exportData.metadata = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      application: "Describe It - Spanish Learning App",
      hiveMindAgent: "Epsilon-5 Integration Controller",
    };

    const jsonString = safeStringify(exportData) || JSON.stringify(exportData, null, 2);
    this.downloadFile(`${baseFilename}.json`, jsonString, "application/json");
  }


  private downloadCSV(filename: string, data: any[], headers: string[]): void {
    if (!data.length) return;

    // Convert data to CSV format
    const csvContent = this.convertToCSV(data, headers);
    this.downloadFile(filename, csvContent, "text/csv");
  }

  private convertToCSV(data: any[], headers: string[]): string {
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(","));

    // Add data rows
    for (const row of data) {
      const values = Object.values(row).map((value: any) => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringValue = String(value || "");
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  private downloadFile(
    filename: string,
    content: string,
    mimeType: string,
  ): void {
    // Only works in browser environment
    if (typeof window === "undefined" || typeof document === "undefined") {
      logger.warn("Download not available in SSR environment");
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private getIncludedComponents(options: ExportOptions): string[] {
    const components = [];
    if (options.includeDescriptions) components.push("descriptions");
    if (options.includeQA) components.push("qa");
    if (options.includeVocabulary) components.push("vocabulary");
    if (options.includeSessionData) components.push("session");
    return components;
  }

  // Static methods for easy access
  static async exportDescriptions(
    descriptions: ExportData["descriptions"],
  ): Promise<void> {
    const exporter = new UnifiedExporter();
    await exporter.exportAll(
      { descriptions },
      {
        format: "csv",
        includeDescriptions: true,
        includeQA: false,
        includeVocabulary: false,
        includeSessionData: false,
      },
    );
  }

  static async exportQAResponses(
    qaResponses: ExportData["qaResponses"],
  ): Promise<void> {
    const exporter = new UnifiedExporter();
    await exporter.exportAll(
      { qaResponses },
      {
        format: "csv",
        includeDescriptions: false,
        includeQA: true,
        includeVocabulary: false,
        includeSessionData: false,
      },
    );
  }

  static async exportVocabulary(
    vocabulary: ExportData["vocabulary"],
  ): Promise<void> {
    const exporter = new UnifiedExporter();
    await exporter.exportAll(
      { vocabulary },
      {
        format: "csv",
        includeDescriptions: false,
        includeQA: false,
        includeVocabulary: true,
        includeSessionData: false,
      },
    );
  }

  static async exportSession(
    sessionData: ExportData["sessionData"],
  ): Promise<void> {
    const exporter = new UnifiedExporter();
    await exporter.exportAll(
      { sessionData },
      {
        format: "csv",
        includeDescriptions: false,
        includeQA: false,
        includeVocabulary: false,
        includeSessionData: true,
      },
    );
  }
}

// Export lazy singleton instance (client-side only)
let _unifiedExporter: UnifiedExporter | null = null;

export function getUnifiedExporter(): UnifiedExporter {
  if (typeof window === "undefined") {
    // Return a minimal mock for SSR
    return {
      exportAll: async () => {},
      static: {
        exportDescriptions: async () => {},
        exportQAResponses: async () => {},
        exportVocabulary: async () => {},
        exportSession: async () => {},
      },
    } as any;
  }

  if (!_unifiedExporter) {
    _unifiedExporter = new UnifiedExporter();
  }
  return _unifiedExporter;
}

// Export singleton instance (deprecated - use getUnifiedExporter() instead)
export const unifiedExporter = getUnifiedExporter();
