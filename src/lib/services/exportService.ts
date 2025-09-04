/**
 * Export Service - Multi-format export (CSV, JSON, PDF)
 */

import { withRetry, RetryConfig } from '@/lib/utils/error-retry';

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
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
  template?: 'basic' | 'detailed' | 'summary';
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
        return message.includes('timeout') || message.includes('network');
      },
    };
  }

  /**
   * Export data to specified format
   */\n  public async exportData(data: ExportData, options: ExportOptions): Promise<ExportResult> {\n    try {\n      const result = await withRetry(async () => {\n        switch (options.format) {\n          case 'csv':\n            return await this.exportToCSV(data, options);\n          case 'json':\n            return await this.exportToJSON(data, options);\n          case 'pdf':\n            return await this.exportToPDF(data, options);\n          case 'xlsx':\n            return await this.exportToExcel(data, options);\n          default:\n            throw new Error(`Unsupported export format: ${options.format}`);\n        }\n      }, this.retryConfig);\n\n      return {\n        success: true,\n        format: options.format,\n        filename: result.filename,\n        size: result.size,\n        recordCount: result.recordCount,\n        generatedAt: new Date().toISOString(),\n        downloadUrl: result.downloadUrl,\n      };\n    } catch (error) {\n      return {\n        success: false,\n        format: options.format,\n        filename: '',\n        size: 0,\n        recordCount: 0,\n        generatedAt: new Date().toISOString(),\n        error: error instanceof Error ? error.message : 'Export failed',\n      };\n    }\n  }\n\n  /**\n   * Generate export preview\n   */\n  public async generatePreview(data: ExportData, options: ExportOptions, maxRows: number = 10): Promise<{\n    headers: string[];\n    rows: any[][];\n    totalRows: number;\n  }> {\n    const processedData = this.processDataForExport(data, options);\n    const headers = this.generateHeaders(processedData, options);\n    const allRows = this.generateRows(processedData, options);\n    const previewRows = allRows.slice(0, maxRows);\n\n    return {\n      headers,\n      rows: previewRows,\n      totalRows: allRows.length,\n    };\n  }\n\n  /**\n   * Get supported export formats\n   */\n  public getSupportedFormats(): Array<{\n    format: string;\n    name: string;\n    description: string;\n    mimeType: string;\n    fileExtension: string;\n    supportsImages: boolean;\n    supportsFormatting: boolean;\n  }> {\n    return [\n      {\n        format: 'csv',\n        name: 'CSV',\n        description: 'Comma-separated values for spreadsheet applications',\n        mimeType: 'text/csv',\n        fileExtension: '.csv',\n        supportsImages: false,\n        supportsFormatting: false,\n      },\n      {\n        format: 'json',\n        name: 'JSON',\n        description: 'JavaScript Object Notation for data interchange',\n        mimeType: 'application/json',\n        fileExtension: '.json',\n        supportsImages: true,\n        supportsFormatting: false,\n      },\n      {\n        format: 'pdf',\n        name: 'PDF',\n        description: 'Portable Document Format for reports and documents',\n        mimeType: 'application/pdf',\n        fileExtension: '.pdf',\n        supportsImages: true,\n        supportsFormatting: true,\n      },\n      {\n        format: 'xlsx',\n        name: 'Excel',\n        description: 'Microsoft Excel format with advanced features',\n        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n        fileExtension: '.xlsx',\n        supportsImages: false,\n        supportsFormatting: true,\n      },\n    ];\n  }\n\n  /**\n   * Validate export data\n   */\n  public validateExportData(data: ExportData): {\n    isValid: boolean;\n    errors: string[];\n    warnings: string[];\n    stats: Record<string, number>;\n  } {\n    const errors: string[] = [];\n    const warnings: string[] = [];\n    const stats: Record<string, number> = {};\n\n    // Count records\n    stats.descriptions = data.descriptions?.length || 0;\n    stats.qaResponses = data.qaResponses?.length || 0;\n    stats.vocabulary = data.vocabulary?.length || 0;\n    stats.sessions = data.sessions?.length || 0;\n    stats.progress = data.progress?.length || 0;\n    stats.images = data.images?.length || 0;\n    stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0);\n\n    // Validate data\n    if (stats.total === 0) {\n      errors.push('No data to export');\n    }\n\n    // Check for data integrity issues\n    if (data.descriptions) {\n      const invalidDescriptions = data.descriptions.filter(d => !d.content || !d.imageId);\n      if (invalidDescriptions.length > 0) {\n        warnings.push(`${invalidDescriptions.length} descriptions have missing required fields`);\n      }\n    }\n\n    if (data.vocabulary) {\n      const invalidVocabulary = data.vocabulary.filter(v => !v.spanishText || !v.englishTranslation);\n      if (invalidVocabulary.length > 0) {\n        warnings.push(`${invalidVocabulary.length} vocabulary items have missing translations`);\n      }\n    }\n\n    return {\n      isValid: errors.length === 0,\n      errors,\n      warnings,\n      stats,\n    };\n  }\n\n  // Private export methods\n  private async exportToCSV(data: ExportData, options: ExportOptions): Promise<{\n    filename: string;\n    size: number;\n    recordCount: number;\n    downloadUrl: string;\n  }> {\n    const processedData = this.processDataForExport(data, options);\n    const headers = this.generateHeaders(processedData, options);\n    const rows = this.generateRows(processedData, options);\n\n    let csvContent = '';\n    \n    // Add headers\n    csvContent += headers.map(h => this.escapeCSVField(h)).join(',') + '\\n';\n    \n    // Add data rows\n    rows.forEach(row => {\n      csvContent += row.map(cell => this.escapeCSVField(cell)).join(',') + '\\n';\n    });\n\n    const blob = new Blob([csvContent], { type: 'text/csv' });\n    const filename = this.generateFilename('csv', options);\n    const downloadUrl = URL.createObjectURL(blob);\n\n    return {\n      filename,\n      size: blob.size,\n      recordCount: rows.length,\n      downloadUrl,\n    };\n  }\n\n  private async exportToJSON(data: ExportData, options: ExportOptions): Promise<{\n    filename: string;\n    size: number;\n    recordCount: number;\n    downloadUrl: string;\n  }> {\n    const processedData = this.processDataForExport(data, options);\n    \n    const exportObject = {\n      metadata: {\n        exportedAt: new Date().toISOString(),\n        format: 'json',\n        version: '1.0',\n        options,\n      },\n      data: processedData,\n    };\n\n    const jsonContent = JSON.stringify(exportObject, null, 2);\n    const blob = new Blob([jsonContent], { type: 'application/json' });\n    const filename = this.generateFilename('json', options);\n    const downloadUrl = URL.createObjectURL(blob);\n\n    const totalRecords = Object.values(processedData).reduce((sum, items) => {\n      return sum + (Array.isArray(items) ? items.length : 0);\n    }, 0);\n\n    return {\n      filename,\n      size: blob.size,\n      recordCount: totalRecords,\n      downloadUrl,\n    };\n  }\n\n  private async exportToPDF(data: ExportData, options: ExportOptions): Promise<{\n    filename: string;\n    size: number;\n    recordCount: number;\n    downloadUrl: string;\n  }> {\n    // This is a simplified PDF generation\n    // In a real implementation, you would use a library like jsPDF or PDFKit\n    \n    const processedData = this.processDataForExport(data, options);\n    const htmlContent = this.generateHTMLReport(processedData, options);\n    \n    // Convert HTML to PDF (would require a PDF library)\n    const pdfContent = await this.htmlToPDF(htmlContent);\n    \n    const blob = new Blob([pdfContent], { type: 'application/pdf' });\n    const filename = this.generateFilename('pdf', options);\n    const downloadUrl = URL.createObjectURL(blob);\n\n    const totalRecords = Object.values(processedData).reduce((sum, items) => {\n      return sum + (Array.isArray(items) ? items.length : 0);\n    }, 0);\n\n    return {\n      filename,\n      size: blob.size,\n      recordCount: totalRecords,\n      downloadUrl,\n    };\n  }\n\n  private async exportToExcel(data: ExportData, options: ExportOptions): Promise<{\n    filename: string;\n    size: number;\n    recordCount: number;\n    downloadUrl: string;\n  }> {\n    // This would require a library like xlsx or exceljs\n    // For now, fallback to CSV format\n    console.warn('Excel export not fully implemented, falling back to CSV');\n    return await this.exportToCSV(data, options);\n  }\n\n  // Helper methods\n  private processDataForExport(data: ExportData, options: ExportOptions): ExportData {\n    const processed: ExportData = {};\n\n    // Apply date range filter\n    if (options.dateRange) {\n      const startDate = new Date(options.dateRange.start);\n      const endDate = new Date(options.dateRange.end);\n\n      if (data.descriptions) {\n        processed.descriptions = data.descriptions.filter(item => {\n          const createdAt = new Date(item.createdAt);\n          return createdAt >= startDate && createdAt <= endDate;\n        });\n      }\n\n      if (data.qaResponses) {\n        processed.qaResponses = data.qaResponses.filter(item => {\n          const createdAt = new Date(item.createdAt);\n          return createdAt >= startDate && createdAt <= endDate;\n        });\n      }\n\n      if (data.vocabulary) {\n        processed.vocabulary = data.vocabulary.filter(item => {\n          const createdAt = new Date(item.createdAt);\n          return createdAt >= startDate && createdAt <= endDate;\n        });\n      }\n\n      if (data.sessions) {\n        processed.sessions = data.sessions.filter(item => {\n          const startTime = new Date(item.startTime);\n          return startTime >= startDate && startTime <= endDate;\n        });\n      }\n    } else {\n      processed.descriptions = data.descriptions;\n      processed.qaResponses = data.qaResponses;\n      processed.vocabulary = data.vocabulary;\n      processed.sessions = data.sessions;\n    }\n\n    // Apply other filters\n    if (options.filters) {\n      if (options.filters.category && processed.descriptions) {\n        // Category filtering would depend on how categories are stored in descriptions\n      }\n\n      if (options.filters.difficulty && processed.qaResponses) {\n        processed.qaResponses = processed.qaResponses.filter(item => \n          options.filters!.difficulty!.includes(item.difficulty)\n        );\n      }\n\n      if (options.filters.language) {\n        if (processed.descriptions) {\n          processed.descriptions = processed.descriptions.filter(item => \n            item.language === options.filters!.language\n          );\n        }\n        if (processed.qaResponses) {\n          processed.qaResponses = processed.qaResponses.filter(item => \n            item.language === options.filters!.language\n          );\n        }\n      }\n    }\n\n    // Always include progress and images if they exist\n    processed.progress = data.progress;\n    processed.images = data.images;\n\n    return processed;\n  }\n\n  private generateHeaders(data: ExportData, options: ExportOptions): string[] {\n    const headers: string[] = [];\n    \n    if (data.descriptions?.length) {\n      headers.push('Description ID', 'Image ID', 'Style', 'Content', 'Language', 'Word Count', 'Created At');\n    }\n    \n    if (data.qaResponses?.length) {\n      if (headers.length > 0) headers.push(''); // Separator\n      headers.push('Q&A ID', 'Question', 'Answer', 'User Answer', 'Is Correct', 'Difficulty', 'Category', 'Language');\n    }\n    \n    if (data.vocabulary?.length) {\n      if (headers.length > 0) headers.push(''); // Separator\n      headers.push('Vocab ID', 'Spanish Text', 'English Translation', 'Category', 'Difficulty', 'Part of Speech', 'Mastery Level');\n    }\n\n    return headers;\n  }\n\n  private generateRows(data: ExportData, options: ExportOptions): any[][] {\n    const rows: any[][] = [];\n    \n    // Add descriptions\n    if (data.descriptions?.length) {\n      data.descriptions.forEach(item => {\n        rows.push([\n          item.id,\n          item.imageId,\n          item.style,\n          item.content,\n          item.language,\n          item.wordCount,\n          item.createdAt,\n        ]);\n      });\n    }\n    \n    // Add Q&A responses\n    if (data.qaResponses?.length) {\n      if (rows.length > 0) rows.push([]); // Separator row\n      data.qaResponses.forEach(item => {\n        rows.push([\n          item.id,\n          item.question,\n          item.answer,\n          item.userAnswer || '',\n          item.isCorrect ? 'Yes' : 'No',\n          item.difficulty,\n          item.category,\n          item.language,\n        ]);\n      });\n    }\n    \n    // Add vocabulary\n    if (data.vocabulary?.length) {\n      if (rows.length > 0) rows.push([]); // Separator row\n      data.vocabulary.forEach(item => {\n        rows.push([\n          item.id,\n          item.spanishText,\n          item.englishTranslation,\n          item.category,\n          item.difficultyLevel,\n          item.partOfSpeech,\n          item.masteryLevel || 0,\n        ]);\n      });\n    }\n\n    return rows;\n  }\n\n  private generateFilename(format: string, options: ExportOptions): string {\n    const date = new Date().toISOString().split('T')[0];\n    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');\n    const template = options.template || 'export';\n    \n    return `${template}-${date}-${time}.${format}`;\n  }\n\n  private escapeCSVField(field: any): string {\n    if (field === null || field === undefined) {\n      return '';\n    }\n    \n    const str = String(field);\n    \n    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes\n    if (str.includes(',') || str.includes('\\n') || str.includes('\"')) {\n      return '\"' + str.replace(/\"/g, '\"\"') + '\"';\n    }\n    \n    return str;\n  }\n\n  private generateHTMLReport(data: ExportData, options: ExportOptions): string {\n    let html = `\n    <!DOCTYPE html>\n    <html>\n    <head>\n        <title>Learning Progress Report</title>\n        <style>\n            body { font-family: Arial, sans-serif; margin: 40px; }\n            h1, h2 { color: #333; }\n            table { border-collapse: collapse; width: 100%; margin: 20px 0; }\n            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }\n            th { background-color: #f2f2f2; }\n            .metadata { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }\n        </style>\n    </head>\n    <body>\n        <h1>Learning Progress Report</h1>\n        <div class=\"metadata\">\n            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>\n            <p><strong>Template:</strong> ${options.template || 'basic'}</p>\n        </div>\n    `;\n\n    if (data.descriptions?.length) {\n      html += '<h2>Image Descriptions</h2>';\n      html += '<table><tr><th>Style</th><th>Language</th><th>Content</th><th>Created</th></tr>';\n      data.descriptions.forEach(desc => {\n        html += `<tr><td>${desc.style}</td><td>${desc.language}</td><td>${desc.content.substring(0, 100)}...</td><td>${new Date(desc.createdAt).toLocaleDateString()}</td></tr>`;\n      });\n      html += '</table>';\n    }\n\n    if (data.vocabulary?.length) {\n      html += '<h2>Vocabulary Progress</h2>';\n      html += '<table><tr><th>Spanish</th><th>English</th><th>Category</th><th>Mastery</th></tr>';\n      data.vocabulary.forEach(vocab => {\n        html += `<tr><td>${vocab.spanishText}</td><td>${vocab.englishTranslation}</td><td>${vocab.category}</td><td>${Math.round((vocab.masteryLevel || 0) * 100)}%</td></tr>`;\n      });\n      html += '</table>';\n    }\n\n    html += '</body></html>';\n    return html;\n  }\n\n  private async htmlToPDF(html: string): Promise<string> {\n    // This is a placeholder - would need a real PDF library\n    console.warn('PDF generation not fully implemented');\n    return html; // Return HTML as fallback\n  }\n}\n\n// Export singleton instance\nexport const exportService = new ExportService();\nexport default exportService;