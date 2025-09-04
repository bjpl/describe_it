/**
 * Comprehensive Export Manager for Vocabulary Learning App
 * Orchestrates all export formats and provides advanced filtering
 */

import { saveAs } from "file-saver";
import {
  ExportData,
  ExportOptions,
  ExportResult,
  BatchExportRequest,
  BatchExportResult,
  ExportTemplate,
  ScheduledExport,
  IExportManager,
  ExportEvent,
  ExportHistoryItem,
  ExportFormat,
  ExportCategory,
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
  SessionExportItem,
  ImageExportItem,
} from "../../types/export";

// Import all exporters
import { exportToPDF } from "./pdfExporter";
import { exportToExcel } from "./excelExporter";
import { exportToAnki } from "./ankiExporter";
import { exportToJSON } from "./jsonExporter";
import { exportAllData as exportToCSV } from "./csvExporter";

interface DataSources {
  getVocabulary: (filters?: any) => Promise<VocabularyExportItem[]>;
  getDescriptions: (filters?: any) => Promise<DescriptionExportItem[]>;
  getQA: (filters?: any) => Promise<QAExportItem[]>;
  getSessions: (filters?: any) => Promise<SessionExportItem[]>;
  getImages: (filters?: any) => Promise<ImageExportItem[]>;
}

export class ExportManager implements IExportManager {
  private dataSources: DataSources;
  private templates: Map<string, ExportTemplate> = new Map();
  private scheduledExports: Map<string, ScheduledExport> = new Map();
  private exportHistory: ExportHistoryItem[] = [];
  private eventListeners: ((event: ExportEvent) => void)[] = [];

  constructor(dataSources: DataSources) {
    this.dataSources = dataSources;
    this.loadTemplatesFromStorage();
    this.loadScheduledExportsFromStorage();
    this.loadHistoryFromStorage();
  }

