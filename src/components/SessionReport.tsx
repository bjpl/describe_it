"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Download,
  TrendingUp,
  Clock,
  BookOpen,
  Target,
  Activity,
} from "lucide-react";
import { SessionLogger, getSessionLogger } from "@/lib/logging/sessionLogger";
import {
  SessionReportGenerator,
  VisualReportData,
  ChartData,
} from "@/lib/logging/sessionReportGenerator";
import {
  SessionReport as SessionReportType,
  SessionSummary,
} from "@/types/session";
import { PDFExporter } from "@/lib/export/pdfExporter";
import { RawDataExporter } from "@/lib/export/rawDataExporter";

interface SessionReportProps {
  sessionLogger?: SessionLogger;
  className?: string;
  showExportOptions?: boolean;
}

export function SessionReport({
  sessionLogger = getSessionLogger(),
  className = "",
  showExportOptions = true,
}: SessionReportProps) {
  const [reportData, setReportData] = useState<SessionReportType | null>(null);
  const [visualData, setVisualData] = useState<VisualReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "charts" | "analytics" | "export"
  >("overview");

  const reportGenerator = useMemo(
    () => new SessionReportGenerator(sessionLogger),
    [sessionLogger],
  );

  useEffect(() => {
    generateReport();
  }, [sessionLogger]);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const report = reportGenerator.generateDetailedReport();
      const visual = reportGenerator.generateVisualReportData();
      setReportData(report);
      setVisualData(visual);
    } catch (error) {
      console.error("Failed to generate session report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (format: "json" | "html" | "pdf" | "csv") => {
    if (!reportData || !visualData) return;

    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case "json":
          const rawExport = RawDataExporter.exportJSON(reportData, {
            includePersonalData: false,
            anonymizeUserData: true,
          });
          blob = new Blob([rawExport.data], { type: "application/json" });
          filename = rawExport.filename;
          break;
        case "csv":
          const csvExport = RawDataExporter.exportCSV(reportData, {
            includePersonalData: false,
            anonymizeUserData: true,
          });
          blob = new Blob([csvExport.data], { type: "text/csv" });
          filename = csvExport.filename;
          break;
        case "html":
          const htmlContent = await reportGenerator.exportVisualReport("html");
          blob = new Blob([htmlContent], { type: "text/html" });
          filename = `session-report-${Date.now()}.html`;
          break;
        case "pdf":
          blob = await PDFExporter.exportReportToPDF(
            reportData,
            visualData,
            reportGenerator,
            {
              includeCharts: true,
              includeRecommendations: true,
              includeDetailedAnalytics: true,
              includeRawData: false,
            },
          );
          filename = `session-report-${Date.now()}.pdf`;
          break;
        default:
          return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.round(milliseconds / 1000 / 60);
    return `${minutes}m`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };

  const COLORS = {
    primary: "#3b82f6",
    secondary: "#10b981",
    accent: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    orange: "#f97316",
    green: "#84cc16",
  };

  const PIE_COLORS = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.accent,
    COLORS.danger,
    COLORS.purple,
    COLORS.cyan,
  ];

  if (isGenerating) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Generating comprehensive session report...
          </p>
        </div>
      </div>
    );
  }

  if (!reportData || !visualData) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-gray-500 mb-4">No session data available</p>
        <button
          onClick={generateReport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>
    );
  }

  const tabButtons = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "charts", label: "Progress Charts", icon: TrendingUp },
    { id: "analytics", label: "Analytics", icon: Target },
    { id: "export", label: "Export", icon: Download },
  ] as const;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Learning Session Report</h2>
            <p className="opacity-90">
              Session {reportData.summary.sessionId.split("_")[1]} •
              {formatTime(reportData.summary.totalDuration)} •
              {reportData.summary.totalInteractions} interactions
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {reportData.summary.learningScore}
            </div>
            <div className="text-sm opacity-90">Learning Score</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "overview" && (
          <OverviewTab
            summary={reportData.summary}
            recommendations={reportData.recommendations}
            reportGenerator={reportGenerator}
          />
        )}

        {activeTab === "charts" && <ChartsTab visualData={visualData} />}

        {activeTab === "analytics" && (
          <AnalyticsTab
            summary={reportData.summary}
            reportGenerator={reportGenerator}
            visualData={visualData}
          />
        )}

        {activeTab === "export" && showExportOptions && (
          <ExportTab onExport={exportReport} reportData={reportData} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  summary,
  recommendations,
  reportGenerator,
}: {
  summary: SessionSummary;
  recommendations: string[];
  reportGenerator: SessionReportGenerator;
}) {
  const vocabularyReport = reportGenerator.generateVocabularyReport();
  const timeAnalysis = reportGenerator.generateTimeAnalysisReport();
  const progressReport = reportGenerator.generateLearningProgressReport();

  const metrics = [
    {
      title: "Engagement Score",
      value: summary.engagementScore,
      max: 100,
      color: "#10b981",
      icon: Activity,
    },
    {
      title: "Vocabulary Words",
      value: summary.vocabularySelected,
      max: 100,
      color: "#3b82f6",
      icon: BookOpen,
    },
    {
      title: "Learning Efficiency",
      value: timeAnalysis.efficiencyScore,
      max: 100,
      color: "#f59e0b",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <metric.icon
                  className="w-5 h-5"
                  style={{ color: metric.color }}
                />
                <h3 className="font-medium text-gray-900">{metric.title}</h3>
              </div>
              <span
                className="text-2xl font-bold"
                style={{ color: metric.color }}
              >
                {metric.value}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(metric.value / metric.max) * 100}%`,
                  backgroundColor: metric.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Activity Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Searches Performed</span>
              <span className="font-medium">{summary.totalSearches}</span>
            </div>
            <div className="flex justify-between">
              <span>Images Viewed</span>
              <span className="font-medium">{summary.imagesViewed}</span>
            </div>
            <div className="flex justify-between">
              <span>Descriptions Generated</span>
              <span className="font-medium">
                {summary.descriptionsGenerated}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Questions Created</span>
              <span className="font-medium">{summary.questionsGenerated}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Learning Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Current Level</span>
              <span className="font-medium capitalize">
                {summary.comprehensionLevel}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Progress to Next</span>
              <span className="font-medium">
                {progressReport.progressToNext}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Words Learned</span>
              <span className="font-medium">{summary.totalWordsGenerated}</span>
            </div>
            <div className="flex justify-between">
              <span>Vocabulary Diversity</span>
              <span className="font-medium">
                {vocabularyReport.wordDiversity}/6
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-green-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-green-600" />
          Milestones Achieved
        </h3>
        <div className="flex flex-wrap gap-2">
          {progressReport.milestones.map((milestone, index) => (
            <span
              key={index}
              className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              🏆 {milestone}
            </span>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">
          📚 Personalized Recommendations
        </h3>
        <ul className="space-y-2">
          {recommendations.map((rec, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Charts Tab Component
function ChartsTab({ visualData }: { visualData: VisualReportData }) {
  return (
    <div className="space-y-8">
      {/* Learning Score Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Learning Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[
              {
                name: "Learning Score",
                value:
                  visualData.progressCharts.learningScore.datasets[0].data[0],
              },
              {
                name: "Engagement Score",
                value:
                  visualData.progressCharts.learningScore.datasets[0].data[1],
              },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Activity Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={visualData.progressCharts.activityBreakdown.labels.map(
                  (label, index) => ({
                    name: label,
                    value:
                      visualData.progressCharts.activityBreakdown.datasets[0]
                        .data[index],
                  }),
                )}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
              >
                {visualData.progressCharts.activityBreakdown.labels.map(
                  (_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${index * 30}, 70%, 60%)`}
                    />
                  ),
                )}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col justify-center space-y-2">
            {visualData.progressCharts.activityBreakdown.labels.map(
              (label, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor: `hsl(${index * 30}, 70%, 60%)`,
                    }}
                  />
                  <span className="flex-1">{label}</span>
                  <span className="font-medium">
                    {
                      visualData.progressCharts.activityBreakdown.datasets[0]
                        .data[index]
                    }
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Vocabulary Growth */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Vocabulary Growth</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={visualData.progressCharts.vocabularyGrowth.labels.map(
              (label, index) => ({
                date: label,
                cumulative:
                  visualData.progressCharts.vocabularyGrowth.datasets[0].data[
                    index
                  ],
                new: visualData.progressCharts.vocabularyGrowth.datasets[1]
                  .data[index],
              }),
            )}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="cumulative"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="new"
              stackId="2"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Activity by Hour</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={visualData.heatmaps.activityByHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({
  summary,
  reportGenerator,
  visualData,
}: {
  summary: SessionSummary;
  reportGenerator: SessionReportGenerator;
  visualData: VisualReportData;
}) {
  const timeAnalysis = reportGenerator.generateTimeAnalysisReport();
  const errorAnalysis = reportGenerator.generateErrorAnalysisReport();

  return (
    <div className="space-y-6">
      {/* Time Analysis */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Time Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.entries(
                    visualData.progressMetrics.timeSpentByActivity,
                  ).map(([activity, time]) => ({
                    name: activity.replace(/_/g, " "),
                    value: Math.round(time / 1000 / 60),
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {Object.keys(
                    visualData.progressMetrics.timeSpentByActivity,
                  ).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${index * 30}, 70%, 60%)`}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}m`, "Time"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Session Time</span>
              <span className="font-bold text-lg">
                {Math.round(timeAnalysis.totalTime / 1000 / 60)}m
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Learning Time</span>
              <span className="font-bold text-lg">
                {Math.round(timeAnalysis.activeTime / 1000 / 60)}m
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Efficiency Score</span>
              <span
                className="font-bold text-lg"
                style={{
                  color:
                    timeAnalysis.efficiencyScore >= 70 ? "#22c55e" : "#f59e0b",
                }}
              >
                {timeAnalysis.efficiencyScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${timeAnalysis.efficiencyScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Learning Curve */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Learning Curve</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={visualData.progressMetrics.learningCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="session" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Error Analysis */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">System Stability</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div
              className="text-3xl font-bold mb-2"
              style={{
                color: errorAnalysis.errorRate < 5 ? "#22c55e" : "#ef4444",
              }}
            >
              {errorAnalysis.errorRate.toFixed(1)}%
            </div>
            <div className="text-gray-600">Error Rate</div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold mb-2 capitalize"
              style={{
                color:
                  errorAnalysis.stability === "excellent"
                    ? "#22c55e"
                    : errorAnalysis.stability === "good"
                      ? "#3b82f6"
                      : errorAnalysis.stability === "fair"
                        ? "#f59e0b"
                        : "#ef4444",
              }}
            >
              {errorAnalysis.stability}
            </div>
            <div className="text-gray-600">Stability</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {errorAnalysis.commonErrors.length}
            </div>
            <div className="text-gray-600">Error Types</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export Tab Component
function ExportTab({
  onExport,
  reportData,
}: {
  onExport: (format: "json" | "html" | "pdf" | "csv") => void;
  reportData: SessionReportType;
}) {
  const exportOptions = [
    {
      format: "html" as const,
      title: "HTML Report",
      description: "Interactive web report with charts and visualizations",
      icon: "🌐",
      color: "bg-blue-500",
    },
    {
      format: "pdf" as const,
      title: "PDF Report",
      description: "Printable document format (converts from HTML)",
      icon: "📄",
      color: "bg-red-500",
    },
    {
      format: "json" as const,
      title: "JSON Data",
      description: "Raw data in JSON format for analysis",
      icon: "📊",
      color: "bg-green-500",
    },
    {
      format: "csv" as const,
      title: "CSV Export",
      description: "Spreadsheet-compatible comma-separated values",
      icon: "📈",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">
          Export Your Session Report
        </h3>
        <p className="text-gray-600 mb-6">
          Choose your preferred format to download and save your learning
          session data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div
            key={option.format}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start space-x-4">
              <div
                className={`${option.color} text-white p-3 rounded-lg text-xl`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">{option.title}</h4>
                <p className="text-gray-600 mb-4">{option.description}</p>
                <button
                  onClick={() => onExport(option.format)}
                  className={`px-4 py-2 ${option.color} text-white rounded hover:opacity-90 transition-opacity flex items-center space-x-2`}
                >
                  <Download className="w-4 h-4" />
                  <span>Export {option.format.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Preview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-lg mb-4">Report Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {reportData.summary.totalInteractions}
            </div>
            <div className="text-sm text-gray-600">Total Interactions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {reportData.summary.learningScore}
            </div>
            <div className="text-sm text-gray-600">Learning Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {reportData.summary.vocabularySelected}
            </div>
            <div className="text-sm text-gray-600">Words Learned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(reportData.summary.totalDuration / 1000 / 60)}m
            </div>
            <div className="text-sm text-gray-600">Session Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionReport;
