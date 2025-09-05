"use client";

import { memo, useCallback } from "react";
import { 
  Play, 
  Star, 
  RotateCcw, 
  FileDown, 
  Download, 
  Trash2, 
  Clock 
} from "lucide-react";
import { VocabularyListProps } from "./types";

export const VocabularyList = memo<VocabularyListProps>(function VocabularyList({
  vocabularySets,
  reviewItems,
  statistics,
  onStartStudySession,
  onExportSet,
  onDeleteSet,
  calculateProgress,
}) {
  const handleDeleteWithConfirmation = useCallback((setId: string) => {
    if (confirm("Are you sure you want to delete this set?")) {
      onDeleteSet(setId);
    }
  }, [onDeleteSet]);

  const handleExportCSV = useCallback((set: any) => {
    onExportSet(set, "csv");
  }, [onExportSet]);

  const handleExportJSON = useCallback((set: any) => {
    onExportSet(set, "json");
  }, [onExportSet]);

  if (vocabularySets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Study Sets</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>{statistics.itemsToReview} items due for review</span>
        </div>
      </div>

      <div className="grid gap-4">
        {vocabularySets.map((set) => {
          const dueForReview = reviewItems.filter(
            (item) =>
              set.phrases.some((phrase) => phrase.id === item.id) &&
              (!item.nextReview || item.nextReview <= new Date()),
          ).length;

          return (
            <div
              key={set.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {set.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {set.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{set.phrases.length} phrases</span>
                    <span>Progress: {calculateProgress(set)}%</span>
                    <span>
                      Created: {set.createdAt.toLocaleDateString()}
                    </span>
                    {dueForReview > 0 && (
                      <span className="text-orange-600 font-medium">
                        {dueForReview} due for review
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportCSV(set)}
                    className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                    title="Export as CSV"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleExportJSON(set)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Export as JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWithConfirmation(set.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete set"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onStartStudySession("flashcards", set.id)}
                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                >
                  <Play className="h-3 w-3" />
                  Flashcards
                </button>
                <button
                  onClick={() => onStartStudySession("quiz", set.id)}
                  className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                >
                  <Star className="h-3 w-3" />
                  Quiz
                </button>
                <button
                  onClick={() => onStartStudySession("review", set.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                    dueForReview > 0
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                  Review {dueForReview > 0 && `(${dueForReview})`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

VocabularyList.displayName = "VocabularyList";