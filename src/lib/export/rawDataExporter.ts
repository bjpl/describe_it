// Raw Data Export Functionality for Session Reports
import {
  SessionReport,
  SessionInteraction,
  SessionSummary,
} from "@/types/session";

export interface RawExportOptions {
  includePersonalData: boolean;
  includeTimestamps: boolean;
  includeMetadata: boolean;
  includeInteractionDetails: boolean;
  format: "json" | "csv" | "xml";
  anonymizeUserData: boolean;
}

export interface ExportManifest {
  exportId: string;
  generatedAt: string;
  sessionId: string;
  totalRecords: number;
  dataTypes: string[];
  format: string;
  includesPersonalData: boolean;
  version: string;
}

export class RawDataExporter {
  private options: RawExportOptions;

  constructor(options: Partial<RawExportOptions> = {}) {
    this.options = {
      includePersonalData: false,
      includeTimestamps: true,
      includeMetadata: true,
      includeInteractionDetails: true,
      format: "json",
      anonymizeUserData: true,
      ...options,
    };
  }

  public exportSessionData(report: SessionReport): {
    data: string;
    manifest: ExportManifest;
    filename: string;
  } {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Process data based on options
    const processedData = this.processSessionData(report);

    // Generate manifest
    const manifest: ExportManifest = {
      exportId,
      generatedAt: timestamp,
      sessionId: report.summary.sessionId,
      totalRecords: this.calculateTotalRecords(processedData),
      dataTypes: this.getDataTypes(processedData),
      format: this.options.format,
      includesPersonalData: this.options.includePersonalData,
      version: "1.0.0",
    };

    // Format data
    const formattedData = this.formatData(processedData);

    const filename = `session-data-${report.summary.sessionId.split("_")[1]}-${Date.now()}.${this.options.format}`;

    return {
      data: formattedData,
      manifest,
      filename,
    };
  }

