/**
 * Excel Export Utilities for Vocabulary Learning App
 * Creates formatted spreadsheets with charts and advanced features
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ExportData,
  ExcelExportOptions,
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
  SessionExportItem
} from '../../types/export';

interface WorksheetData {
  name: string;
  data: any[];
  headers?: string[];
  format?: 'table' | 'raw';
}

export class ExcelExporter {
  private workbook: XLSX.WorkBook;
  private options: ExcelExportOptions;

  constructor(options: ExcelExportOptions = {}) {
    this.workbook = XLSX.utils.book_new();
    this.options = {
      worksheets: ['vocabulary', 'descriptions', 'qa', 'sessions', 'summary'],
      formatting: {
        headers: true,
        autoWidth: true,
        freezePanes: true
      },
      charts: {
        progressChart: true,
        categoryBreakdown: true,
        timelineChart: false
      },
      conditional: {
        difficultyColors: true,
        progressBars: false
      },
      ...options
    };
  }

  /**
   * Main export function for Excel generation
   */
  async exportToExcel(data: ExportData): Promise<Blob> {
    try {
      const worksheets: WorksheetData[] = [];

      // Prepare worksheets based on available data
      if (data.vocabulary && data.vocabulary.length > 0) {
        worksheets.push(this.prepareVocabularyWorksheet(data.vocabulary));
      }

      if (data.descriptions && data.descriptions.length > 0) {
        worksheets.push(this.prepareDescriptionsWorksheet(data.descriptions));
      }

      if (data.qa && data.qa.length > 0) {
        worksheets.push(this.prepareQAWorksheet(data.qa));
      }

      if (data.sessions && data.sessions.length > 0) {
        worksheets.push(this.prepareSessionsWorksheet(data.sessions));
      }

      // Always add summary if data exists
      if (data.summary) {
        worksheets.push(this.prepareSummaryWorksheet(data.summary, data.metadata));
      }

      // Create worksheets
      worksheets.forEach(ws => {
        this.createWorksheet(ws);
      });

      // Apply formatting
      this.applyFormattingToWorkbook();

      // Generate Excel buffer
      const buffer = XLSX.write(this.workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true,
        cellNF: true
      });

      return new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

    } catch (error) {
      console.error('Error generating Excel:', error);
      throw new Error('Failed to generate Excel export');
    }
  }

  /**
   * Prepare vocabulary worksheet with enhanced formatting
   */
  private prepareVocabularyWorksheet(vocabulary: VocabularyExportItem[]): WorksheetData {
    const headers = [
      'Phrase',
      'Translation', 
      'Definition',
      'Part of Speech',
      'Difficulty',
      'Category',
      'Context',
      'Date Added',
      'Last Reviewed',
      'Review Count',
      'Confidence Score'
    ];

    const data = vocabulary.map(item => ({
      'Phrase': item.phrase,
      'Translation': item.translation,
      'Definition': item.definition,
      'Part of Speech': item.partOfSpeech,
      'Difficulty': item.difficulty,
      'Category': item.category,
      'Context': item.context,
      'Date Added': new Date(item.dateAdded).toLocaleDateString(),
      'Last Reviewed': item.lastReviewed ? new Date(item.lastReviewed).toLocaleDateString() : 'Never',
      'Review Count': item.reviewCount || 0,
      'Confidence Score': item.confidence || 0
    }));

    return {
      name: 'Vocabulary',
      data,
      headers,
      format: 'table'
    };
  }

  /**
   * Prepare descriptions worksheet
   */
  private prepareDescriptionsWorksheet(descriptions: DescriptionExportItem[]): WorksheetData {
    const headers = [
      'ID',
      'Style',
      'Content',
      'Word Count',
      'Language',
      'Created At',
      'Generation Time (ms)'
    ];

    const data = descriptions.map(item => ({
      'ID': item.id,
      'Style': item.style,
      'Content': item.content,
      'Word Count': item.wordCount,
      'Language': item.language,
      'Created At': new Date(item.createdAt).toLocaleString(),
      'Generation Time (ms)': item.generationTime || 0
    }));

    return {
      name: 'Descriptions',
      data,
      headers,
      format: 'table'
    };
  }

  /**
   * Prepare Q&A worksheet
   */
  private prepareQAWorksheet(qa: QAExportItem[]): WorksheetData {
    const headers = [
      'ID',
      'Question',
      'Answer',
      'Category',
      'Difficulty',
      'Confidence',
      'Created At',
      'Response Time (ms)',
      'Correct',
      'User Answer'
    ];

    const data = qa.map(item => ({
      'ID': item.id,
      'Question': item.question,
      'Answer': item.answer,
      'Category': item.category || 'General',
      'Difficulty': item.difficulty || 'Medium',
      'Confidence': item.confidence || 0,
      'Created At': new Date(item.createdAt).toLocaleString(),
      'Response Time (ms)': item.responseTime || 0,
      'Correct': item.correct ? 'Yes' : 'No',
      'User Answer': item.userAnswer || ''
    }));

    return {
      name: 'Questions & Answers',
      data,
      headers,
      format: 'table'
    };
  }

  /**
   * Prepare sessions worksheet
   */
  private prepareSessionsWorksheet(sessions: SessionExportItem[]): WorksheetData {
    const headers = [
      'Timestamp',
      'Session ID',
      'Activity Type',
      'Content',
      'Details',
      'Duration (ms)'
    ];

    const data = sessions.map(item => ({
      'Timestamp': new Date(item.timestamp).toLocaleString(),
      'Session ID': item.sessionId,
      'Activity Type': item.activityType,
      'Content': item.content,
      'Details': item.details,
      'Duration (ms)': item.duration || 0
    }));

    return {
      name: 'Sessions',
      data,
      headers,
      format: 'table'
    };
  }

  /**
   * Prepare summary worksheet with statistics and charts
   */
  private prepareSummaryWorksheet(summary: any, metadata: any): WorksheetData {
    const data = [
      { Metric: 'Export Summary', Value: '' },
      { Metric: 'Generated On', Value: new Date(metadata.createdAt).toLocaleString() },
      { Metric: 'Total Items', Value: metadata.totalItems },
      { Metric: 'Export Format', Value: metadata.format },
      { Metric: '', Value: '' },
      
      { Metric: 'Content Statistics', Value: '' },
      { Metric: 'Total Vocabulary', Value: summary.totalVocabulary || 0 },
      { Metric: 'Total Descriptions', Value: summary.totalDescriptions || 0 },
      { Metric: 'Total Q&A Pairs', Value: summary.totalQA || 0 },
      { Metric: 'Total Sessions', Value: summary.totalSessions || 0 },
      { Metric: '', Value: '' },
      
      { Metric: 'Learning Progress', Value: '' },
      { Metric: 'Beginner Words', Value: summary.progress?.beginnerWords || 0 },
      { Metric: 'Intermediate Words', Value: summary.progress?.intermediateWords || 0 },
      { Metric: 'Advanced Words', Value: summary.progress?.advancedWords || 0 },
      { Metric: '', Value: '' },
      
      { Metric: 'Date Range', Value: '' },
      { Metric: 'Start Date', Value: summary.dateRange?.start || 'N/A' },
      { Metric: 'End Date', Value: summary.dateRange?.end || 'N/A' }
    ];

    // Add category breakdown if available
    if (summary.categories) {
      data.push({ Metric: '', Value: '' });
      data.push({ Metric: 'Category Breakdown', Value: '' });
      Object.entries(summary.categories).forEach(([category, count]) => {
        data.push({ 
          Metric: category, 
          Value: count as number 
        });
      });
    }

    return {
      name: 'Summary',
      data,
      headers: ['Metric', 'Value'],
      format: 'raw'
    };
  }

  /**
   * Create worksheet with data and formatting
   */
  private createWorksheet(worksheetData: WorksheetData): void {
    let worksheet: XLSX.WorkSheet;

    if (worksheetData.format === 'table') {
      // Create worksheet from JSON with headers
      worksheet = XLSX.utils.json_to_sheet(worksheetData.data);
      
      // Apply table formatting
      if (this.options.formatting?.headers) {
        this.formatHeaders(worksheet, worksheetData.headers || Object.keys(worksheetData.data[0] || {}));
      }
      
    } else {
      // Raw data format (for summary)
      worksheet = XLSX.utils.json_to_sheet(worksheetData.data);
    }

    // Auto-width columns
    if (this.options.formatting?.autoWidth) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const colWidths: number[] = [];
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 0;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = cell.v.toString();
            maxWidth = Math.max(maxWidth, cellValue.length);
          }
        }
        colWidths.push(Math.min(maxWidth + 2, 50)); // Cap at 50 characters
      }
      
      worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
    }

    // Freeze panes (first row)
    if (this.options.formatting?.freezePanes && worksheetData.format === 'table') {
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    // Apply conditional formatting for vocabulary difficulty
    if (worksheetData.name === 'Vocabulary' && this.options.conditional?.difficultyColors) {
      this.applyDifficultyColors(worksheet);
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(this.workbook, worksheet, worksheetData.name);
  }

  /**
   * Format header row with styling
   */
  private formatHeaders(worksheet: XLSX.WorkSheet, headers: string[]): void {
    headers.forEach((header, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
      if (!worksheet[cellAddress]) return;
      
      // Apply header styling
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    });
  }

  /**
   * Apply difficulty-based color coding
   */
  private applyDifficultyColors(worksheet: XLSX.WorkSheet): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const difficultyColumnIndex = this.findColumnIndex(worksheet, 'Difficulty');
    
    if (difficultyColumnIndex === -1) return;

    for (let R = 1; R <= range.e.r; ++R) { // Start from 1 to skip header
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: difficultyColumnIndex });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        const difficulty = cell.v.toString().toLowerCase();
        let fillColor = "FFFFFF"; // Default white
        
        switch (difficulty) {
          case 'beginner':
            fillColor = "D5FDDA"; // Light green
            break;
          case 'intermediate':
            fillColor = "FDF2D5"; // Light yellow
            break;
          case 'advanced':
            fillColor = "FADDD5"; // Light red
            break;
        }
        
        cell.s = {
          fill: { fgColor: { rgb: fillColor } },
          alignment: { horizontal: "center" }
        };
      }
    }
  }

  /**
   * Find column index by header name
   */
  private findColumnIndex(worksheet: XLSX.WorkSheet, headerName: string): number {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = worksheet[cellAddress];
      if (cell && cell.v && cell.v.toString() === headerName) {
        return C;
      }
    }
    
    return -1;
  }

  /**
   * Apply global formatting to workbook
   */
  private applyFormattingToWorkbook(): void {
    // Set workbook properties
    this.workbook.Props = {
      Title: "Language Learning Export",
      Subject: "Vocabulary and Learning Data",
      Author: "Describe It App",
      CreatedDate: new Date()
    };

    // Add custom styles if needed
    this.workbook.Custprops = {
      "Export Type": "Language Learning Data",
      "Generated By": "Describe It Application"
    };
  }
}

