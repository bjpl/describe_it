"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { APIClient } from "@/lib/api-client";

interface DescriptionNotebookProps {
  descriptionId?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  userId?: string;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number; // in milliseconds
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export const DescriptionNotebook = memo<DescriptionNotebookProps>(
  function DescriptionNotebook({
    descriptionId,
    initialContent = "",
    onSave,
    userId,
    autoSaveEnabled = true,
    autoSaveInterval = 30000, // 30 seconds
  }) {
    const [content, setContent] = useState(initialContent);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef(initialContent);
    const isMountedRef = useRef(true);

    // Manual save function
    const handleSave = useCallback(async () => {
      if (!userId) {
        logger.warn("Cannot save: user not authenticated");
        setSaveStatus("error");
        return;
      }

      if (content === lastSavedContentRef.current) {
        logger.info("No changes to save");
        return;
      }

      try {
        setSaveStatus("saving");

        // Call external save handler if provided
        if (onSave) {
          await onSave(content);
        }

        // Update description via API if descriptionId exists
        if (descriptionId) {
          const { error } = await APIClient.updateDescription(descriptionId, {
            description_english: content,
          });

          if (error) {
            throw new Error(error.message || "Failed to save description");
          }
        }

        lastSavedContentRef.current = content;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setSaveStatus("saved");

        logger.info("Description saved successfully", {
          descriptionId,
          contentLength: content.length,
        });

        // Reset to idle after showing success message
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus("idle");
          }
        }, 2000);
      } catch (error) {
        logger.error("Failed to save description", error);
        setSaveStatus("error");

        // Reset error status after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus("idle");
          }
        }, 3000);
      }
    }, [content, userId, descriptionId, onSave]);

    // Auto-save effect
    useEffect(() => {
      if (!autoSaveEnabled || !userId) {
        return;
      }

      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Only set timer if there are unsaved changes
      if (hasUnsavedChanges) {
        autoSaveTimerRef.current = setTimeout(() => {
          handleSave();
        }, autoSaveInterval);
      }

      // Cleanup
      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }, [hasUnsavedChanges, autoSaveEnabled, autoSaveInterval, userId, handleSave]);

    // Track content changes
    const handleContentChange = useCallback(
      (newContent: string) => {
        setContent(newContent);
        setHasUnsavedChanges(newContent !== lastSavedContentRef.current);
      },
      []
    );

    // Update initial content when prop changes
    useEffect(() => {
      if (initialContent !== lastSavedContentRef.current) {
        setContent(initialContent);
        lastSavedContentRef.current = initialContent;
        setHasUnsavedChanges(false);
      }
    }, [initialContent]);

    // Track mounted state
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }, []);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description Notebook
          </label>

          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-xs">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Saving...
                  </span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Saved {lastSaved && formatLastSaved(lastSaved)}
                  </span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    Save failed
                  </span>
                </>
              )}
              {saveStatus === "idle" && hasUnsavedChanges && (
                <span className="text-gray-500 dark:text-gray-400">
                  Unsaved changes
                </span>
              )}
            </div>

            {/* Manual save button */}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveStatus === "saving" || !userId}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Save className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Take notes about the description, vocabulary, or grammar patterns..."
          className="w-full min-h-[150px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          disabled={saveStatus === "saving"}
        />

        {autoSaveEnabled && userId && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Auto-save enabled • Changes save automatically every{" "}
            {autoSaveInterval / 1000} seconds
          </p>
        )}

        {!userId && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Sign in to enable auto-save
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{content.length} characters</span>
          {lastSaved && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    );
  }
);

DescriptionNotebook.displayName = "DescriptionNotebook";

// Helper function to format last saved time
function formatLastSaved(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes === 1) {
    return "1 minute ago";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else {
    return `at ${date.toLocaleTimeString()}`;
  }
}
