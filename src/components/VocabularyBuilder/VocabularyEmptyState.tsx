"use client";

import { memo } from "react";
import { BookOpen } from "lucide-react";

interface VocabularyEmptyStateProps {
  onImportSet: () => void;
}

export const VocabularyEmptyState = memo<VocabularyEmptyStateProps>(function VocabularyEmptyState({
  onImportSet,
}) {
  return (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-400 mb-2">
        No saved phrases yet.
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
        Save phrases from the extraction panel to start building your
        vocabulary.
      </p>
      <button
        onClick={onImportSet}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Import Vocabulary Set
      </button>
    </div>
  );
});

VocabularyEmptyState.displayName = "VocabularyEmptyState";