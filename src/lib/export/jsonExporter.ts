/**
 * JSON Export Utilities for Vocabulary Learning App
 * Creates structured JSON exports for data interchange and backup
 */

import { saveAs } from "file-saver";
import { ExportData } from "../../types/export";

interface JSONExportOptions {
  pretty?: boolean;
  minify?: boolean;
  includeMetadata?: boolean;
  schemaVersion?: string;
  compression?: "none" | "gzip";
}

export class JSONExporter {
  private options: JSONExportOptions;

  constructor(options: JSONExportOptions = {}) {
    this.options = {
      pretty: true,
      minify: false,
      includeMetadata: true,
      schemaVersion: "2.0.0",
      compression: "none",
      ...options,
    };
  }

  /**
   * Main export function for JSON generation
   */
  async exportToJSON(data: ExportData): Promise<Blob> {
    try {
      // Enhance data with additional metadata if requested
      const exportData = this.options.includeMetadata
        ? this.enhanceDataWithMetadata(data)
        : data;

      // Validate data structure
      this.validateExportData(exportData);

      // Generate JSON string
      const jsonString = this.options.pretty
        ? JSON.stringify(exportData, null, 2)
        : JSON.stringify(exportData);

      // Apply compression if requested
      const finalContent = await this.applyCompression(jsonString);

      return new Blob([finalContent], {
        type: "application/json;charset=utf-8",
      });
    } catch (error) {
      console.error("Error generating JSON export:", error);
      throw new Error("Failed to generate JSON export");
    }
  }

