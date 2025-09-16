import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safeParse, safeStringify } from '@/lib/utils/json-safe';
import { descriptionCache } from "@/lib/cache";
import { withPremiumAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";

// Input validation schema
const exportRequestSchema = z.object({
  userId: z.string().optional().default("anonymous"),
  exportType: z.enum(["pdf", "csv", "json", "txt", "anki", "quizlet"]),
  contentType: z.enum(["vocabulary", "phrases", "qa", "progress", "all"]),
  filters: z
    .object({
      collectionName: z.string().optional(),
      category: z.string().optional(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      tags: z.array(z.string()).optional(),
      includeMetadata: z.boolean().optional().default(false),
      includeProgress: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  formatting: z
    .object({
      includeDefinitions: z.boolean().optional().default(true),
      includeExamples: z.boolean().optional().default(true),
      includeTranslations: z.boolean().optional().default(false),
      includeImages: z.boolean().optional().default(false),
      language: z.string().optional().default("es"),
      template: z
        .enum(["minimal", "standard", "detailed"])
        .optional()
        .default("standard"),
    })
    .optional()
    .default({}),
});

export const runtime = "nodejs";

// Export service
class ExportService {
  private cachePrefix = "export";
  private userPrefix = (userId: string) => `${this.cachePrefix}:user:${userId}`;

  async generateExport(
    userId: string,
    exportType: string,
    contentType: string,
    filters: any = {},
    formatting: any = {},
  ) {
    // Get the content to export
    const content = await this.getContentForExport(
      userId,
      contentType,
      filters,
    );

    if (!content || content.length === 0) {
      throw new Error("No content found for export");
    }

    // Generate export based on type
    switch (exportType) {
      case "json":
        return this.generateJSON(content, formatting);
      case "csv":
        return this.generateCSV(content, formatting);
      case "txt":
        return this.generateTXT(content, formatting);
      case "pdf":
        return this.generatePDF(content, formatting);
      case "anki":
        return this.generateAnki(content, formatting);
      case "quizlet":
        return this.generateQuizlet(content, formatting);
      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }
  }

  async getContentForExport(userId: string, contentType: string, filters: any) {
    const content: any[] = [];

    try {
      if (contentType === "vocabulary" || contentType === "all") {
        const vocabulary = await this.getVocabularyContent(userId, filters);
        content.push(
          ...vocabulary.map((item: any) => ({ ...item, type: "vocabulary" })),
        );
      }

      if (contentType === "phrases" || contentType === "all") {
        const phrases = await this.getPhrasesContent(userId, filters);
        content.push(
          ...phrases.map((item: any) => ({ ...item, type: "phrase" })),
        );
      }

      if (contentType === "qa" || contentType === "all") {
        const qa = await this.getQAContent(userId, filters);
        content.push(...qa.map((item: any) => ({ ...item, type: "qa" })));
      }

      if (contentType === "progress" || contentType === "all") {
        const progress = await this.getProgressContent(userId, filters);
        content.push(
          ...progress.map((item: any) => ({ ...item, type: "progress" })),
        );
      }

      return content;
    } catch (error) {
      console.warn("Failed to get content for export:", error);
      return [];
    }
  }

  async getVocabularyContent(userId: string, filters: any) {
    // Get vocabulary from cache (this would typically integrate with the vocabulary API)
    const vocabularyKey = `vocabulary:user:${userId}:index`;
    const vocabularyIndex = await descriptionCache.get(vocabularyKey);

    if (!vocabularyIndex?.items) return [];

    let items = vocabularyIndex.items;

    // Apply filters
    if (filters.category) {
      items = items.filter((item: any) => item.category === filters.category);
    }
    if (filters.difficulty) {
      items = items.filter(
        (item: any) => item.difficulty === filters.difficulty,
      );
    }
    if (filters.collectionName) {
      items = items.filter(
        (item: any) => item.collectionName === filters.collectionName,
      );
    }

    return items;
  }

  async getPhrasesContent(userId: string, filters: any) {
    // Get phrases from recent sessions or saved phrases
    const phrasesKey = `phrases:user:${userId}:saved`;
    const phrases = (await descriptionCache.get(phrasesKey)) || [];

    let filteredPhrases = phrases;

    if (filters.category) {
      filteredPhrases = filteredPhrases.filter(
        (phrase: any) => phrase.category === filters.category,
      );
    }
    if (filters.difficulty) {
      filteredPhrases = filteredPhrases.filter(
        (phrase: any) => phrase.difficulty === filters.difficulty,
      );
    }

    return filteredPhrases;
  }

  async getQAContent(userId: string, filters: any) {
    // Get Q&A from recent sessions
    const qaKey = `qa:user:${userId}:history`;
    const qa = (await descriptionCache.get(qaKey)) || [];

    return qa;
  }

  async getProgressContent(userId: string, filters: any) {
    // Get progress data
    const progressKey = `progress:user:${userId}:summary`;
    const progress = await descriptionCache.get(progressKey);

    return progress ? [progress] : [];
  }

  generateJSON(content: any[], formatting: any) {
    const exportData = {
      metadata: {
        exportType: "json",
        exportDate: new Date().toISOString(),
        itemCount: content.length,
        formatting: formatting,
      },
      content:
        formatting.template === "minimal"
          ? content.map((item: any) => ({
              phrase: item.phrase,
              definition: item.definition,
              type: item.type,
            }))
          : content,
    };

    return {
      data: safeStringify(exportData, '{}', 'export-data-stringify', null, 2),
      filename: `export_${Date.now()}.json`,
      contentType: "application/json",
    };
  }

  generateCSV(content: any[], formatting: any) {
    if (content.length === 0) {
      return {
        data: "",
        filename: `export_${Date.now()}.csv`,
        contentType: "text/csv",
      };
    }

    // Determine columns based on content type and formatting
    const columns = this.getCSVColumns(content[0], formatting);
    const headers = columns.join(",");

    const rows = content.map((item: any) =>
      columns
        .map((col) => {
          const value = this.getNestedValue(item, col) || "";
          // Escape CSV values
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(","),
    );

    const csvData = [headers, ...rows].join("\n");

    return {
      data: csvData,
      filename: `export_${Date.now()}.csv`,
      contentType: "text/csv",
    };
  }

  generateTXT(content: any[], formatting: any) {
    const lines: string[] = [];
    lines.push(`Export Generated: ${new Date().toISOString()}`);
    lines.push(`Items: ${content.length}`);
    lines.push("=".repeat(50));
    lines.push("");

    content.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.phrase || item.question || item.type}`);

      if (formatting.includeDefinitions && item.definition) {
        lines.push(`   Definition: ${item.definition}`);
      }

      if (item.answer) {
        lines.push(`   Answer: ${item.answer}`);
      }

      if (formatting.includeExamples && item.examples?.length > 0) {
        lines.push(`   Examples: ${item.examples.join(", ")}`);
      }

      if (item.category) {
        lines.push(`   Category: ${item.category}`);
      }

      if (item.difficulty) {
        lines.push(`   Difficulty: ${item.difficulty}`);
      }

      lines.push("");
    });

    return {
      data: lines.join("\n"),
      filename: `export_${Date.now()}.txt`,
      contentType: "text/plain",
    };
  }

  generatePDF(content: any[], formatting: any) {
    // For PDF generation, we'll return HTML that can be converted to PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Learning Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .item { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
        .phrase { font-size: 18px; font-weight: bold; color: #333; }
        .definition { margin: 5px 0; color: #666; }
        .meta { font-size: 12px; color: #888; }
        .category { background: #f0f0f0; padding: 2px 8px; border-radius: 12px; display: inline-block; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Learning Export</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <p>Items: ${content.length}</p>
    </div>
    
    ${content
      .map(
        (item, index) => `
        <div class="item">
            <div class="phrase">${item.phrase || item.question || `Item ${index + 1}`}</div>
            ${formatting.includeDefinitions && item.definition ? `<div class="definition">${item.definition}</div>` : ""}
            ${item.answer ? `<div class="definition"><strong>Answer:</strong> ${item.answer}</div>` : ""}
            ${formatting.includeExamples && item.examples?.length ? `<div class="definition"><strong>Examples:</strong> ${item.examples.join(", ")}</div>` : ""}
            <div class="meta">
                ${item.category ? `<span class="category">${item.category}</span> ` : ""}
                ${item.difficulty ? `Difficulty: ${item.difficulty}` : ""}
                ${item.type ? ` | Type: ${item.type}` : ""}
            </div>
        </div>
    `,
      )
      .join("")}
</body>
</html>`;

    return {
      data: html,
      filename: `export_${Date.now()}.html`,
      contentType: "text/html",
      note: "HTML file for PDF conversion",
    };
  }

  generateAnki(content: any[], formatting: any) {
    // Anki format: Front\tBack\tTags
    const ankiCards = content.map((item: any) => {
      const front = item.phrase || item.question || "";
      const back = item.definition || item.answer || "";
      const tags = [
        item.category,
        item.difficulty,
        item.type,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(" ");

      return `${front}\t${back}\t${tags}`;
    });

    return {
      data: ankiCards.join("\n"),
      filename: `anki_export_${Date.now()}.txt`,
      contentType: "text/plain",
    };
  }

  generateQuizlet(content: any[], formatting: any) {
    // Quizlet format: Term,Definition
    const quizletData = ["Term,Definition"];

    const rows = content.map((item) => {
      const term = item.phrase || item.question || "";
      const definition = item.definition || item.answer || "";
      return `"${term.replace(/"/g, '""')}","${definition.replace(/"/g, '""')}"`;
    });

    quizletData.push(...rows);

    return {
      data: quizletData.join("\n"),
      filename: `quizlet_export_${Date.now()}.csv`,
      contentType: "text/csv",
    };
  }

  getCSVColumns(sampleItem: any, formatting: any): string[] {
    const baseColumns = ["type", "phrase", "definition"];
    const optionalColumns = [];

    if (sampleItem.question) optionalColumns.push("question", "answer");
    if (sampleItem.category) optionalColumns.push("category");
    if (sampleItem.difficulty) optionalColumns.push("difficulty");
    if (sampleItem.partOfSpeech) optionalColumns.push("partOfSpeech");
    if (sampleItem.gender) optionalColumns.push("gender");
    if (formatting.includeTranslations && sampleItem.translation)
      optionalColumns.push("translation");
    if (formatting.includeMetadata)
      optionalColumns.push("createdAt", "confidence");

    return [...baseColumns, ...optionalColumns];
  }

  getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}

const exportService = new ExportService();

// POST endpoint - Generate export
async function handleExportGenerate(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const authenticatedUserId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  // Enforce user ID from auth context
  if (!authenticatedUserId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID required",
        message: "Authentication required to generate exports",
      },
      { status: 401 }
    );
  }

  try {
    const requestText = await request.text();
    const body = safeParse(requestText);
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };
    
    // Override any userId in the request body with authenticated user ID
    body.userId = authenticatedUserId;
    
    const { userId, exportType, contentType, filters, formatting } =
      exportRequestSchema.parse(body);

    // Generate cache key for export
    const cacheKey = `export:${userId}:${exportType}:${contentType}:${safeStringify(filters, '{}', 'cache-key-filters').substring(0, 50)}`;

    // Check cache first
    let exportResult = await descriptionCache.get(cacheKey);
    let fromCache = false;

    if (exportResult) {
      fromCache = true;
    } else {
      // Generate export
      exportResult = await exportService.generateExport(
        userId,
        exportType,
        contentType,
        filters,
        formatting,
      );

      // Cache the export for 1 hour
      await descriptionCache.set(cacheKey, exportResult, {
        kvTTL: 3600, // 1 hour
        memoryTTL: 1800, // 30 minutes
        sessionTTL: 900, // 15 minutes
      });
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...exportResult,
          size: exportResult.data.length,
          downloadUrl: `/api/export/download/${encodeURIComponent(exportResult.filename)}`,
        },
        metadata: {
          userId,
          exportType,
          contentType,
          filters,
          formatting,
          responseTime: `${responseTime}ms`,
          fromCache,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "X-Response-Time": `${responseTime}ms`,
          "X-Cache": fromCache ? "HIT" : "MISS",
          "X-Export-Size": exportResult.data.length.toString(),
        },
      },
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: {
            "X-Response-Time": `${responseTime}ms`,
          },
        },
      );
    }

    console.error("Export generation error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate export",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while generating your export. Please try again.",
        timestamp: new Date().toISOString(),
        retry: true,
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime}ms`,
        },
      },
    );
  }
}

// GET endpoint - Download export file
async function handleExportDownload(request: AuthenticatedRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const format = searchParams.get("format") || "attachment";

  if (!filename) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 },
    );
  }

  try {
    // Get export data from cache
    const exportKey = `export:download:${filename}`;
    const exportData = await descriptionCache.get(exportKey);

    if (!exportData) {
      return NextResponse.json(
        { error: "Export file not found or expired" },
        { status: 404 },
      );
    }

    return new NextResponse(exportData.data, {
      status: 200,
      headers: {
        "Content-Type": exportData.contentType,
        "Content-Disposition": `${format}; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Export download error:", error);

    return NextResponse.json(
      {
        error: "Failed to download export",
        message:
          "An error occurred while downloading your export. Please try again.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}


// Export authenticated handlers - Premium features
export const POST = withPremiumAuth(
  handleExportGenerate,
  {
    requiredFeatures: ['all_exports'],
    errorMessages: {
      featureRequired: 'Advanced export generation requires a premium subscription. Upgrade to access PDF, Anki, and bulk export features.',
      tierRequired: 'Export generation is a premium feature. Please upgrade your subscription.',
    },
  }
);

export const GET = withPremiumAuth(
  handleExportDownload,
  {
    requiredFeatures: ['all_exports'],
    errorMessages: {
      featureRequired: 'Export download requires a premium subscription. Upgrade to access your generated exports.',
      tierRequired: 'Export download is a premium feature. Please upgrade your subscription.',
    },
  }
);
