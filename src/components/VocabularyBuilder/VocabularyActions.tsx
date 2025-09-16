"use client";

import { memo } from "react";
import { FileUp } from "lucide-react";
import { VocabularyActionsProps } from "./types";

export const VocabularyActions = memo<VocabularyActionsProps>(function VocabularyActions({
  savedPhrases,
  showCreateSet,
  viewMode,
  onImportSet,
  onShowCreateSet,
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Import button */}
      <button
        onClick={onImportSet}
        className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Import vocabulary set"
      >
        <FileUp className="h-5 w-5" />
      </button>

      {/* Create Set button - only show when conditions are met */}
      {savedPhrases.length > 0 &&
        !showCreateSet &&
        viewMode.current === "sets" && (
          <button
            onClick={onShowCreateSet}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Study Set
          </button>
        )}
    </div>
  );
});

VocabularyActions.displayName = "VocabularyActions";