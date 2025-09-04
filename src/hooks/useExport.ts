import { useState, useCallback } from "react";
import { ExportOptions } from "@/types";

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (options: ExportOptions): Promise<Blob> => {
      setIsExporting(true);
      setError(null);

      try {
        // Mock export functionality
        const data = {
          exportedAt: new Date(),
          options,
          // In a real app, this would gather actual data based on options
          message: "Export functionality would gather data here",
        };

        const content = JSON.stringify(data, null, 2);
        return new Blob([content], { type: "application/json" });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Export failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  const downloadExport = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    isExporting,
    error,
    exportData,
    downloadExport,
  };
}