/**
 * Export data to Excel format with multiple worksheets
 */
export async function exportToExcel(
  data: ExportData,
  options: ExcelExportOptions = {}
): Promise<Blob> {
  const exporter = new ExcelExporter(options);
  return await exporter.exportToExcel(data);
}

/**
 * Export vocabulary only to Excel with advanced formatting
 */
export async function exportVocabularyToExcel(
  vocabularyData: VocabularyExportItem[],
  options: ExcelExportOptions = {}
): Promise<Blob> {
  const data: ExportData = {
    metadata: {
      exportId: `vocab-excel-${Date.now()}`,
      createdAt: new Date().toISOString(),
      format: 'excel',
      options: { format: 'excel', categories: ['vocabulary'] },
      totalItems: vocabularyData.length,
      categories: ['vocabulary'],
      version: '1.0.0'
    },
    vocabulary: vocabularyData,
    summary: {
      totalVocabulary: vocabularyData.length,
      totalDescriptions: 0,
      totalQA: 0,
      totalSessions: 0,
      totalImages: 0,
      dateRange: {
        start: vocabularyData.length > 0 ? vocabularyData[0].dateAdded : new Date().toISOString(),
        end: new Date().toISOString()
      },
      categories: {},
      progress: {
        beginnerWords: vocabularyData.filter(v => v.difficulty === 'beginner').length,
        intermediateWords: vocabularyData.filter(v => v.difficulty === 'intermediate').length,
        advancedWords: vocabularyData.filter(v => v.difficulty === 'advanced').length
      }
    }
  };

  const excelOptions: ExcelExportOptions = {
    worksheets: ['vocabulary', 'summary'],
    formatting: {
      headers: true,
      autoWidth: true,
      freezePanes: true
    },
    conditional: {
      difficultyColors: true,
      progressBars: false
    },
    ...options
  };

  const exporter = new ExcelExporter(excelOptions);
  return await exporter.exportToExcel(data);
}

/**
 * Download Excel file
 */
export function downloadExcel(blob: Blob, filename: string): void {
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}