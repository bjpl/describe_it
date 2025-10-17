"use client";

import { memo, useCallback, useState, useEffect } from "react";
import {
  Play,
  Star,
  RotateCcw,
  FileDown,
  Download,
  Trash2,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import { VocabularyListProps } from "./types";
import { APIClient } from "@/lib/api-client";
import type { VocabularyList as DBVocabularyList, VocabularyItem } from "@/types/database";
import { logger } from "@/lib/logger";

interface VocabularyListWithItems extends DBVocabularyList {
  items: VocabularyItem[];
  itemCount?: number;
}

interface APIVocabularyListProps extends Omit<VocabularyListProps, 'vocabularySets'> {
  userId?: string;
  refreshTrigger?: number;
}

export const VocabularyList = memo<APIVocabularyListProps>(function VocabularyList({
  reviewItems,
  statistics,
  onStartStudySession,
  onExportSet,
  onDeleteSet,
  calculateProgress,
  userId,
  refreshTrigger = 0,
}) {
  const [vocabularySets, setVocabularySets] = useState<VocabularyListWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Fetch vocabulary lists and their items
  const fetchVocabularyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all vocabulary lists
      const { data: lists, error: listsError } = await APIClient.getVocabularyLists(userId);

      if (listsError) {
        throw new Error(listsError.message || 'Failed to fetch vocabulary lists');
      }

      if (!lists || lists.length === 0) {
        setVocabularySets([]);
        setLoading(false);
        return;
      }

      // Fetch items for each list in parallel
      const listsWithItems = await Promise.all(
        lists.map(async (list) => {
          const { data: items, error: itemsError } = await APIClient.getVocabularyItems(list.id);

          if (itemsError) {
            logger.error(`Failed to fetch items for list ${list.id}:`, itemsError);
            return {
              ...list,
              items: [],
              itemCount: 0,
            };
          }

          return {
            ...list,
            items: items || [],
            itemCount: items?.length || 0,
          };
        })
      );

      setVocabularySets(listsWithItems);
      setRetryCount(0); // Reset retry count on success

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error fetching vocabulary data:', err);
      setError(errorMessage);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
        logger.info(`Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);

        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, retryCount]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchVocabularyData();
  }, [fetchVocabularyData, refreshTrigger]);

  // Retry when retryCount changes
  useEffect(() => {
    if (retryCount > 0 && retryCount <= MAX_RETRIES) {
      fetchVocabularyData();
    }
  }, [retryCount, fetchVocabularyData]);

  const handleDeleteWithConfirmation = useCallback(async (setId: string) => {
    if (confirm("Are you sure you want to delete this set?")) {
      try {
        await onDeleteSet(setId);
        // Refresh data after deletion
        await fetchVocabularyData();
      } catch (err) {
        logger.error('Error deleting vocabulary set:', err);
        setError('Failed to delete vocabulary set');
      }
    }
  }, [onDeleteSet, fetchVocabularyData]);

  const handleExportCSV = useCallback((set: VocabularyListWithItems) => {
    // Convert database format to legacy format for export
    const legacySet = {
      id: set.id,
      name: set.name,
      description: set.description,
      phrases: set.items,
      createdAt: new Date(set.created_at),
    };
    onExportSet(legacySet as any, "csv");
  }, [onExportSet]);

  const handleExportJSON = useCallback((set: VocabularyListWithItems) => {
    // Convert database format to legacy format for export
    const legacySet = {
      id: set.id,
      name: set.name,
      description: set.description,
      phrases: set.items,
      createdAt: new Date(set.created_at),
    };
    onExportSet(legacySet as any, "json");
  }, [onExportSet]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    fetchVocabularyData();
  }, [fetchVocabularyData]);

  // Loading state
  if (loading && vocabularySets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading vocabulary sets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && vocabularySets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Vocabulary Sets
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry {retryCount > 0 && `(${retryCount}/${MAX_RETRIES})`}
          </button>
        </div>
      </div>
    );
  }

  // Empty state
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

      {error && vocabularySets.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
        </div>
      )}

      <div className="grid gap-4">
        {vocabularySets.map((set) => {
          const dueForReview = reviewItems.filter(
            (item) =>
              set.items.some((vocabItem) => vocabItem.id === item.id) &&
              (!item.nextReview || item.nextReview <= new Date()),
          ).length;

          // Convert to legacy format for calculateProgress
          const legacySet = {
            id: set.id,
            name: set.name,
            description: set.description,
            phrases: set.items,
            createdAt: new Date(set.created_at),
          };

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
                    {set.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{set.itemCount || set.items.length} phrases</span>
                    <span>Progress: {calculateProgress(legacySet as any)}%</span>
                    <span>
                      Created: {new Date(set.created_at).toLocaleDateString()}
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