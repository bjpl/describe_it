"use client";

import { memo } from "react";
import { VocabularyFormProps } from "./types";

export const VocabularyForm = memo<VocabularyFormProps>(function VocabularyForm({
  show,
  newSetName,
  savedPhrasesCount,
  onSetNameChange,
  onCreateSet,
  onCancel,
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Create New Study Set</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Set Name
          </label>
          <input
            type="text"
            value={newSetName}
            onChange={(e) => onSetNameChange(e.target.value)}
            placeholder="Enter study set name..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCreateSet}
            disabled={!newSetName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Set ({savedPhrasesCount} phrases)
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

VocabularyForm.displayName = "VocabularyForm";