  /**
   * Main export function with comprehensive filtering and options
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.emitEvent({
        type: "start",
        exportId,
        format: options.format,
        timestamp: new Date().toISOString(),
      });

      // Validate options
      if (!this.validateOptions(options)) {
        throw new Error("Invalid export options");
      }

      // Gather filtered data
      const data = await this.gatherFilteredData(options, exportId);

      this.emitEvent({
        type: "progress",
        exportId,
        format: options.format,
        progress: 50,
        data: { message: "Data gathered, generating export..." },
        timestamp: new Date().toISOString(),
      });

      // Generate export based on format
      const blob = await this.generateExport(data, options);

      const duration = Date.now() - startTime;
      const result: ExportResult = {
        success: true,
        format: options.format,
        filename: this.generateFilename(options),
        size: blob.size,
        blob,
        duration,
        itemsExported: data.metadata.totalItems,
      };

      // Record in history
      this.recordExport(result, options);

      this.emitEvent({
        type: "complete",
        exportId,
        format: options.format,
        data: result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const duration = Date.now() - startTime;

      this.emitEvent({
        type: "error",
        exportId,
        format: options.format,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        format: options.format,
        filename: "",
        size: 0,
        duration,
        itemsExported: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Batch export multiple formats
   */
  async batchExport(request: BatchExportRequest): Promise<BatchExportResult> {
    const startTime = Date.now();
    const results: ExportResult[] = [];
    const errors: string[] = [];

    if (request.parallel) {
      // Parallel execution
      const promises = request.exports.map(async (exportConfig) => {
        try {
          return await this.exportData(exportConfig.options);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${exportConfig.format}: ${errorMessage}`);
          return null;
        }
      });

      const parallelResults = await Promise.all(promises);
      results.push(...(parallelResults.filter(Boolean) as ExportResult[]));
    } else {
      // Sequential execution
      for (let i = 0; i < request.exports.length; i++) {
        const exportConfig = request.exports[i];

        if (request.onProgress) {
          request.onProgress(i, request.exports.length);
        }

        try {
          const result = await this.exportData(exportConfig.options);
          results.push(result);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${exportConfig.format}: ${errorMessage}`);
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;

    return {
      results,
      totalDuration,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  /**
   * Gather and filter data based on export options
   */
  private async gatherFilteredData(
    options: ExportOptions,
    exportId: string,
  ): Promise<ExportData> {
    const data: ExportData = {
      metadata: {
        exportId,
        createdAt: new Date().toISOString(),
        format: options.format,
        options,
        totalItems: 0,
        categories: options.categories,
        version: "2.0.0",
      },
    };

    // Vocabulary
    if (
      options.categories.includes("vocabulary") ||
      options.categories.includes("all")
    ) {
      const filters = this.buildVocabularyFilters(options);
      data.vocabulary = await this.dataSources.getVocabulary(filters);
    }

    // Descriptions
    if (
      options.categories.includes("descriptions") ||
      options.categories.includes("all")
    ) {
      const filters = this.buildDescriptionFilters(options);
      data.descriptions = await this.dataSources.getDescriptions(filters);
    }

    // Q&A
    if (
      options.categories.includes("qa") ||
      options.categories.includes("all")
    ) {
      const filters = this.buildQAFilters(options);
      data.qa = await this.dataSources.getQA(filters);
    }

    // Sessions
    if (
      options.categories.includes("session") ||
      options.categories.includes("all")
    ) {
      const filters = this.buildSessionFilters(options);
      data.sessions = await this.dataSources.getSessions(filters);
    }

    // Images
    if (
      options.categories.includes("images") ||
      options.categories.includes("all")
    ) {
      const filters = this.buildImageFilters(options);
      data.images = await this.dataSources.getImages(filters);
    }

    // Calculate totals and summary
    data.metadata.totalItems = this.calculateTotalItems(data);
    data.summary = this.generateSummary(data);

    return data;
  }

  /**
   * Build vocabulary-specific filters
   */
  private buildVocabularyFilters(options: ExportOptions): any {
    const filters: any = {};

    if (options.dateRange) {
      filters.dateRange = options.dateRange;
    }

    if (options.vocabularyFilters) {
      if (options.vocabularyFilters.difficulty) {
        filters.difficulty = options.vocabularyFilters.difficulty;
      }
      if (options.vocabularyFilters.partOfSpeech) {
        filters.partOfSpeech = options.vocabularyFilters.partOfSpeech;
      }
      if (options.vocabularyFilters.minWordCount) {
        filters.minWordCount = options.vocabularyFilters.minWordCount;
      }
    }

    return filters;
  }

  /**
   * Build description-specific filters
   */
  private buildDescriptionFilters(options: ExportOptions): any {
    const filters: any = {};

    if (options.dateRange) {
      filters.dateRange = options.dateRange;
    }

    if (options.descriptionFilters) {
      if (options.descriptionFilters.styles) {
        filters.styles = options.descriptionFilters.styles;
      }
      if (options.descriptionFilters.minLength) {
        filters.minLength = options.descriptionFilters.minLength;
      }
      if (options.descriptionFilters.language) {
        filters.language = options.descriptionFilters.language;
      }
    }

    return filters;
  }

  /**
   * Build Q&A-specific filters
   */
  private buildQAFilters(options: ExportOptions): any {
    const filters: any = {};

    if (options.dateRange) {
      filters.dateRange = options.dateRange;
    }

    if (options.qaFilters) {
      if (options.qaFilters.categories) {
        filters.categories = options.qaFilters.categories;
      }
      if (options.qaFilters.difficulty) {
        filters.difficulty = options.qaFilters.difficulty;
      }
      if (options.qaFilters.minConfidence) {
        filters.minConfidence = options.qaFilters.minConfidence;
      }
    }

    return filters;
  }

  /**
   * Build session-specific filters
   */
  private buildSessionFilters(options: ExportOptions): any {
    const filters: any = {};

    if (options.dateRange) {
      filters.dateRange = options.dateRange;
    }

    return filters;
  }

  /**
   * Build image-specific filters
   */
  private buildImageFilters(options: ExportOptions): any {
    const filters: any = {};

    if (options.dateRange) {
      filters.dateRange = options.dateRange;
    }

    if (!options.includeMedia) {
      filters.metadataOnly = true;
    }

    return filters;
  }

  /**
   * Generate export based on format
   */
  private async generateExport(
    data: ExportData,
    options: ExportOptions,
  ): Promise<Blob> {
    switch (options.format) {
      case "pdf":
        return await exportToPDF(data, options.pdfOptions);

      case "excel":
        return await exportToExcel(data, options.excelOptions);

      case "anki":
        return await exportToAnki(data, options.ankiOptions);

      case "json":
        return await exportToJSON(data);

      case "csv":
        // Convert to CSV format (reuse existing function)
        const csvData = {
          vocabulary: data.vocabulary || [],
          descriptions: data.descriptions || [],
          qa: data.qa || [],
          sessions: data.sessions || [],
        };

        // For now, create a simple CSV blob - this could be enhanced
        const csvContent = this.convertToCSV(csvData);
        return new Blob([csvContent], { type: "text/csv;charset=utf-8" });

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Simple CSV conversion helper
   */
  private convertToCSV(data: any): string {
    const lines: string[] = [];

    // Add each data type as a section
    Object.entries(data).forEach(([type, items]: [string, any[]]) => {
      if (items.length > 0) {
        lines.push(`\n# ${type.toUpperCase()}`);
        const headers = Object.keys(items[0]);
        lines.push(headers.join(","));

        items.forEach((item) => {
          const values = headers.map((header) => {
            const value = item[header] || "";
            return typeof value === "string" && value.includes(",")
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          });
          lines.push(values.join(","));
        });
      }
    });

    return lines.join("\n");
  }

  /**
   * Calculate total items across all data types
   */
  private calculateTotalItems(data: ExportData): number {
    let total = 0;
    if (data.vocabulary) total += data.vocabulary.length;
    if (data.descriptions) total += data.descriptions.length;
    if (data.qa) total += data.qa.length;
    if (data.sessions) total += data.sessions.length;
    if (data.images) total += data.images.length;
    return total;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(data: ExportData): any {
    const summary = {
      totalVocabulary: data.vocabulary?.length || 0,
      totalDescriptions: data.descriptions?.length || 0,
      totalQA: data.qa?.length || 0,
      totalSessions: data.sessions?.length || 0,
      totalImages: data.images?.length || 0,
      dateRange: {
        start: "",
        end: "",
      },
      categories: {} as Record<string, number>,
      progress: {
        beginnerWords: 0,
        intermediateWords: 0,
        advancedWords: 0,
      },
    };

    // Calculate date range and vocabulary progress
    if (data.vocabulary) {
      const dates = data.vocabulary.map((v) => new Date(v.dateAdded)).sort();
      if (dates.length > 0) {
        summary.dateRange.start = dates[0].toISOString();
        summary.dateRange.end = dates[dates.length - 1].toISOString();
      }

      data.vocabulary.forEach((item) => {
        summary.categories[item.category] =
          (summary.categories[item.category] || 0) + 1;

        switch (item.difficulty) {
          case "beginner":
            summary.progress.beginnerWords++;
            break;
          case "intermediate":
            summary.progress.intermediateWords++;
            break;
          case "advanced":
            summary.progress.advancedWords++;
            break;
        }
      });
    }

    return summary;
  }

  /**
   * Generate filename based on export options
   */
  private generateFilename(options: ExportOptions): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const categories = options.categories.join("-");
    const extension = this.getFileExtension(options.format);

    return `describe-it-export-${categories}-${timestamp}.${extension}`;
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ExportFormat): string {
    const extensions = {
      csv: "csv",
      json: "json",
      pdf: "pdf",
      anki: "txt",
      excel: "xlsx",
    };

    return extensions[format] || "txt";
  }

  /**
   * Template management methods
   */
  async saveTemplate(
    template: Omit<ExportTemplate, "id" | "createdAt">,
  ): Promise<ExportTemplate> {
    const fullTemplate: ExportTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      useCount: 0,
    };

    this.templates.set(fullTemplate.id, fullTemplate);
    this.saveTemplatesToStorage();

    return fullTemplate;
  }

  async loadTemplate(id: string): Promise<ExportTemplate | null> {
    return this.templates.get(id) || null;
  }

  async listTemplates(): Promise<ExportTemplate[]> {
    return Array.from(this.templates.values());
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
    this.saveTemplatesToStorage();
  }

  /**
   * Scheduled export methods (placeholder implementation)
   */
  async scheduleExport(scheduledExport: ScheduledExport): Promise<void> {
    this.scheduledExports.set(scheduledExport.id, scheduledExport);
    this.saveScheduledExportsToStorage();
    // TODO: Implement actual scheduling mechanism
  }

  async cancelScheduledExport(id: string): Promise<void> {
    this.scheduledExports.delete(id);
    this.saveScheduledExportsToStorage();
  }

  async listScheduledExports(): Promise<ScheduledExport[]> {
    return Array.from(this.scheduledExports.values());
  }

  /**
   * Utility methods
   */
  validateOptions(options: ExportOptions): boolean {
    if (!options.format) return false;
    if (!options.categories || options.categories.length === 0) return false;
    if (options.dateRange && options.dateRange.start > options.dateRange.end)
      return false;
    return true;
  }

  async estimateSize(options: ExportOptions): Promise<number> {
    // Simple estimation based on data size
    // This could be made more sophisticated
    const data = await this.gatherFilteredData(options, "estimate");
    const jsonSize = JSON.stringify(data).length;

    // Rough multipliers for different formats
    const multipliers = {
      json: 1,
      csv: 0.5,
      pdf: 2,
      excel: 1.5,
      anki: 0.8,
    };

    return Math.round(jsonSize * (multipliers[options.format] || 1));
  }

  async previewData(options: ExportOptions): Promise<any> {
    const data = await this.gatherFilteredData(options, "preview");

    // Return a preview with limited items
    return {
      metadata: data.metadata,
      vocabulary: data.vocabulary?.slice(0, 5),
      descriptions: data.descriptions?.slice(0, 3),
      qa: data.qa?.slice(0, 3),
      sessions: data.sessions?.slice(0, 10),
      summary: data.summary,
    };
  }

  /**
   * Event handling
   */
  addEventListener(listener: (event: ExportEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: ExportEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: ExportEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  /**
   * History management
   */
  private recordExport(result: ExportResult, options: ExportOptions): void {
    const historyItem: ExportHistoryItem = {
      id: `history-${Date.now()}`,
      format: result.format,
      filename: result.filename,
      size: result.size,
      itemCount: result.itemsExported,
      duration: result.duration,
      success: result.success,
      error: result.error,
      createdAt: new Date().toISOString(),
      options,
    };

    this.exportHistory.unshift(historyItem);

    // Keep only last 50 exports
    if (this.exportHistory.length > 50) {
      this.exportHistory = this.exportHistory.slice(0, 50);
    }

    this.saveHistoryToStorage();
  }

  getExportHistory(): ExportHistoryItem[] {
    return [...this.exportHistory];
  }

  /**
   * Storage methods (using localStorage)
   */
  private saveTemplatesToStorage(): void {
    try {
      const templates = Array.from(this.templates.values());
      localStorage.setItem(
        "describe-it-export-templates",
        JSON.stringify(templates),
      );
    } catch (error) {
      console.warn("Failed to save templates to storage:", error);
    }
  }

  private loadTemplatesFromStorage(): void {
    try {
      const stored = localStorage.getItem("describe-it-export-templates");
      if (stored) {
        const templates = JSON.parse(stored) as ExportTemplate[];
        templates.forEach((template) => {
          this.templates.set(template.id, template);
        });
      }
    } catch (error) {
      console.warn("Failed to load templates from storage:", error);
    }
  }

  private saveScheduledExportsToStorage(): void {
    try {
      const scheduled = Array.from(this.scheduledExports.values());
      localStorage.setItem(
        "describe-it-scheduled-exports",
        JSON.stringify(scheduled),
      );
    } catch (error) {
      console.warn("Failed to save scheduled exports to storage:", error);
    }
  }

  private loadScheduledExportsFromStorage(): void {
    try {
      const stored = localStorage.getItem("describe-it-scheduled-exports");
      if (stored) {
        const scheduled = JSON.parse(stored) as ScheduledExport[];
        scheduled.forEach((item) => {
          this.scheduledExports.set(item.id, item);
        });
      }
    } catch (error) {
      console.warn("Failed to load scheduled exports from storage:", error);
    }
  }

  private saveHistoryToStorage(): void {
    try {
      localStorage.setItem(
        "describe-it-export-history",
        JSON.stringify(this.exportHistory),
      );
    } catch (error) {
      console.warn("Failed to save export history to storage:", error);
    }
  }

  private loadHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem("describe-it-export-history");
      if (stored) {
        this.exportHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load export history from storage:", error);
    }
  }

  /**
   * Auto-download convenience method
   */
  downloadExport(result: ExportResult): void {
    if (result.success && result.blob) {
      saveAs(result.blob, result.filename);
    }
  }
}

/**
 * Factory function to create export manager
 */
export function createExportManager(dataSources: DataSources): ExportManager {
  return new ExportManager(dataSources);
}

/**
 * Default export options for common use cases
 */
export const DEFAULT_EXPORT_OPTIONS: Record<string, ExportOptions> = {
  vocabularyCSV: {
    format: "csv",
    categories: ["vocabulary"],
    includeMetadata: false,
  },

  studySheetPDF: {
    format: "pdf",
    categories: ["vocabulary"],
    pdfOptions: {
      studySheetFormat: true,
      pageSize: "A4",
      orientation: "portrait",
    },
  },

  fullBackupJSON: {
    format: "json",
    categories: ["all"],
    includeMetadata: true,
    includeMedia: false,
  },

  ankiDeck: {
    format: "anki",
    categories: ["vocabulary", "qa"],
    ankiOptions: {
      deckName: "Language Learning",
      noteType: "basic",
      includeImages: false,
    },
  },

  progressReportExcel: {
    format: "excel",
    categories: ["vocabulary", "session"],
    excelOptions: {
      charts: {
        progressChart: true,
        categoryBreakdown: true,
      },
      conditional: {
        difficultyColors: true,
      },
    },
  },
};
