/**
 * Enhanced Export Modal Component
 * Provides comprehensive export functionality with multiple formats and options
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Settings,
  Clock,
  FileText,
  Database,
  Image,
} from "lucide-react";
import {
  ExportFormat,
  ExportOptions,
  ExportCategory,
  ExportTemplate,
  ExportResult,
  BatchExportRequest,
} from "../types/export";
import {
  ExportManager,
  createExportManager,
  EXPORT_PRESETS,
  getRecommendedFormat,
  estimateExportSize,
  validateExportData,
} from "../lib/export";

interface VocabularyExportItem {
  phrase: string;
  translation: string;
  definition: string;
  partOfSpeech: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  context: string;
  dateAdded: string;
  lastReviewed: string | undefined;
  reviewCount: number;
  confidence: number;
}

interface DescriptionExportItem {
  id: string;
  imageId: string;
  imageUrl: string;
  style: string;
  content: string;
  wordCount: number;
  language: string;
  createdAt: string;
  generationTime: number | undefined;
}

interface QAExportItem {
  id: string;
  imageId: string;
  imageUrl: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  confidence: number;
  createdAt: string;
  responseTime: number | undefined;
  correct: boolean;
  userAnswer: string;
}

interface SessionExportItem {
  timestamp: string;
  sessionId: string;
  activityType: string;
  content: string;
  details: string;
  duration: number | undefined;
}

interface ImageExportItem {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  photographer: string;
  source: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabulary?: VocabularyExportItem[];
  descriptions?: DescriptionExportItem[];
  qa?: QAExportItem[];
  sessions?: SessionExportItem[];
  images?: ImageExportItem[];
}

interface ExportProgress {
  isExporting: boolean;
  format?: ExportFormat;
  progress: number;
  message: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  vocabulary = [],
  descriptions = [],
  qa = [],
  sessions = [],
  images = [],
}: ExportModalProps) {
  // State management
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [selectedCategories, setSelectedCategories] = useState<
    ExportCategory[]
  >(["vocabulary"]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: new Date().toISOString().split("T")[0],
  });

  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    message: "",
  });

  const [exportManager, setExportManager] = useState<ExportManager | null>(
    null,
  );
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customOptions, setCustomOptions] = useState<Partial<ExportOptions>>(
    {},
  );

  // Initialize export manager
  useEffect(() => {
    if (isOpen) {
      interface FilterOptions {
        dateRange?: {
          start: Date;
          end: Date;
        };
      }

      const dataSources = {
        getVocabulary: async (filters?: FilterOptions) =>
          vocabulary.filter(
            (item) =>
              !filters?.dateRange ||
              (new Date(item.dateAdded) >= filters.dateRange.start &&
                new Date(item.dateAdded) <= filters.dateRange.end),
          ),
        getDescriptions: async (filters?: FilterOptions) =>
          descriptions.filter(
            (item) =>
              !filters?.dateRange ||
              (new Date(item.createdAt) >= filters.dateRange.start &&
                new Date(item.createdAt) <= filters.dateRange.end),
          ),
        getQA: async (filters?: FilterOptions) =>
          qa.filter(
            (item) =>
              !filters?.dateRange ||
              (new Date(item.createdAt) >= filters.dateRange.start &&
                new Date(item.createdAt) <= filters.dateRange.end),
          ),
        getSessions: async (filters?: FilterOptions) =>
          sessions.filter(
            (item) =>
              !filters?.dateRange ||
              (new Date(item.timestamp) >= filters.dateRange.start &&
                new Date(item.timestamp) <= filters.dateRange.end),
          ),
        getImages: async () => images,
      };

      const manager = createExportManager(dataSources);

      // Set up progress tracking
      manager.addEventListener((event) => {
        switch (event.type) {
          case "start":
            setExportProgress({
              isExporting: true,
              format: event.format,
              progress: 0,
              message: "Starting export...",
            });
            break;
          case "progress":
            setExportProgress((prev) => ({
              ...prev,
              progress: event.progress || 0,
              message: event.data?.message || "Processing...",
            }));
            break;
          case "complete":
            setExportProgress((prev) => ({
              ...prev,
              progress: 100,
              message: "Export completed successfully!",
            }));
            setTimeout(() => {
              setExportProgress({
                isExporting: false,
                progress: 0,
                message: "",
              });
            }, 2000);
            break;
          case "error":
            setExportProgress({
              isExporting: false,
              progress: 0,
              message: `Export failed: ${event.error}`,
            });
            break;
        }
      });

      setExportManager(manager);

      // Load templates
      manager.listTemplates().then(setTemplates);
    }
  }, [isOpen, vocabulary, descriptions, qa, sessions, images]);

  // Auto-select recommended format based on data size
  useEffect(() => {
    if (vocabulary.length > 0) {
      const recommended = getRecommendedFormat(vocabulary.length);
      setSelectedFormat(recommended);
    }
  }, [vocabulary.length]);

  // Handle preset selection
  const applyPreset = (presetKey: string) => {
    const preset = EXPORT_PRESETS[presetKey as keyof typeof EXPORT_PRESETS];
    if (preset) {
      setSelectedFormat(preset.format);
      setSelectedCategories([...preset.categories]);
      setCustomOptions({
        pdfOptions: "pdfOptions" in preset ? preset.pdfOptions : undefined,
        ankiOptions: "ankiOptions" in preset ? preset.ankiOptions : undefined,
        csvOptions: "csvOptions" in preset ? preset.csvOptions : undefined,
      });

      if ("dateRange" in preset && preset.dateRange) {
        setDateRange({
          start: preset.dateRange.start.toISOString().split("T")[0],
          end: preset.dateRange.end.toISOString().split("T")[0],
        });
      }
    }
  };

  // Handle template selection
  const applyTemplate = async (templateId: string) => {
    if (!exportManager) return;

    const template = await exportManager.loadTemplate(templateId);
    if (template) {
      setSelectedFormat(template.format);
      setSelectedCategories(template.options.categories);
      setCustomOptions(template.options);
      setSelectedTemplate(templateId);
    }
  };

  // Build export options
  const buildExportOptions = (): ExportOptions => {
    const options: ExportOptions = {
      format: selectedFormat,
      categories: selectedCategories,
      includeMetadata: true,
      ...customOptions,
    };

    if (dateRange.start && dateRange.end) {
      options.dateRange = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      };
    }

    return options;
  };

  // Handle single export
  const handleExport = async () => {
    if (!exportManager) return;

    // Validate data
    const validation = validateExportData(
      vocabulary,
      descriptions,
      qa,
      sessions,
    );
    if (!validation.isValid) {
      alert(`Export validation failed:\n${validation.errors.join("\n")}`);
      return;
    }

    try {
      const options = buildExportOptions();
      const result = await exportManager.exportData(options);

      if (result.success && result.blob) {
        exportManager.downloadExport(result);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle batch export
  const handleBatchExport = async () => {
    if (!exportManager) return;

    const formats: ExportFormat[] = ["csv", "pdf", "json"];
    const batchRequest: BatchExportRequest = {
      exports: formats.map((format) => ({
        format,
        options: {
          ...buildExportOptions(),
          format,
        },
      })),
      parallel: true,
      onProgress: (completed, total) => {
        setExportProgress((prev) => ({
          ...prev,
          progress: (completed / total) * 100,
          message: `Exporting ${completed}/${total} formats...`,
        }));
      },
    };

    try {
      const results = await exportManager.batchExport(batchRequest);

      results.results.forEach((result) => {
        if (result.success && result.blob) {
          exportManager.downloadExport(result);
        }
      });

      if (results.errors.length > 0) {
        alert(`Some exports failed:\n${results.errors.join("\n")}`);
      }
    } catch (error) {
      alert(
        `Batch export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Calculate totals for display
  const totalItems = selectedCategories.reduce((sum, category) => {
    switch (category) {
      case "vocabulary":
        return sum + vocabulary.length;
      case "descriptions":
        return sum + descriptions.length;
      case "qa":
        return sum + qa.length;
      case "session":
        return sum + sessions.length;
      case "images":
        return sum + images.length;
      case "all":
        return (
          vocabulary.length +
          descriptions.length +
          qa.length +
          sessions.length +
          images.length
        );
      default:
        return sum;
    }
  }, 0);

  const estimatedSize = estimateExportSize(totalItems, selectedFormat);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Export Learning Data
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Progress Bar */}
          {exportProgress.isExporting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-700">{exportProgress.message}</span>
              </div>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Export Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="font-medium text-sm">
                    {key
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {preset.format.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Export Format</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["csv", "json", "pdf", "anki"] as ExportFormat[]).map(
                (format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      selectedFormat === format
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium">{format.toUpperCase()}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format === "csv" && "Spreadsheet data"}
                      {format === "json" && "Structured data"}
                      {format === "pdf" && "Printable format"}
                      {format === "anki" && "Flashcard deck"}
                    </div>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Data Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Data to Export</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(
                [
                  {
                    key: "vocabulary",
                    label: "Vocabulary",
                    icon: FileText,
                    count: vocabulary.length,
                  },
                  {
                    key: "descriptions",
                    label: "Descriptions",
                    icon: Image,
                    count: descriptions.length,
                  },
                  {
                    key: "qa",
                    label: "Q&A Pairs",
                    icon: FileText,
                    count: qa.length,
                  },
                  {
                    key: "sessions",
                    label: "Sessions",
                    icon: Clock,
                    count: sessions.length,
                  },
                  {
                    key: "images",
                    label: "Images",
                    icon: Image,
                    count: images.length,
                  },
                  {
                    key: "all",
                    label: "All Data",
                    icon: Database,
                    count: totalItems,
                  },
                ] as const
              ).map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "all") {
                      setSelectedCategories(["all"]);
                    } else {
                      setSelectedCategories((prev) =>
                        prev.includes(key as ExportCategory)
                          ? prev.filter((c) => c !== key && c !== "all")
                          : [
                              ...prev.filter((c) => c !== "all"),
                              key as ExportCategory,
                            ],
                      );
                    }
                  }}
                  className={`p-3 border rounded-lg flex items-center space-x-3 transition-colors ${
                    selectedCategories.includes(key as ExportCategory)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:bg-gray-50"
                  } ${count === 0 ? "opacity-50" : ""}`}
                  disabled={count === 0}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-gray-500">{count} items</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <Settings className="w-4 h-4" />
              <span>Advanced Options</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Format-specific options */}
                {selectedFormat === "pdf" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      PDF Options
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={
                            customOptions.pdfOptions?.studySheetFormat || false
                          }
                          onChange={(e) =>
                            setCustomOptions((prev) => ({
                              ...prev,
                              pdfOptions: {
                                ...prev.pdfOptions,
                                studySheetFormat: e.target.checked,
                              },
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">Study sheet format</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={
                            customOptions.pdfOptions?.includeImages || false
                          }
                          onChange={(e) =>
                            setCustomOptions((prev) => ({
                              ...prev,
                              pdfOptions: {
                                ...prev.pdfOptions,
                                includeImages: e.target.checked,
                              },
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">Include images</span>
                      </label>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Export Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Export Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Format:</span>
                <span className="ml-2 font-medium">
                  {selectedFormat.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Items:</span>
                <span className="ml-2 font-medium">{totalItems}</span>
              </div>
              <div>
                <span className="text-gray-600">Estimated Size:</span>
                <span className="ml-2 font-medium">{estimatedSize}</span>
              </div>
              <div>
                <span className="text-gray-600">Categories:</span>
                <span className="ml-2 font-medium">
                  {selectedCategories.join(", ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleBatchExport}
              disabled={exportProgress.isExporting || totalItems === 0}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export All Formats
            </button>

            <button
              onClick={handleExport}
              disabled={exportProgress.isExporting || totalItems === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export {selectedFormat.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
