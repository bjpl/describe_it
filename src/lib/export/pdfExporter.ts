// PDF Export Functionality for Session Reports
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { SessionReport, SessionSummary } from "@/types/session";
import {
  SessionReportGenerator,
  VisualReportData,
} from "@/lib/logging/sessionReportGenerator";

export interface PDFExportOptions {
  includeCharts: boolean;
  includeRecommendations: boolean;
  includeDetailedAnalytics: boolean;
  includeRawData: boolean;
  format: "a4" | "letter";
  orientation: "portrait" | "landscape";
  quality: "high" | "medium" | "low";
}

// Export data interface for compatibility with exportManager
import { ExportData, PDFOptions } from "@/types/export";

export class PDFExporter {
  private pdf: jsPDF;
  private options: PDFExportOptions;
  private pageHeight: number;
  private pageWidth: number;
  private currentY: number = 20;
  private margin: number = 20;

  constructor(options: Partial<PDFExportOptions> = {}) {
    this.options = {
      includeCharts: true,
      includeRecommendations: true,
      includeDetailedAnalytics: true,
      includeRawData: false,
      format: "a4",
      orientation: "portrait",
      quality: "high",
      ...options,
    };

    this.pdf = new jsPDF({
      orientation: this.options.orientation,
      unit: "mm",
      format: this.options.format,
    });

    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
  }

  public async generatePDF(
    report: SessionReport,
    visualData: VisualReportData,
    reportGenerator: SessionReportGenerator,
  ): Promise<Blob> {
    try {
      // Add header
      this.addHeader(report.summary);

      // Add executive summary
      this.addExecutiveSummary(report.summary);

      // Add key metrics
      this.addKeyMetrics(report.summary, reportGenerator);

      // Add charts if requested
      if (this.options.includeCharts) {
        await this.addCharts(visualData);
      }

      // Add detailed analytics
      if (this.options.includeDetailedAnalytics) {
        this.addDetailedAnalytics(report, reportGenerator);
      }

      // Add recommendations
      if (this.options.includeRecommendations) {
        this.addRecommendations(report.recommendations);
      }

      // Add raw data if requested
      if (this.options.includeRawData) {
        this.addRawData(report);
      }

      // Add footer
      this.addFooter();

      return new Blob([this.pdf.output("blob")], { type: "application/pdf" });
    } catch (error) {
      console.error("PDF generation failed:", error);
      throw new Error("Failed to generate PDF report");
    }
  }

  private addHeader(summary: SessionSummary): void {
    // Title
    this.pdf.setFontSize(24);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Learning Session Report", this.margin, this.currentY);
    this.currentY += 15;

    // Subtitle
    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "normal");
    this.pdf.text(
      `Session ${summary.sessionId.split("_")[1]} • ${new Date(summary.startTime).toLocaleString()}`,
      this.margin,
      this.currentY,
    );
    this.currentY += 10;

    // Duration and interactions
    this.pdf.text(
      `Duration: ${Math.round(summary.totalDuration / 1000 / 60)} minutes • ${summary.totalInteractions} interactions`,
      this.margin,
      this.currentY,
    );
    this.currentY += 15;

