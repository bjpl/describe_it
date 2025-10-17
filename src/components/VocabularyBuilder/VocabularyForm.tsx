"use client";

import { memo, useState } from "react";
import { VocabularyFormProps } from "./types";
import { Loader2, CheckCircle, AlertCircle, BookOpen } from "lucide-react";

export const VocabularyForm = memo<VocabularyFormProps>(function VocabularyForm({
  show,
  newSetName,
  savedPhrasesCount,
  onSetNameChange,
  onCreateSet,
  onCancel,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!show) {
    return null;
  }

  const handleSubmit = async () => {
    // Validate form
    if (!newSetName.trim()) {
      setError("Please enter a set name");
      return;
    }

    if (savedPhrasesCount === 0) {
      setError("No phrases to save. Please add some phrases first.");
      return;
    }

    // Clear previous errors
    setError(null);
    setIsSubmitting(true);

    try {
      // Call the parent's create set handler
      // This will be updated to use API in the parent component
      await onCreateSet();

      // Show success state
      setSuccess(true);

      // Reset form after a delay
      setTimeout(() => {
        setSuccess(false);
        onCancel();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create study set");
      setIsSubmitting(false);
    }
  };

  const isValid = newSetName.trim().length > 0 && savedPhrasesCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Create New Study Set</h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="set-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Set Name
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            id="set-name"
            type="text"
            value={newSetName}
            onChange={(e) => {
              onSetNameChange(e.target.value);
              setError(null); // Clear error on input change
            }}
            placeholder="Enter study set name..."
            disabled={isSubmitting || success}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-invalid={!!error}
            aria-describedby={error ? "set-name-error" : undefined}
          />
          {newSetName.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {newSetName.length}/100 characters
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            id="set-name-error"
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div
            className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            role="status"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Study set created successfully!</span>
          </div>
        )}

        {/* Phrase count info */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400">
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            {savedPhrasesCount} {savedPhrasesCount === 1 ? 'phrase' : 'phrases'} will be added to this set
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting || success}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {success && <CheckCircle className="w-4 h-4" />}
            {isSubmitting ? "Creating..." : success ? "Created!" : `Create Set (${savedPhrasesCount})`}
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting || success}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

VocabularyForm.displayName = "VocabularyForm";