/**
 * Export Service - Multi-format export (CSV, JSON, PDF)
 */

import { withRetry, RetryConfig } from "../utils/error-retry";

interface ExportOptions {
  format: "csv" | "json" | "pdf";
  includeMetadata?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    category?: string[];
    difficulty?: string[];
    language?: string;
  };
  template?: "basic" | "detailed" | "summary";
  customFields?: string[];
}

interface ExportData {
  descriptions?: DescriptionExportItem[];
  qaResponses?: QAExportItem[];
  vocabulary?: VocabularyExportItem[];
  sessions?: SessionExportItem[];
  progress?: ProgressExportItem[];
  images?: ImageExportItem[];
}

interface DescriptionExportItem {
  id: string;
  imageId: string;
  imageUrl: string;
  style: string;
  content: string;
  language: string;
  wordCount: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface QAExportItem {
  id: string;
  imageId?: string;
  question: string;
  answer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  difficulty: string;
  category: string;
  language: string;
  createdAt: string;
  responseTime?: number;
}

interface VocabularyExportItem {
  id: string;
  spanishText: string;
  englishTranslation: string;
  category: string;
  difficultyLevel: string;
  partOfSpeech: string;
  contextSentence: string;
  masteryLevel?: number;
  reviewCount?: number;
  successRate?: number;
  lastReviewed?: string;
  createdAt: string;
}

interface SessionExportItem {
  id: string;
  userId?: string;
  sessionType: string;
  startTime: string;
  endTime?: string;
  duration: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  experienceGained: number;
  difficultyLevel: string;
  topicsStudied: string[];
}

interface ProgressExportItem {
  userId: string;
  totalSessions: number;
  totalQuestions: number;
  averageAccuracy: number;
  timeSpent: number;
  level: number;
  experiencePoints: number;
  streakDays: number;
  badges: string[];
  achievements: string[];
  lastActivity: string;
}

interface ImageExportItem {
  id: string;
  url: string;
  description?: string;
  altDescription?: string;
  dimensions: {
    width: number;
    height: number;
  };
  user: {
    name: string;
    username: string;
  };
  searchQuery?: string;
  viewedAt: string;
}

interface ExportResult {
  success: boolean;
  format: string;
  filename: string;
  size: number; // bytes
  recordCount: number;
  generatedAt: string;
  downloadUrl?: string;
  error?: string;
}

export class ExportService {
  private retryConfig: RetryConfig;

  constructor() {
    this.retryConfig = {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 10000,
      backoffFactor: 2,
      shouldRetry: (error: Error) => {
        const message = error.message.toLowerCase();
        return message.includes("timeout") || message.includes("network");
      },
    };
  }