    // Add divider line
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY,
    );
    this.currentY += 10;
  }

  private addExecutiveSummary(summary: SessionSummary): void {
    this.checkPageBreak(60);

    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Executive Summary", this.margin, this.currentY);
    this.currentY += 10;

    // Learning score with visual indicator
    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "normal");
    this.pdf.text(
      `Learning Score: ${summary.learningScore}/100`,
      this.margin,
      this.currentY,
    );

    // Add score bar
    const barWidth = 50;
    const barHeight = 3;
    const scorePercent = summary.learningScore / 100;

    this.pdf.setFillColor(220, 220, 220);
    this.pdf.rect(
      this.margin + 60,
      this.currentY - 2,
      barWidth,
      barHeight,
      "F",
    );

    // Score fill color based on performance
    if (summary.learningScore >= 80)
      this.pdf.setFillColor(34, 197, 94); // green
    else if (summary.learningScore >= 60)
      this.pdf.setFillColor(59, 130, 246); // blue
    else if (summary.learningScore >= 40)
      this.pdf.setFillColor(245, 158, 11); // yellow
    else this.pdf.setFillColor(239, 68, 68); // red

    this.pdf.rect(
      this.margin + 60,
      this.currentY - 2,
      barWidth * scorePercent,
      barHeight,
      "F",
    );
    this.currentY += 10;

    // Key achievements
    const achievements = [
      `Engagement Score: ${summary.engagementScore}/100`,
      `Comprehension Level: ${summary.comprehensionLevel}`,
      `Vocabulary Words: ${summary.vocabularySelected}`,
      `Descriptions Created: ${summary.descriptionsGenerated}`,
      `Questions Generated: ${summary.questionsGenerated}`,
    ];

    achievements.forEach((achievement) => {
      this.pdf.text(`• ${achievement}`, this.margin + 5, this.currentY);
      this.currentY += 7;
    });

    this.currentY += 5;
  }

  private addKeyMetrics(
    summary: SessionSummary,
    reportGenerator: SessionReportGenerator,
  ): void {
    this.checkPageBreak(80);

    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Key Performance Metrics", this.margin, this.currentY);
    this.currentY += 15;

    const vocabularyReport = reportGenerator.generateVocabularyReport();
    const timeAnalysis = reportGenerator.generateTimeAnalysisReport();

    // Create metrics grid
    const metrics = [
      { label: "Total Searches", value: summary.totalSearches.toString() },
      { label: "Images Viewed", value: summary.imagesViewed.toString() },
      { label: "Unique Images", value: summary.uniqueImages.length.toString() },
      {
        label: "Words Generated",
        value: summary.totalWordsGenerated.toString(),
      },
      {
        label: "Vocabulary Categories",
        value: vocabularyReport.categoriesExplored.length.toString(),
      },
      { label: "Time Efficiency", value: `${timeAnalysis.efficiencyScore}%` },
      {
        label: "Error Rate",
        value: `${((summary.errorCount / summary.totalInteractions) * 100).toFixed(1)}%`,
      },
      {
        label: "Peak Activity Periods",
        value: timeAnalysis.peakActivityPeriods.length.toString(),
      },
    ];

    const cols = 2;
    const colWidth = (this.pageWidth - 2 * this.margin) / cols;

    metrics.forEach((metric, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = this.margin + col * colWidth;
      const y = this.currentY + row * 15;

      this.pdf.setFont("helvetica", "normal");
      this.pdf.text(metric.label + ":", x, y);

      this.pdf.setFont("helvetica", "bold");
      this.pdf.text(metric.value, x + 60, y);
    });

    this.currentY += Math.ceil(metrics.length / cols) * 15 + 10;
  }

  private async addCharts(visualData: VisualReportData): Promise<void> {
    this.checkPageBreak(100);

    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Visual Analytics", this.margin, this.currentY);
    this.currentY += 15;

    // For now, add chart placeholders since we can't easily render React charts in PDF
    // In a full implementation, you would generate the charts as images first
    const chartPlaceholders = [
      "Learning Performance Chart",
      "Activity Breakdown Chart",
      "Vocabulary Growth Chart",
      "Time Analysis Chart",
    ];

    chartPlaceholders.forEach((chartName) => {
      this.checkPageBreak(40);

      // Chart title
      this.pdf.setFontSize(12);
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text(chartName, this.margin, this.currentY);
      this.currentY += 10;

      // Chart placeholder box
      this.pdf.setFillColor(248, 250, 252);
      this.pdf.setDrawColor(226, 232, 240);
      this.pdf.rect(
        this.margin,
        this.currentY,
        this.pageWidth - 2 * this.margin,
        30,
        "FD",
      );

      // Chart placeholder text
      this.pdf.setFont("helvetica", "italic");
      this.pdf.setFontSize(10);
      this.pdf.text(
        "Chart visualization would appear here in the HTML/web version",
        this.margin + 5,
        this.currentY + 20,
      );

      this.currentY += 35;
    });

    // Add activity heatmap data
    this.checkPageBreak(40);
    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Activity Heatmap (By Hour)", this.margin, this.currentY);
    this.currentY += 10;

    const heatmapData = visualData.heatmaps.activityByHour
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    heatmapData.forEach((item) => {
      const hour = item.hour.toString().padStart(2, "0") + ":00";
      this.pdf.setFont("helvetica", "normal");
      this.pdf.text(`${hour}`, this.margin, this.currentY);

      // Activity bar
      const barWidth =
        (item.count / Math.max(...heatmapData.map((d) => d.count))) * 60;
      this.pdf.setFillColor(139, 92, 246);
      this.pdf.rect(this.margin + 30, this.currentY - 2, barWidth, 3, "F");

      this.pdf.text(
        `${item.count} activities`,
        this.margin + 100,
        this.currentY,
      );
      this.currentY += 7;
    });

    this.currentY += 10;
  }

  private addDetailedAnalytics(
    report: SessionReport,
    reportGenerator: SessionReportGenerator,
  ): void {
    this.checkPageBreak(100);

    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Detailed Analytics", this.margin, this.currentY);
    this.currentY += 15;

    // Time analysis
    const timeAnalysis = reportGenerator.generateTimeAnalysisReport();
    this.addSection("Time Analysis", [
      `Total session time: ${Math.round(timeAnalysis.totalTime / 1000 / 60)} minutes`,
      `Active learning time: ${Math.round(timeAnalysis.activeTime / 1000 / 60)} minutes`,
      `Efficiency score: ${timeAnalysis.efficiencyScore}%`,
      `Peak activity periods: ${timeAnalysis.peakActivityPeriods.length}`,
    ]);

    // Vocabulary analysis
    const vocabularyReport = reportGenerator.generateVocabularyReport();
    this.addSection("Vocabulary Analysis", [
      `Total words encountered: ${vocabularyReport.totalWords}`,
      `Categories explored: ${vocabularyReport.categoriesExplored.join(", ")}`,
      `Favorite category: ${vocabularyReport.favoriteCategory}`,
      `Word diversity score: ${vocabularyReport.wordDiversity}/6`,
      `Recommended categories: ${vocabularyReport.recommendedCategories.join(", ")}`,
    ]);

    // Learning progress
    const progressReport = reportGenerator.generateLearningProgressReport();
    this.addSection("Learning Progress", [
      `Current comprehension level: ${progressReport.currentLevel}`,
      `Progress to next level: ${progressReport.progressToNext}%`,
      `Strength areas: ${progressReport.strengthAreas.join(", ")}`,
      `Areas for improvement: ${progressReport.improvementAreas.join(", ")}`,
    ]);

    // Error analysis
    const errorAnalysis = reportGenerator.generateErrorAnalysisReport();
    this.addSection("System Performance", [
      `Error rate: ${errorAnalysis.errorRate.toFixed(1)}%`,
      `System stability: ${errorAnalysis.stability}`,
      `Common error types: ${errorAnalysis.commonErrors
        .map((e) => e.type)
        .slice(0, 3)
        .join(", ")}`,
    ]);
  }

  private addSection(title: string, items: string[]): void {
    this.checkPageBreak(20 + items.length * 7);

    this.pdf.setFontSize(14);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 10;

    this.pdf.setFontSize(10);
    this.pdf.setFont("helvetica", "normal");
    items.forEach((item) => {
      this.pdf.text(`• ${item}`, this.margin + 5, this.currentY);
      this.currentY += 6;
    });

    this.currentY += 5;
  }

  private addRecommendations(recommendations: string[]): void {
    this.checkPageBreak(30 + recommendations.length * 8);

    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Personalized Recommendations", this.margin, this.currentY);
    this.currentY += 15;

    // Add background box
    const boxHeight = recommendations.length * 8 + 10;
    this.pdf.setFillColor(240, 249, 255);
    this.pdf.setDrawColor(59, 130, 246);
    this.pdf.rect(
      this.margin,
      this.currentY - 5,
      this.pageWidth - 2 * this.margin,
      boxHeight,
      "FD",
    );

    this.pdf.setFontSize(11);
    this.pdf.setFont("helvetica", "normal");
    recommendations.forEach((recommendation, index) => {
      this.pdf.text(
        `${index + 1}. ${recommendation}`,
        this.margin + 5,
        this.currentY + 5,
      );
      this.currentY += 8;
    });

    this.currentY += 10;
  }

  private addRawData(report: SessionReport): void {
    this.checkPageBreak(50);

    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Raw Session Data", this.margin, this.currentY);
    this.currentY += 15;

    // Add note about data format
    this.pdf.setFontSize(10);
    this.pdf.setFont("helvetica", "italic");
    this.pdf.text(
      "Complete session data is available in JSON format. Contact system administrator for full data export.",
      this.margin,
      this.currentY,
    );
    this.currentY += 10;

    // Add key data points
    const dataPoints = [
      `Session ID: ${report.summary.sessionId}`,
      `Start Time: ${new Date(report.summary.startTime).toISOString()}`,
      `End Time: ${new Date(report.summary.endTime).toISOString()}`,
      `Total Interactions: ${report.interactions.length}`,
      `Data Points Collected: ${Object.keys(report.summary).length}`,
      `Export Format: ${report.exportFormat}`,
      `Generated At: ${new Date(report.generatedAt).toISOString()}`,
    ];

    this.pdf.setFont("helvetica", "normal");
    dataPoints.forEach((point) => {
      this.pdf.text(`• ${point}`, this.margin + 5, this.currentY);
      this.currentY += 6;
    });
  }

  private addFooter(): void {
    const totalPages = this.pdf.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);

      // Page number
      this.pdf.setFontSize(10);
      this.pdf.setFont("helvetica", "normal");
      this.pdf.text(
        `Page ${i} of ${totalPages}`,
        this.pageWidth - this.margin - 20,
        this.pageHeight - 10,
      );

      // Footer text
      this.pdf.text(
        "Generated by Describe It Learning Analytics System",
        this.margin,
        this.pageHeight - 10,
      );

      // Timestamp
      this.pdf.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        this.margin,
        this.pageHeight - 5,
      );
    }
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.pdf.addPage();
      this.currentY = 20;
    }
  }

  // Static method for easy use
  public static async exportReportToPDF(
    report: SessionReport,
    visualData: VisualReportData,
    reportGenerator: SessionReportGenerator,
    options?: Partial<PDFExportOptions>,
  ): Promise<Blob> {
    const exporter = new PDFExporter(options);
    return await exporter.generatePDF(report, visualData, reportGenerator);
  }
}

