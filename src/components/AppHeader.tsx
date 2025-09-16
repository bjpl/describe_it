"use client";

import { memo, useCallback, useState } from "react";
import { Download, Settings, Info, BarChart3 } from "lucide-react";
import {
  exportSession,
  exportAllData,
  getCurrentTimestamp,
  type SessionData,
  type ResponseItem,
} from "../lib/export/csvExporter";
import { VocabularyItem, ImageComponentProps } from "@/types";
import { vocabularyItemToUI } from "@/types/unified";
import { SessionReportModal } from "./SessionReportModal";
import ExportModal from "./ExportModal";

interface AppHeaderProps {
  canExport: boolean;
  onExport?: () => void; // Make optional since we'll handle it internally
  onToggleSettings: () => void;
  onToggleInfo: () => void;
  // Session data for comprehensive export
  sessionData?: {
    selectedImage?: ImageComponentProps;
    descriptions?: { [key: string]: string };
    phrases?: VocabularyItem[];
    responses?: ResponseItem[];
    searchHistory?: string[];
  };
}

export const AppHeader = memo<AppHeaderProps>(function AppHeader({
  canExport,
  onExport,
  onToggleSettings,
  onToggleInfo,
  sessionData,
}) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportClick = useCallback(() => {
    if (!canExport) return;

    // Open the enhanced export modal
    setShowExportModal(true);
  }, [canExport]);

  // Convert session data to export format
  const getExportData = useCallback(() => {
    if (!sessionData)
      return { vocabulary: [], descriptions: [], qa: [], sessions: [] };

    const vocabulary =
      sessionData.phrases?.map((phrase) => {
        // Convert to UI format first to handle difficulty level properly
        const uiPhrase = vocabularyItemToUI(phrase);
        return {
          phrase: phrase.spanish_text,
          translation: phrase.english_translation || "",
          definition: phrase.english_translation,
          partOfSpeech: phrase.part_of_speech,
          difficulty: uiPhrase.difficulty_level,
          category: phrase.category || "general",
          context: phrase.context_sentence_spanish || "",
          dateAdded: new Date().toISOString(),
          lastReviewed: undefined,
          reviewCount: 0,
          confidence: 0,
        };
      }) || [];

    const descriptions = sessionData.descriptions
      ? Object.entries(sessionData.descriptions).map(
          ([imageId, content], index) => ({
            id: `desc-${imageId}-${index}`,
            imageId,
            imageUrl: "",
            style: "detailed",
            content,
            wordCount: content.split(" ").length,
            language: "en",
            createdAt: new Date().toISOString(),
            generationTime: undefined,
          }),
        )
      : [];

    const qa =
      sessionData.responses?.map((response, index) => ({
        id: `qa-${index}`,
        imageId: sessionData.selectedImage?.id || "",
        imageUrl: sessionData.selectedImage?.urls?.regular || "",
        question: response.question,
        answer: response.correct_answer,
        category: "general",
        difficulty: "medium",
        confidence: response.user_answer === response.correct_answer ? 1 : 0.5,
        createdAt: response.timestamp,
        responseTime: undefined,
        correct: response.user_answer === response.correct_answer,
        userAnswer: response.user_answer,
      })) || [];

    const sessions: any[] = [];
    const timestamp = getCurrentTimestamp();

    // Add search activities
    if (sessionData.searchHistory && sessionData.searchHistory.length > 0) {
      sessionData.searchHistory.forEach((query) => {
        sessions.push({
          timestamp: getCurrentTimestamp(),
          sessionId: "current-session",
          activityType: "search_query",
          content: query,
          details: "Image search query",
          duration: undefined,
        });
      });
    }

    // Add description activities
    if (sessionData.descriptions) {
      Object.entries(sessionData.descriptions).forEach(
        ([imageId, description]) => {
          sessions.push({
            timestamp: getCurrentTimestamp(),
            sessionId: "current-session",
            activityType: "description_generated",
            content: description,
            details: `Description for image ${imageId}`,
            duration: undefined,
          });
        },
      );
    }

    const images: any[] = []; // No images data in sessionData, providing empty array

    return { vocabulary, descriptions, qa, sessions, images };
  }, [sessionData]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Describe It
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Spanish Learning through Images
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="View Session Analytics Report"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              onClick={handleExportClick}
              disabled={!canExport}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={
                !canExport
                  ? "Use the app to generate some data first"
                  : "Export session data in multiple formats"
              }
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onToggleSettings}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={onToggleInfo}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="About"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Session Report Modal */}
      <SessionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {/* Enhanced Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        {...getExportData()}
      />
    </header>
  );
});

AppHeader.displayName = "AppHeader";
