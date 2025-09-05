"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Database,
  Package,
  Check,
  X,
  AlertCircle,
  Calendar,
  Filter,
  Settings,
  Eye,
  RefreshCw,
  Clock,
  Target,
  BookOpen,
  Brain,
  BarChart3,
  Globe,
  Layers,
  Archive,
  Share,
  Mail,
  Cloud,
  Printer,
  ExternalLink,
} from "lucide-react";

interface ExportFormat {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  extension: string;
  supports: {
    vocabulary: boolean;
    progress: boolean;
    sessions: boolean;
    images: boolean;
    settings: boolean;
  };
  options?: {
    includeImages?: boolean;
    includeMetadata?: boolean;
    compression?: "none" | "low" | "medium" | "high";
    format?: string[];
  };
}

interface ExportData {
  vocabulary: any[];
  progress: any;
  sessions: any[];
  images: any[];
  settings: any;
  metadata: {
    exportDate: string;
    version: string;
    totalItems: number;
  };
}

interface ExportOptions {
  includeVocabulary: boolean;
  includeProgress: boolean;
  includeSessions: boolean;
  includeImages: boolean;
  includeSettings: boolean;
  dateRange: {
    from: string;
    to: string;
  };
  compression: "none" | "low" | "medium" | "high";
  customFilename?: string;
}