  private processSessionData(report: SessionReport): any {
    const data: any = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        sessionId: report.summary.sessionId,
        format: this.options.format,
        options: this.options,
      },
    };

    // Add session summary
    data.sessionSummary = this.processSummary(report.summary);

    // Add interactions
    if (this.options.includeInteractionDetails) {
      data.interactions = this.processInteractions(report.interactions);
    }

    // Add learning metrics
    data.learningMetrics = this.processLearningMetrics(report.learningMetrics);

    // Add recommendations (these are not personal)
    data.recommendations = report.recommendations;

    // Add performance data
    data.performance = this.extractPerformanceData(report);

    return data;
  }

  private processSummary(summary: SessionSummary): any {
    const processed = { ...summary };

    if (this.options.anonymizeUserData) {
      // Remove or hash potentially identifying information
      if (processed.uniqueQueries) {
        processed.uniqueQueries = processed.uniqueQueries.map((query) =>
          this.hashString(query),
        );
      }
      if (processed.uniqueImages) {
        processed.uniqueImages = processed.uniqueImages.map((id) =>
          this.hashString(id),
        );
      }
    }

    if (!this.options.includeTimestamps) {
      delete processed.startTime;
      delete processed.endTime;
    }

    if (!this.options.includePersonalData) {
      // Remove any fields that might be considered personal
      delete processed.uniqueQueries;
      delete processed.exportFormats;
    }

    return processed;
  }

  private processInteractions(interactions: SessionInteraction[]): any[] {
    return interactions.map((interaction) => {
      const processed = { ...interaction };

      if (this.options.anonymizeUserData) {
        // Anonymize interaction data
        if (processed.data.searchQuery) {
          processed.data.searchQuery = this.hashString(
            processed.data.searchQuery,
          );
        }
        if (processed.data.imageUrl) {
          processed.data.imageUrl = this.hashString(processed.data.imageUrl);
        }
        if (
          processed.data.descriptionText &&
          !this.options.includePersonalData
        ) {
          delete processed.data.descriptionText;
        }
        if (processed.data.questionText) {
          processed.data.questionText = this.hashString(
            processed.data.questionText,
          );
        }
      }

      if (!this.options.includeTimestamps) {
        delete processed.timestamp;
      }

      if (!this.options.includeMetadata) {
        delete processed.metadata;
      }

      if (!this.options.includePersonalData) {
        // Remove personal content but keep analytical data
        const analyticalData = {
          type: processed.type,
          duration: processed.data.duration,
          wordCount: processed.data.descriptionWordCount,
          difficulty: processed.data.qaDifficulty,
          category: processed.data.qaCategory,
          style: processed.data.descriptionStyle,
          language: processed.data.descriptionLanguage,
        };
        processed.data = analyticalData;
      }

      return processed;
    });
  }

  private processLearningMetrics(metrics: any): any {
    const processed = { ...metrics };

    if (this.options.anonymizeUserData) {
      // Keep learning patterns but remove specific content
      if (processed.focusAreas) {
        processed.focusAreas = processed.focusAreas.map((area: string) =>
          this.hashString(area),
        );
      }
    }

    return processed;
  }

  private extractPerformanceData(report: SessionReport): any {
    return {
      totalDuration: report.summary.totalDuration,
      interactionCount: report.summary.totalInteractions,
      learningScore: report.summary.learningScore,
      engagementScore: report.summary.engagementScore,
      comprehensionLevel: report.summary.comprehensionLevel,
      errorRate:
        (report.summary.errorCount / report.summary.totalInteractions) * 100,
      activityBreakdown: report.summary.interactionBreakdown,
      vocabularyMetrics: {
        totalSelected: report.summary.vocabularySelected,
        categoriesExplored: Object.keys(report.summary.vocabularyByCategory)
          .length,
        averagePerCategory: this.calculateAverageVocabularyPerCategory(
          report.summary.vocabularyByCategory,
        ),
      },
      contentGeneration: {
        descriptions: report.summary.descriptionsGenerated,
        questions: report.summary.questionsGenerated,
        averageDescriptionTime: report.summary.averageDescriptionTime,
        averageQATime: report.summary.averageQATime,
        totalWordsGenerated: report.summary.totalWordsGenerated,
      },
    };
  }

  private formatData(data: any): string {
    switch (this.options.format) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "csv":
        return this.convertToCSV(data);
      case "xml":
        return this.convertToXML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private convertToCSV(data: any): string {
    const rows: string[] = [];

    // Add header row
    rows.push(
      [
        "timestamp",
        "interaction_type",
        "duration",
        "content_type",
        "word_count",
        "difficulty",
        "category",
        "style",
        "language",
        "error_occurred",
      ].join(","),
    );

    // Add interaction rows
    if (data.interactions) {
      data.interactions.forEach((interaction: any) => {
        rows.push(
          [
            this.options.includeTimestamps
              ? new Date(interaction.timestamp).toISOString()
              : "",
            interaction.type || "",
            interaction.data?.duration || "",
            this.getContentType(interaction.type),
            interaction.data?.descriptionWordCount ||
              interaction.data?.selectedWords?.length ||
              "",
            interaction.data?.qaDifficulty || "",
            interaction.data?.qaCategory ||
              interaction.data?.vocabularyCategory ||
              "",
            interaction.data?.descriptionStyle || "",
            interaction.data?.descriptionLanguage || "",
            interaction.type === "error_occurred" ? "true" : "false",
          ].join(","),
        );
      });
    }

    // Add summary row
    rows.push(
      [
        "SUMMARY",
        "session_complete",
        data.sessionSummary?.totalDuration || "",
        "summary",
        data.sessionSummary?.totalWordsGenerated || "",
        data.sessionSummary?.comprehensionLevel || "",
        "session",
        "comprehensive",
        "mixed",
        "false",
      ].join(","),
    );

    return rows.join("\n");
  }

  private convertToXML(data: any): string {
    const escape = (str: string) =>
      str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case "&":
            return "&amp;";
          case "'":
            return "&apos;";
          case '"':
            return "&quot;";
          default:
            return c;
        }
      });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += "<sessionData>\n";

    // Metadata
    xml += "  <metadata>\n";
    xml += `    <sessionId>${escape(data.metadata.sessionId)}</sessionId>\n`;
    xml += `    <exportTimestamp>${escape(data.metadata.exportTimestamp)}</exportTimestamp>\n`;
    xml += `    <format>${escape(data.metadata.format)}</format>\n`;
    xml += "  </metadata>\n";

    // Summary
    xml += "  <summary>\n";
    Object.entries(data.sessionSummary || {}).forEach(([key, value]) => {
      if (typeof value === "object") {
        xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`;
      } else {
        xml += `    <${key}>${escape(String(value))}</${key}>\n`;
      }
    });
    xml += "  </summary>\n";

    // Interactions
    if (data.interactions && this.options.includeInteractionDetails) {
      xml += "  <interactions>\n";
      data.interactions.forEach((interaction: any, index: number) => {
        xml += `    <interaction id="${index + 1}">\n`;
        xml += `      <type>${escape(interaction.type)}</type>\n`;
        if (this.options.includeTimestamps && interaction.timestamp) {
          xml += `      <timestamp>${escape(new Date(interaction.timestamp).toISOString())}</timestamp>\n`;
        }
        xml += "      <data>\n";
        Object.entries(interaction.data || {}).forEach(([key, value]) => {
          xml += `        <${key}>${escape(String(value))}</${key}>\n`;
        });
        xml += "      </data>\n";
        xml += "    </interaction>\n";
      });
      xml += "  </interactions>\n";
    }

    // Performance
    xml += "  <performance>\n";
    Object.entries(data.performance || {}).forEach(([key, value]) => {
      if (typeof value === "object") {
        xml += `    <${key}>\n`;
        Object.entries(value).forEach(([subKey, subValue]) => {
          xml += `      <${subKey}>${escape(String(subValue))}</${subKey}>\n`;
        });
        xml += `    </${key}>\n`;
      } else {
        xml += `    <${key}>${escape(String(value))}</${key}>\n`;
      }
    });
    xml += "  </performance>\n";

    xml += "</sessionData>";
    return xml;
  }

  private calculateTotalRecords(data: any): number {
    let count = 1; // metadata
    count += 1; // summary
    count += data.interactions?.length || 0;
    count += 1; // performance
    count += 1; // learning metrics
    return count;
  }

  private getDataTypes(data: any): string[] {
    const types = ["metadata", "summary", "performance", "learningMetrics"];
    if (data.interactions && this.options.includeInteractionDetails) {
      types.push("interactions");
    }
    return types;
  }

  private calculateAverageVocabularyPerCategory(
    vocabularyByCategory: Record<string, number>,
  ): number {
    const values = Object.values(vocabularyByCategory);
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  private getContentType(interactionType: string): string {
    const typeMap: Record<string, string> = {
      search_query: "search",
      image_selected: "image",
      description_generated: "text",
      description_viewed: "text",
      qa_generated: "question",
      qa_viewed: "question",
      vocabulary_selected: "vocabulary",
      phrase_extracted: "vocabulary",
      settings_changed: "config",
      error_occurred: "error",
      export_initiated: "export",
    };
    return typeMap[interactionType] || "unknown";
  }

  private hashString(str: string): string {
    if (!this.options.anonymizeUserData) return str;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  // Static methods for convenience
  public static exportJSON(
    report: SessionReport,
    options?: Partial<RawExportOptions>,
  ) {
    const exporter = new RawDataExporter({ ...options, format: "json" });
    return exporter.exportSessionData(report);
  }

  public static exportCSV(
    report: SessionReport,
    options?: Partial<RawExportOptions>,
  ) {
    const exporter = new RawDataExporter({ ...options, format: "csv" });
    return exporter.exportSessionData(report);
  }

  public static exportXML(
    report: SessionReport,
    options?: Partial<RawExportOptions>,
  ) {
    const exporter = new RawDataExporter({ ...options, format: "xml" });
    return exporter.exportSessionData(report);
  }
}