  /**
   * Enhance data with additional metadata and validation
   */
  private enhanceDataWithMetadata(data: ExportData): ExportData {
    const enhanced: ExportData = {
      ...data,
      metadata: {
        ...data.metadata,
        schemaVersion: this.options.schemaVersion || "2.0.0",
        exportVersion: "2.0.0",
        generatedBy: {
          application: "Describe It - Language Learning App",
          version: "1.0.0",
          platform: typeof window !== "undefined" ? "web" : "node",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "server",
        },
        statistics: this.calculateStatistics(data),
        integrity: {
          checksum: this.calculateChecksum(data),
          itemCount: this.getTotalItemCount(data),
          dataTypes: this.getDataTypes(data),
        },
      },
    };

    return enhanced;
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(data: ExportData): any {
    const stats = {
      vocabulary: {
        total: data.vocabulary?.length || 0,
        byDifficulty: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        byPartOfSpeech: {} as Record<string, number>,
        averageConfidence: 0,
        totalReviews: 0,
      },
      descriptions: {
        total: data.descriptions?.length || 0,
        byStyle: {} as Record<string, number>,
        byLanguage: {} as Record<string, number>,
        averageWordCount: 0,
        totalWords: 0,
      },
      qa: {
        total: data.qa?.length || 0,
        byCategory: {} as Record<string, number>,
        byDifficulty: {} as Record<string, number>,
        averageConfidence: 0,
        correctAnswers: 0,
      },
      sessions: {
        total: data.sessions?.length || 0,
        byActivityType: {} as Record<string, number>,
        totalDuration: 0,
        averageDuration: 0,
      },
      images: {
        total: data.images?.length || 0,
        bySource: {} as Record<string, number>,
        totalSize: 0,
      },
      dateRange: {
        earliest: "",
        latest: "",
        spanDays: 0,
      },
    };

    // Calculate vocabulary statistics
    if (data.vocabulary) {
      data.vocabulary.forEach((item) => {
        stats.vocabulary.byDifficulty[item.difficulty] =
          (stats.vocabulary.byDifficulty[item.difficulty] || 0) + 1;
        stats.vocabulary.byCategory[item.category] =
          (stats.vocabulary.byCategory[item.category] || 0) + 1;
        stats.vocabulary.byPartOfSpeech[item.partOfSpeech] =
          (stats.vocabulary.byPartOfSpeech[item.partOfSpeech] || 0) + 1;

        if (item.confidence) {
          stats.vocabulary.averageConfidence += item.confidence;
        }
        if (item.reviewCount) {
          stats.vocabulary.totalReviews += item.reviewCount;
        }
      });

      if (data.vocabulary.length > 0) {
        stats.vocabulary.averageConfidence /= data.vocabulary.length;
      }
    }

    // Calculate description statistics
    if (data.descriptions) {
      data.descriptions.forEach((item) => {
        stats.descriptions.byStyle[item.style] =
          (stats.descriptions.byStyle[item.style] || 0) + 1;
        stats.descriptions.byLanguage[item.language] =
          (stats.descriptions.byLanguage[item.language] || 0) + 1;
        stats.descriptions.totalWords += item.wordCount;
      });

      if (data.descriptions.length > 0) {
        stats.descriptions.averageWordCount =
          stats.descriptions.totalWords / data.descriptions.length;
      }
    }

    // Calculate Q&A statistics
    if (data.qa) {
      data.qa.forEach((item) => {
        if (item.category) {
          stats.qa.byCategory[item.category] =
            (stats.qa.byCategory[item.category] || 0) + 1;
        }
        if (item.difficulty) {
          stats.qa.byDifficulty[item.difficulty] =
            (stats.qa.byDifficulty[item.difficulty] || 0) + 1;
        }
        if (item.confidence) {
          stats.qa.averageConfidence += item.confidence;
        }
        if (item.correct) {
          stats.qa.correctAnswers++;
        }
      });

      if (data.qa.length > 0) {
        stats.qa.averageConfidence /= data.qa.length;
      }
    }

    // Calculate session statistics
    if (data.sessions) {
      data.sessions.forEach((item) => {
        stats.sessions.byActivityType[item.activityType] =
          (stats.sessions.byActivityType[item.activityType] || 0) + 1;
        if (item.duration) {
          stats.sessions.totalDuration += item.duration;
        }
      });

      if (data.sessions.length > 0) {
        stats.sessions.averageDuration =
          stats.sessions.totalDuration / data.sessions.length;
      }
    }

    // Calculate image statistics
    if (data.images) {
      data.images.forEach((item) => {
        stats.images.bySource[item.source] =
          (stats.images.bySource[item.source] || 0) + 1;
      });
    }

    // Calculate date range
    this.calculateDateRange(data, stats);

    return stats;
  }

  /**
   * Calculate date range from all data
   */
  private calculateDateRange(data: ExportData, stats: any): void {
    const dates: Date[] = [];

    // Collect all dates
    if (data.vocabulary) {
      data.vocabulary.forEach((item) => {
        dates.push(new Date(item.dateAdded));
        if (item.lastReviewed) {
          dates.push(new Date(item.lastReviewed));
        }
      });
    }

    if (data.descriptions) {
      data.descriptions.forEach((item) => {
        dates.push(new Date(item.createdAt));
      });
    }

    if (data.qa) {
      data.qa.forEach((item) => {
        dates.push(new Date(item.createdAt));
      });
    }

    if (data.sessions) {
      data.sessions.forEach((item) => {
        dates.push(new Date(item.timestamp));
      });
    }

    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      const earliest = dates[0];
      const latest = dates[dates.length - 1];

      stats.dateRange.earliest = earliest.toISOString();
      stats.dateRange.latest = latest.toISOString();
      stats.dateRange.spanDays = Math.ceil(
        (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  }

  /**
   * Calculate simple checksum for data integrity
   */
  private calculateChecksum(data: ExportData): string {
    const content = JSON.stringify(data, null, 0);
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Get total item count across all data types
   */
  private getTotalItemCount(data: ExportData): number {
    let count = 0;

    if (data.vocabulary) count += data.vocabulary.length;
    if (data.descriptions) count += data.descriptions.length;
    if (data.qa) count += data.qa.length;
    if (data.sessions) count += data.sessions.length;
    if (data.images) count += data.images.length;

    return count;
  }

  /**
   * Get list of data types present in export
   */
  private getDataTypes(data: ExportData): string[] {
    const types: string[] = [];

    if (data.vocabulary && data.vocabulary.length > 0) types.push("vocabulary");
    if (data.descriptions && data.descriptions.length > 0)
      types.push("descriptions");
    if (data.qa && data.qa.length > 0) types.push("qa");
    if (data.sessions && data.sessions.length > 0) types.push("sessions");
    if (data.images && data.images.length > 0) types.push("images");
    if (data.summary) types.push("summary");

    return types;
  }

  /**
   * Validate export data structure
   */
  private validateExportData(data: ExportData): void {
    if (!data.metadata) {
      throw new Error("Export data missing metadata");
    }

    if (!data.metadata.exportId) {
      throw new Error("Export data missing export ID");
    }

    if (!data.metadata.createdAt) {
      throw new Error("Export data missing creation date");
    }

    if (!Array.isArray(data.metadata.categories)) {
      throw new Error("Export categories must be an array");
    }

    // Validate individual data arrays
    if (data.vocabulary && !Array.isArray(data.vocabulary)) {
      throw new Error("Vocabulary data must be an array");
    }

    if (data.descriptions && !Array.isArray(data.descriptions)) {
      throw new Error("Descriptions data must be an array");
    }

    if (data.qa && !Array.isArray(data.qa)) {
      throw new Error("Q&A data must be an array");
    }

    if (data.sessions && !Array.isArray(data.sessions)) {
      throw new Error("Sessions data must be an array");
    }

    if (data.images && !Array.isArray(data.images)) {
      throw new Error("Images data must be an array");
    }
  }

  /**
   * Apply compression to JSON string (placeholder for future implementation)
   */
  private async applyCompression(jsonString: string): Promise<string> {
    // For now, just return the string
    // In the future, could implement gzip compression
    return jsonString;
  }
}

/**
 * Export data to JSON format with enhanced metadata
 */
export async function exportToJSON(
  data: ExportData,
  options: JSONExportOptions = {},
): Promise<Blob> {
  const exporter = new JSONExporter(options);
  return await exporter.exportToJSON(data);
}

/**
 * Create a compact JSON export (minified)
 */
export async function exportToCompactJSON(data: ExportData): Promise<Blob> {
  return await exportToJSON(data, {
    pretty: false,
    minify: true,
    includeMetadata: false,
  });
}

/**
 * Create a full JSON export with all metadata and statistics
 */
export async function exportToFullJSON(data: ExportData): Promise<Blob> {
  return await exportToJSON(data, {
    pretty: true,
    minify: false,
    includeMetadata: true,
    schemaVersion: "2.0.0",
  });
}

/**
 * Download JSON file
 */
export function downloadJSON(blob: Blob, filename: string): void {
  const finalFilename = filename.endsWith(".json")
    ? filename
    : `${filename}.json`;
  saveAs(blob, finalFilename);
}

/**
 * Parse and validate imported JSON data
 */
export function parseImportedJSON(jsonString: string): ExportData {
  try {
    const data = JSON.parse(jsonString);

    // Basic validation
    if (!data.metadata) {
      throw new Error("Invalid export file: missing metadata");
    }

    if (!data.metadata.exportId) {
      throw new Error("Invalid export file: missing export ID");
    }

    return data as ExportData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format");
    }
    throw error;
  }
}

/**
 * Convert other formats to JSON-compatible data structure
 */
export function normalizeDataForJSON(rawData: any, dataType: string): any {
  switch (dataType) {
    case "vocabulary":
      return rawData.map((item: any) => ({
        phrase: item.phrase || item.word || "",
        translation: item.translation || "",
        definition: item.definition || "",
        partOfSpeech: item.partOfSpeech || item.pos || "unknown",
        difficulty: item.difficulty || "intermediate",
        category: item.category || "general",
        context: item.context || "",
        dateAdded: item.dateAdded || new Date().toISOString(),
        lastReviewed: item.lastReviewed || null,
        reviewCount: item.reviewCount || 0,
        confidence: item.confidence || 0,
      }));

    case "descriptions":
      return rawData.map((item: any) => ({
        id: item.id || `desc-${Date.now()}-${Math.random()}`,
        imageId: item.imageId || "",
        imageUrl: item.imageUrl || "",
        style: item.style || "detailed",
        content: item.content || "",
        wordCount: item.wordCount || item.content?.split(" ").length || 0,
        language: item.language || "en",
        createdAt: item.createdAt || new Date().toISOString(),
        generationTime: item.generationTime || null,
      }));

    default:
      return rawData;
  }
}