  /**
   * Export data to specified format
   */
  public async exportData(
    data: ExportData,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const result = await withRetry(async () => {
        switch (options.format) {
          case "csv":
            return await this.exportToCSV(data, options);
          case "json":
            return await this.exportToJSON(data, options);
          case "pdf":
            return await this.exportToPDF(data, options);
          default:
            throw new Error(`Unsupported export format: ${options.format}`);
        }
      }, this.retryConfig);

      const resultData = result.success ? result.data : result as any;
      return {
        success: true,
        format: options.format,
        filename: resultData.filename,
        size: resultData.size,
        recordCount: resultData.recordCount,
        generatedAt: new Date().toISOString(),
        downloadUrl: resultData.downloadUrl,
      };
    } catch (error) {
      return {
        success: false,
        format: options.format,
        filename: "",
        size: 0,
        recordCount: 0,
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  /**
   * Generate export preview
   */
  public async generatePreview(
    data: ExportData,
    options: ExportOptions,
    maxRows: number = 10,
  ): Promise<{
    headers: string[];
    rows: any[][];
    totalRows: number;
  }> {
    const processedData = this.processDataForExport(data, options);
    const headers = this.generateHeaders(processedData, options);
    const allRows = this.generateRows(processedData, options);
    const previewRows = allRows.slice(0, maxRows);

    return {
      headers,
      rows: previewRows,
      totalRows: allRows.length,
    };
  }

  /**
   * Get supported export formats
   */
  public getSupportedFormats(): Array<{
    format: string;
    name: string;
    description: string;
    mimeType: string;
    fileExtension: string;
    supportsImages: boolean;
    supportsFormatting: boolean;
  }> {
    return [
      {
        format: "csv",
        name: "CSV",
        description: "Comma-separated values for spreadsheet applications",
        mimeType: "text/csv",
        fileExtension: ".csv",
        supportsImages: false,
        supportsFormatting: false,
      },
      {
        format: "json",
        name: "JSON",
        description: "JavaScript Object Notation for data interchange",
        mimeType: "application/json",
        fileExtension: ".json",
        supportsImages: true,
        supportsFormatting: false,
      },
      {
        format: "pdf",
        name: "PDF",
        description: "Portable Document Format for reports and documents",
        mimeType: "application/pdf",
        fileExtension: ".pdf",
        supportsImages: true,
        supportsFormatting: true,
      },
    ];
  }

  /**
   * Validate export data
   */
  public validateExportData(data: ExportData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    stats: Record<string, number>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const stats: Record<string, number> = {};

    // Count records
    stats.descriptions = data.descriptions?.length || 0;
    stats.qaResponses = data.qaResponses?.length || 0;
    stats.vocabulary = data.vocabulary?.length || 0;
    stats.sessions = data.sessions?.length || 0;
    stats.progress = data.progress?.length || 0;
    stats.images = data.images?.length || 0;
    stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    // Validate data
    if (stats.total === 0) {
      errors.push("No data to export");
    }

    // Check for data integrity issues
    if (data.descriptions) {
      const invalidDescriptions = data.descriptions.filter(
        (d) => !d.content || !d.imageId,
      );
      if (invalidDescriptions.length > 0) {
        warnings.push(
          `${invalidDescriptions.length} descriptions have missing required fields`,
        );
      }
    }

    if (data.vocabulary) {
      const invalidVocabulary = data.vocabulary.filter(
        (v) => !v.spanishText || !v.englishTranslation,
      );
      if (invalidVocabulary.length > 0) {
        warnings.push(
          `${invalidVocabulary.length} vocabulary items have missing translations`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats,
    };
  }

  // Private export methods
  private async exportToCSV(
    data: ExportData,
    options: ExportOptions,
  ): Promise<{
    filename: string;
    size: number;
    recordCount: number;
    downloadUrl: string;
  }> {
    const processedData = this.processDataForExport(data, options);
    const headers = this.generateHeaders(processedData, options);
    const rows = this.generateRows(processedData, options);

    let csvContent = "";

    // Add headers
    csvContent += headers.map((h) => this.escapeCSVField(h)).join(",") + "\n";

    // Add data rows
    rows.forEach((row) => {
      csvContent +=
        row.map((cell) => this.escapeCSVField(cell)).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const filename = this.generateFilename("csv", options);
    const downloadUrl = URL.createObjectURL(blob);

    return {
      filename,
      size: blob.size,
      recordCount: rows.length,
      downloadUrl,
    };
  }

  private async exportToJSON(
    data: ExportData,
    options: ExportOptions,
  ): Promise<{
    filename: string;
    size: number;
    recordCount: number;
    downloadUrl: string;
  }> {
    const processedData = this.processDataForExport(data, options);

    const exportObject = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: "json",
        version: "1.0",
        options,
      },
      data: processedData,
    };

    const jsonContent = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const filename = this.generateFilename("json", options);
    const downloadUrl = URL.createObjectURL(blob);

    const totalRecords = Object.values(processedData).reduce((sum, items) => {
      return sum + (Array.isArray(items) ? items.length : 0);
    }, 0);

    return {
      filename,
      size: blob.size,
      recordCount: totalRecords,
      downloadUrl,
    };
  }

  private async exportToPDF(
    data: ExportData,
    options: ExportOptions,
  ): Promise<{
    filename: string;
    size: number;
    recordCount: number;
    downloadUrl: string;
  }> {
    // This is a simplified PDF generation
    // In a real implementation, you would use a library like jsPDF or PDFKit

    const processedData = this.processDataForExport(data, options);
    const htmlContent = this.generateHTMLReport(processedData, options);

    // Convert HTML to PDF (would require a PDF library)
    const pdfContent = await this.htmlToPDF(htmlContent);

    const blob = new Blob([pdfContent], { type: "application/pdf" });
    const filename = this.generateFilename("pdf", options);
    const downloadUrl = URL.createObjectURL(blob);

    const totalRecords = Object.values(processedData).reduce((sum, items) => {
      return sum + (Array.isArray(items) ? items.length : 0);
    }, 0);

    return {
      filename,
      size: blob.size,
      recordCount: totalRecords,
      downloadUrl,
    };
  }


  // Helper methods
  private processDataForExport(
    data: ExportData,
    options: ExportOptions,
  ): ExportData {
    const processed: ExportData = {};

    // Apply date range filter
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.start);
      const endDate = new Date(options.dateRange.end);

      if (data.descriptions) {
        processed.descriptions = data.descriptions.filter((item) => {
          const createdAt = new Date(item.createdAt);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }

      if (data.qaResponses) {
        processed.qaResponses = data.qaResponses.filter((item) => {
          const createdAt = new Date(item.createdAt);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }

      if (data.vocabulary) {
        processed.vocabulary = data.vocabulary.filter((item) => {
          const createdAt = new Date(item.createdAt);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }

      if (data.sessions) {
        processed.sessions = data.sessions.filter((item) => {
          const startTime = new Date(item.startTime);
          return startTime >= startDate && startTime <= endDate;
        });
      }
    } else {
      processed.descriptions = data.descriptions;
      processed.qaResponses = data.qaResponses;
      processed.vocabulary = data.vocabulary;
      processed.sessions = data.sessions;
    }

    // Apply other filters
    if (options.filters) {
      if (options.filters.category && processed.descriptions) {
        // Category filtering would depend on how categories are stored in descriptions
      }

      if (options.filters.difficulty && processed.qaResponses) {
        processed.qaResponses = processed.qaResponses.filter((item) =>
          options.filters!.difficulty!.includes(item.difficulty),
        );
      }

      if (options.filters.language) {
        if (processed.descriptions) {
          processed.descriptions = processed.descriptions.filter(
            (item) => item.language === options.filters!.language,
          );
        }
        if (processed.qaResponses) {
          processed.qaResponses = processed.qaResponses.filter(
            (item) => item.language === options.filters!.language,
          );
        }
      }
    }

    // Always include progress and images if they exist
    processed.progress = data.progress;
    processed.images = data.images;

    return processed;
  }

  private generateHeaders(data: ExportData, options: ExportOptions): string[] {
    const headers: string[] = [];

    if (data.descriptions?.length) {
      headers.push(
        "Description ID",
        "Image ID",
        "Style",
        "Content",
        "Language",
        "Word Count",
        "Created At",
      );
    }

    if (data.qaResponses?.length) {
      if (headers.length > 0) headers.push(""); // Separator
      headers.push(
        "Q&A ID",
        "Question",
        "Answer",
        "User Answer",
        "Is Correct",
        "Difficulty",
        "Category",
        "Language",
      );
    }

    if (data.vocabulary?.length) {
      if (headers.length > 0) headers.push(""); // Separator
      headers.push(
        "Vocab ID",
        "Spanish Text",
        "English Translation",
        "Category",
        "Difficulty",
        "Part of Speech",
        "Mastery Level",
      );
    }

    return headers;
  }

  private generateRows(data: ExportData, options: ExportOptions): any[][] {
    const rows: any[][] = [];

    // Add descriptions
    if (data.descriptions?.length) {
      data.descriptions.forEach((item) => {
        rows.push([
          item.id,
          item.imageId,
          item.style,
          item.content,
          item.language,
          item.wordCount,
          item.createdAt,
        ]);
      });
    }

    // Add Q&A responses
    if (data.qaResponses?.length) {
      if (rows.length > 0) rows.push([]); // Separator row
      data.qaResponses.forEach((item) => {
        rows.push([
          item.id,
          item.question,
          item.answer,
          item.userAnswer || "",
          item.isCorrect ? "Yes" : "No",
          item.difficulty,
          item.category,
          item.language,
        ]);
      });
    }

    // Add vocabulary
    if (data.vocabulary?.length) {
      if (rows.length > 0) rows.push([]); // Separator row
      data.vocabulary.forEach((item) => {
        rows.push([
          item.id,
          item.spanishText,
          item.englishTranslation,
          item.category,
          item.difficultyLevel,
          item.partOfSpeech,
          item.masteryLevel || 0,
        ]);
      });
    }

    return rows;
  }

  private generateFilename(format: string, options: ExportOptions): string {
    const date = new Date().toISOString().split("T")[0];
    const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
    const template = options.template || "export";

    return `${template}-${date}-${time}.${format}`;
  }

  private escapeCSVField(field: any): string {
    if (field === null || field === undefined) {
      return "";
    }

    const str = String(field);

    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  private generateHTMLReport(data: ExportData, options: ExportOptions): string {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Learning Progress Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1, h2 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .metadata { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>Learning Progress Report</h1>
        <div class="metadata">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Template:</strong> ${options.template || "basic"}</p>
        </div>
    `;

    if (data.descriptions?.length) {
      html += "<h2>Image Descriptions</h2>";
      html +=
        "<table><tr><th>Style</th><th>Language</th><th>Content</th><th>Created</th></tr>";
      data.descriptions.forEach((desc) => {
        html += `<tr><td>${desc.style}</td><td>${desc.language}</td><td>${desc.content.substring(0, 100)}...</td><td>${new Date(desc.createdAt).toLocaleDateString()}</td></tr>`;
      });
      html += "</table>";
    }

    if (data.vocabulary?.length) {
      html += "<h2>Vocabulary Progress</h2>";
      html +=
        "<table><tr><th>Spanish</th><th>English</th><th>Category</th><th>Mastery</th></tr>";
      data.vocabulary.forEach((vocab) => {
        html += `<tr><td>${vocab.spanishText}</td><td>${vocab.englishTranslation}</td><td>${vocab.category}</td><td>${Math.round((vocab.masteryLevel || 0) * 100)}%</td></tr>`;
      });
      html += "</table>";
    }

    html += "</body></html>";
    return html;
  }

  private async htmlToPDF(html: string): Promise<string> {
    // This is a placeholder - would need a real PDF library
    console.warn("PDF generation not fully implemented");
    return html; // Return HTML as fallback
  }
}

// Export singleton instance
export const exportService = new ExportService();
export default exportService;
