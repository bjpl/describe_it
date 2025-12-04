/**
 * Import Dialog Component
 * Allows users to import vocabulary and learning data
 */

import React, { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { importData, ImportResult, ImportOptions } from "@/lib/import/importManager";
import { logger } from "@/lib/logger";

interface ImportDialogProps {
  onImportComplete: (result: ImportResult) => void;
  onCancel: () => void;
  className?: string;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  onImportComplete,
  onCancel,
  className = "",
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"json" | "csv" | "anki">("json");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setResult(null);

        // Auto-detect format from extension
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "json") setFormat("json");
        else if (ext === "csv") setFormat("csv");
        else if (ext === "txt") setFormat("anki");
      }
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setResult(null);

    try {
      const options: ImportOptions = {
        format,
        validateData: true,
        skipDuplicates: true,
        mergeStrategy: "merge",
      };

      const importResult = await importData(selectedFile, options);
      setResult(importResult);

      if (importResult.success) {
        onImportComplete(importResult);
      }
    } catch (error) {
      logger.error("Import error:", error);
      setResult({
        success: false,
        itemsImported: 0,
        errors: [error instanceof Error ? error.message : "Import failed"],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, format, onImportComplete]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Import Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["json", "csv", "anki"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  format === fmt
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-sm font-medium uppercase">{fmt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select File
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              onChange={handleFileSelect}
              accept={
                format === "json"
                  ? ".json"
                  : format === "csv"
                    ? ".csv"
                    : ".txt"
              }
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="cursor-pointer flex flex-col items-center"
            >
              <FileText className="w-12 h-12 text-gray-400 mb-2" />
              {selectedFile ? (
                <>
                  <div className="text-sm font-medium text-gray-700">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">
                    Click to select file
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format === "json"
                      ? "JSON export files"
                      : format === "csv"
                        ? "CSV vocabulary lists"
                        : "Anki deck files"}
                  </div>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Import Result */}
        {result && (
          <div
            className={`p-4 rounded-lg border-2 ${
              result.success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div
                  className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}
                >
                  {result.success
                    ? `Successfully imported ${result.itemsImported} items`
                    : "Import failed"}
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        • {error}
                      </div>
                    ))}
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-medium text-yellow-800">
                      Warnings:
                    </div>
                    {result.warnings.slice(0, 5).map((warning, index) => (
                      <div key={index} className="text-xs text-yellow-700">
                        • {warning}
                      </div>
                    ))}
                    {result.warnings.length > 5 && (
                      <div className="text-xs text-yellow-700">
                        + {result.warnings.length - 5} more warnings
                      </div>
                    )}
                  </div>
                )}

                {result.data && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.data.vocabulary && (
                      <Badge className="bg-blue-100 text-blue-800">
                        {result.data.vocabulary.length} vocabulary
                      </Badge>
                    )}
                    {result.data.descriptions && (
                      <Badge className="bg-purple-100 text-purple-800">
                        {result.data.descriptions.length} descriptions
                      </Badge>
                    )}
                    {result.data.qa && (
                      <Badge className="bg-green-100 text-green-800">
                        {result.data.qa.length} Q&A
                      </Badge>
                    )}
                    {result.data.sessions && (
                      <Badge className="bg-orange-100 text-orange-800">
                        {result.data.sessions.length} sessions
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Format Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">
              {format === "json"
                ? "JSON Format"
                : format === "csv"
                  ? "CSV Format"
                  : "Anki Format"}
            </div>
            <div className="text-xs">
              {format === "json" && (
                <>
                  Import complete backups with all data types (vocabulary,
                  descriptions, Q&A, sessions)
                </>
              )}
              {format === "csv" && (
                <>
                  Import vocabulary lists with Spanish, English, and optional
                  context sentences
                </>
              )}
              {format === "anki" && (
                <>
                  Import Anki flashcard decks (tab-separated format: Spanish →
                  English)
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
            disabled={isImporting}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportDialog;