/**
 * Export function compatible with exportManager interface
 */
export async function exportToPDF(
  data: ExportData,
  options?: PDFOptions,
): Promise<Blob> {
  try {
    // Create simplified PDF for general export data
    const pdf = new jsPDF({
      orientation: options?.orientation || "portrait",
      unit: "mm",
      format: options?.pageSize || "a4",
    });

    const margin = 20;
    let currentY = margin;
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Helper function for page breaks
    const checkPageBreak = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 30) {
        pdf.addPage();
        currentY = margin;
      }
    };

    // Title
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("Export Report", margin, currentY);
    currentY += 15;

    // Metadata
    if (data.metadata) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Created: ${new Date(data.metadata.createdAt).toLocaleString()}`, margin, currentY);
      currentY += 8;
      pdf.text(`Total Items: ${data.metadata.totalItems}`, margin, currentY);
      currentY += 8;
      pdf.text(`Categories: ${data.metadata.categories.join(", ")}`, margin, currentY);
      currentY += 15;
    }

    // Vocabulary section
    if (data.vocabulary && data.vocabulary.length > 0) {
      checkPageBreak(30);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Vocabulary", margin, currentY);
      currentY += 10;

      data.vocabulary.slice(0, 50).forEach((item) => { // Limit to first 50 items
        checkPageBreak(15);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`• ${item.spanish} - ${item.english}`, margin + 5, currentY);
        if (item.description) {
          currentY += 5;
          pdf.setFont("helvetica", "italic");
          pdf.text(`  ${item.description.slice(0, 100)}${item.description.length > 100 ? "..." : ""}`, margin + 10, currentY);
        }
        currentY += 8;
      });

      if (data.vocabulary.length > 50) {
        pdf.setFont("helvetica", "italic");
        pdf.text(`... and ${data.vocabulary.length - 50} more items`, margin + 5, currentY);
        currentY += 10;
      }
    }

    // Descriptions section
    if (data.descriptions && data.descriptions.length > 0) {
      checkPageBreak(30);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Descriptions", margin, currentY);
      currentY += 10;

      data.descriptions.slice(0, 20).forEach((item) => { // Limit to first 20 items
        checkPageBreak(20);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const description = item.description.slice(0, 150) + (item.description.length > 150 ? "..." : "");
        pdf.text(`• ${description}`, margin + 5, currentY);
        currentY += 8;
      });

      if (data.descriptions.length > 20) {
        pdf.setFont("helvetica", "italic");
        pdf.text(`... and ${data.descriptions.length - 20} more descriptions`, margin + 5, currentY);
        currentY += 10;
      }
    }

    // Summary section
    if (data.summary) {
      checkPageBreak(50);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, currentY);
      currentY += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      const summaryItems = [
        `Total Vocabulary: ${data.summary.totalVocabulary || 0}`,
        `Total Descriptions: ${data.summary.totalDescriptions || 0}`,
        `Total Q&A: ${data.summary.totalQA || 0}`,
        `Total Sessions: ${data.summary.totalSessions || 0}`,
      ];

      summaryItems.forEach((item) => {
        pdf.text(`• ${item}`, margin + 5, currentY);
        currentY += 6;
      });
    }

    return new Blob([pdf.output("blob")], { type: "application/pdf" });
  } catch (error) {
    console.error("PDF export failed:", error);
    throw new Error("Failed to export PDF");
  }
}

/**
 * Export study sheet format PDF
 */
export async function exportStudySheet(
  data: ExportData,
  options?: PDFOptions,
): Promise<Blob> {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm", 
      format: "a4",
    });

    const margin = 20;
    let currentY = margin;
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Helper function for page breaks
    const checkPageBreak = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 30) {
        pdf.addPage();
        currentY = margin;
      }
    };

    // Title
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Spanish Learning Study Sheet", margin, currentY);
    currentY += 15;

    // Date
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, currentY);
    currentY += 20;

    // Vocabulary section for study
    if (data.vocabulary && data.vocabulary.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Vocabulary to Study", margin, currentY);
      currentY += 15;

      // Create study format with Spanish | English columns
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Spanish", margin, currentY);
      pdf.text("English", margin + 80, currentY);
      currentY += 5;
      
      // Draw header line
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      data.vocabulary.slice(0, 30).forEach((item) => { // Limit for study sheet
        checkPageBreak(15);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(item.spanish, margin, currentY);
        pdf.text(item.english, margin + 80, currentY);
        
        // Add dotted line for writing practice
        pdf.setDrawColor(200, 200, 200);
        for (let x = margin; x < pageWidth - margin; x += 5) {
          pdf.circle(x, currentY + 5, 0.2, "F");
        }
        
        currentY += 15;
      });
    }

    return new Blob([pdf.output("blob")], { type: "application/pdf" });
  } catch (error) {
    console.error("Study sheet export failed:", error);
    throw new Error("Failed to export study sheet");
  }
}