const EnhancedExportManager: React.FC<{
  data?: ExportData;
  onClose?: () => void;
  className?: string;
}> = ({ data, onClose, className = "" }) => {
  const [selectedFormat, setSelectedFormat] = useState<string>("json");
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeVocabulary: true,
    includeProgress: true,
    includeSessions: true,
    includeImages: false,
    includeSettings: false,
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      to: new Date().toISOString().split("T")[0],
    },
    compression: "medium",
  });
  const [exportStatus, setExportStatus] = useState<
    "idle" | "preparing" | "exporting" | "complete" | "error"
  >("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const exportFormats: ExportFormat[] = [
    {
      id: "json",
      name: "JSON",
      icon: <Database className="h-5 w-5" />,
      description: "Structured data format, best for backups and data transfer",
      extension: ".json",
      supports: {
        vocabulary: true,
        progress: true,
        sessions: true,
        images: true,
        settings: true,
      },
    },
    {
      id: "csv",
      name: "CSV (Spreadsheet)",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      description:
        "Comma-separated values, perfect for spreadsheets and data analysis",
      extension: ".csv",
      supports: {
        vocabulary: true,
        progress: true,
        sessions: true,
        images: false,
        settings: false,
      },
    },
    {
      id: "pdf",
      name: "PDF Report",
      icon: <FileText className="h-5 w-5" />,
      description: "Formatted document with charts and summaries",
      extension: ".pdf",
      supports: {
        vocabulary: true,
        progress: true,
        sessions: true,
        images: true,
        settings: false,
      },
    },
    {
      id: "anki",
      name: "Anki Deck",
      icon: <Brain className="h-5 w-5" />,
      description: "Flashcard deck for Anki spaced repetition software",
      extension: ".apkg",
      supports: {
        vocabulary: true,
        progress: false,
        sessions: false,
        images: false,
        settings: false,
      },
    },
    {
      id: "html",
      name: "Web Page",
      icon: <Globe className="h-5 w-5" />,
      description: "Interactive HTML report that can be viewed in any browser",
      extension: ".html",
      supports: {
        vocabulary: true,
        progress: true,
        sessions: true,
        images: true,
        settings: false,
      },
    },
    {
      id: "backup",
      name: "Full Backup",
      icon: <Archive className="h-5 w-5" />,
      description:
        "Complete application backup including all data and settings",
      extension: ".zip",
      supports: {
        vocabulary: true,
        progress: true,
        sessions: true,
        images: true,
        settings: true,
      },
    },
  ];

  const selectedFormatData = exportFormats.find((f) => f.id === selectedFormat);

  // Mock data if not provided
  const mockData: ExportData = {
    vocabulary: Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      spanish: `Spanish word ${i + 1}`,
      english: `English word ${i + 1}`,
      category: ["greetings", "food", "travel", "colors"][i % 4],
      difficulty: ["beginner", "intermediate", "advanced"][i % 3],
      learned: Math.random() > 0.3,
    })),
    progress: {
      totalSessions: 45,
      totalTime: 2340,
      accuracy: 87,
      streak: 12,
    },
    sessions: Array.from({ length: 45 }, (_, i) => ({
      id: i + 1,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      duration: Math.floor(Math.random() * 60) + 10,
      score: Math.floor(Math.random() * 40) + 60,
    })),
    images: [],
    settings: {},
    metadata: {
      exportDate: new Date().toISOString(),
      version: "1.0.0",
      totalItems: 150,
    },
  };

  const displayData = data || mockData;

  const filteredData = useMemo(() => {
    const fromDate = new Date(exportOptions.dateRange.from);
    const toDate = new Date(exportOptions.dateRange.to);

    return {
      ...displayData,
      sessions: displayData.sessions.filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= fromDate && sessionDate <= toDate;
      }),
    };
  }, [displayData, exportOptions.dateRange]);

  const estimatedSize = useMemo(() => {
    let size = 0;

    if (exportOptions.includeVocabulary) {
      size += filteredData.vocabulary.length * 0.5; // ~0.5KB per vocab item
    }
    if (exportOptions.includeProgress) {
      size += 2; // ~2KB for progress data
    }
    if (exportOptions.includeSessions) {
      size += filteredData.sessions.length * 0.2; // ~0.2KB per session
    }
    if (exportOptions.includeImages) {
      size += filteredData.images.length * 50; // ~50KB per image
    }
    if (exportOptions.includeSettings) {
      size += 5; // ~5KB for settings
    }

    // Apply compression factor
    const compressionFactors = { none: 1, low: 0.8, medium: 0.6, high: 0.4 };
    size *= compressionFactors[exportOptions.compression];

    return size;
  }, [filteredData, exportOptions]);

  const formatFileSize = (sizeKB: number) => {
    if (sizeKB < 1024) {
      return `${Math.round(sizeKB)} KB`;
    }
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  const generateFilename = useCallback(() => {
    if (exportOptions.customFilename) {
      return exportOptions.customFilename;
    }

    const date = new Date().toISOString().split("T")[0];
    const formatName =
      selectedFormatData?.name.toLowerCase().replace(/\s+/g, "-") ||
      selectedFormat;
    return `describe-it-export-${formatName}-${date}`;
  }, [exportOptions.customFilename, selectedFormat, selectedFormatData]);

  const handleOptionChange = useCallback(
    (key: keyof ExportOptions, value: any) => {
      setExportOptions((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const generatePreview = useCallback(() => {
    const preview: any = {};

    if (exportOptions.includeVocabulary) {
      preview.vocabulary = filteredData.vocabulary.slice(0, 5);
    }
    if (exportOptions.includeProgress) {
      preview.progress = filteredData.progress;
    }
    if (exportOptions.includeSessions) {
      preview.sessions = filteredData.sessions.slice(0, 3);
    }

    setPreviewData(preview);
  }, [filteredData, exportOptions]);

  const simulateExport = useCallback(async () => {
    setExportStatus("preparing");
    setExportProgress(0);

    // Simulate preparation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setExportProgress(25);

    setExportStatus("exporting");

    // Simulate export process
    for (let i = 25; i <= 100; i += 25) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setExportProgress(i);
    }

    // Generate and download file
    const exportedData = {
      ...(exportOptions.includeVocabulary && {
        vocabulary: filteredData.vocabulary,
      }),
      ...(exportOptions.includeProgress && { progress: filteredData.progress }),
      ...(exportOptions.includeSessions && { sessions: filteredData.sessions }),
      ...(exportOptions.includeImages && { images: filteredData.images }),
      ...(exportOptions.includeSettings && { settings: filteredData.settings }),
      metadata: {
        ...filteredData.metadata,
        exportFormat: selectedFormat,
        exportOptions: exportOptions,
      },
    };

    const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generateFilename()}${selectedFormatData?.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportStatus("complete");
    setTimeout(() => {
      setExportStatus("idle");
      setExportProgress(0);
    }, 3000);
  }, [
    filteredData,
    exportOptions,
    selectedFormat,
    selectedFormatData,
    generateFilename,
  ]);

  const ExportFormatCard: React.FC<{ format: ExportFormat }> = ({ format }) => (
    <motion.button
      onClick={() => setSelectedFormat(format.id)}
      className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
        selectedFormat === format.id
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              selectedFormat === format.id
                ? "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {format.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {format.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format.extension}
            </p>
          </div>
        </div>
        {selectedFormat === format.id && (
          <Check className="h-5 w-5 text-blue-600" />
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {format.description}
      </p>

      <div className="flex flex-wrap gap-1">
        {Object.entries(format.supports).map(([feature, supported]) => (
          <span
            key={feature}
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              supported
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
            }`}
          >
            {feature}
          </span>
        ))}
      </div>
    </motion.button>
  );

  return (
    <div className={`bg-white dark:bg-gray-900 ${className}`}>
      <div className="flex h-full">
        {/* Format Selection */}
        <div className="w-96 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Export Data
              </h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {exportFormats.map((format) => (
                <ExportFormatCard key={format.id} format={format} />
              ))}
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="max-w-2xl">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Export Options
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Customize what data to include in your export
                </p>
              </div>

              {/* Data Selection */}
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Include Data
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        key: "includeVocabulary",
                        label: "Vocabulary",
                        icon: BookOpen,
                        count: displayData.vocabulary.length,
                      },
                      {
                        key: "includeProgress",
                        label: "Progress",
                        icon: BarChart3,
                        count: 1,
                      },
                      {
                        key: "includeSessions",
                        label: "Sessions",
                        icon: Clock,
                        count: filteredData.sessions.length,
                      },
                      {
                        key: "includeImages",
                        label: "Images",
                        icon: FileImage,
                        count: displayData.images.length,
                      },
                      {
                        key: "includeSettings",
                        label: "Settings",
                        icon: Settings,
                        count: 1,
                      },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isSupported =
                        selectedFormatData?.supports[
                          option.key
                            .replace("include", "")
                            .toLowerCase() as keyof typeof selectedFormatData.supports
                        ];

                      return (
                        <label
                          key={option.key}
                          className={`flex items-center p-4 border-2 rounded-lg transition-all cursor-pointer ${
                            !isSupported
                              ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                              : exportOptions[option.key as keyof ExportOptions]
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions[
                                option.key as keyof ExportOptions
                              ] as boolean
                            }
                            onChange={(e) =>
                              handleOptionChange(
                                option.key as keyof ExportOptions,
                                e.target.checked,
                              )
                            }
                            disabled={!isSupported}
                            className="mr-3"
                          />
                          <Icon className="h-5 w-5 mr-3 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {option.label}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {option.count} items
                            </div>
                          </div>
                          {!isSupported && (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Date Range
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={exportOptions.dateRange.from}
                        onChange={(e) =>
                          handleOptionChange("dateRange", {
                            ...exportOptions.dateRange,
                            from: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={exportOptions.dateRange.to}
                        onChange={(e) =>
                          handleOptionChange("dateRange", {
                            ...exportOptions.dateRange,
                            to: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Settings className="h-4 w-4" />
                    Advanced Options
                  </button>

                  <AnimatePresence>
                    {showAdvancedOptions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Compression Level
                          </label>
                          <select
                            value={exportOptions.compression}
                            onChange={(e) =>
                              handleOptionChange("compression", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                          >
                            <option value="none">No Compression</option>
                            <option value="low">Low Compression</option>
                            <option value="medium">Medium Compression</option>
                            <option value="high">High Compression</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Custom Filename
                          </label>
                          <input
                            type="text"
                            value={exportOptions.customFilename || ""}
                            onChange={(e) =>
                              handleOptionChange(
                                "customFilename",
                                e.target.value,
                              )
                            }
                            placeholder={generateFilename()}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Export Summary
                </h4>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Format:
                    </span>
                    <span className="ml-2 font-medium">
                      {selectedFormatData?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Est. Size:
                    </span>
                    <span className="ml-2 font-medium">
                      {formatFileSize(estimatedSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Filename:
                    </span>
                    <span className="ml-2 font-medium">
                      {generateFilename()}
                      {selectedFormatData?.extension}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Compression:
                    </span>
                    <span className="ml-2 font-medium capitalize">
                      {exportOptions.compression}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Data Preview
                  </h4>
                  <button
                    onClick={generatePreview}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    <Eye className="h-3 w-3" />
                    Generate Preview
                  </button>
                </div>

                {previewData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto"
                  >
                    <pre>{JSON.stringify(previewData, null, 2)}</pre>
                  </motion.div>
                )}
              </div>

              {/* Export Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {exportStatus === "exporting" && (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Exporting... {exportProgress}%
                      </span>
                    </div>
                  )}

                  {exportStatus === "complete" && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Export completed!</span>
                    </div>
                  )}
                </div>

                <motion.button
                  onClick={simulateExport}
                  disabled={
                    exportStatus === "exporting" || exportStatus === "preparing"
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  whileHover={exportStatus === "idle" ? { scale: 1.05 } : {}}
                  whileTap={exportStatus === "idle" ? { scale: 0.95 } : {}}
                >
                  <Download className="h-4 w-4" />
                  {exportStatus === "preparing" && "Preparing..."}
                  {exportStatus === "exporting" && "Exporting..."}
                  {(exportStatus === "idle" ||
                    exportStatus === "complete" ||
                    exportStatus === "error") &&
                    "Export Data"}
                </motion.button>
              </div>

              {/* Export Progress */}
              {(exportStatus === "exporting" ||
                exportStatus === "preparing") && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${exportProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExportManager;
