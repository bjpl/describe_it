"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  BookOpen,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  exportVocabulary,
  getCurrentDateString,
} from "../lib/export/csvExporter";
import type { VocabularyExportItem } from "../types/export";
import {
  PhrasesProgressIndicator,
  TextContentSkeleton,
} from "./ProgressIndicator";

interface Phrase {
  id: string;
  phrase: string;
  definition: string;
  partOfSpeech: string;
  difficulty: string;
  context: string;
  createdAt: Date;
}

interface UnsplashImage {
  id: string;
  url?: string;
  urls?: {
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description?: string;
  description?: string;
}

interface PhrasePanelProps {
  selectedImage: UnsplashImage | null;
  descriptionText: string | null;
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
}

import type { DifficultyLevel } from "../types/unified";

const PhrasesPanel = memo<PhrasePanelProps>(function PhrasesPanel({
  selectedImage,
  descriptionText,
  style,
}) {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("intermediate");
  const [maxPhrases, setMaxPhrases] = useState(5);

  // Safe API call function
  const extractPhrases = useCallback(async () => {
    if (!selectedImage?.urls?.regular) {
      setError("No image selected for phrase extraction");
      return;
    }

    if (!descriptionText) {
      setError(
        "Please generate a description first to extract phrases based on the content.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imageUrl = selectedImage.urls?.regular;

      const response = await fetch("/api/phrases/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          descriptionText: descriptionText,
          style: style,
          targetLevel: difficulty,
          maxPhrases,
        }),
      });

      // Parse response body once and handle errors properly
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to extract phrases");
      }

      const extractedPhrases = responseData.phrases || responseData;
      setPhrases(extractedPhrases);
    } catch (err) {
      // Error logged to structured logging service
      setError(
        err instanceof Error ? err.message : "Failed to extract phrases",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedImage, descriptionText, style, difficulty, maxPhrases]);

  // Memoize dependencies to prevent unnecessary re-extractions
  const imageId = selectedImage?.id;
  const imageUrl = selectedImage?.urls?.regular || selectedImage?.url;

  // Auto-extract when image or description changes (with debouncing)
  useEffect(() => {
    if (!selectedImage) {
      setPhrases([]);
      setError(null);
      return;
    }

    if (!descriptionText) {
      setPhrases([]);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      extractPhrases();
    }, 500);

    return () => clearTimeout(timer);
  }, [imageId, descriptionText, difficulty, style, selectedImage]);

  const getDifficultyColor = useCallback((level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  }, []);

  // Export vocabulary function
  const handleExportVocabulary = useCallback(() => {
    if (phrases.length === 0) {
      alert("No vocabulary data to export. Please extract phrases first.");
      return;
    }

    try {
      const vocabularyData: VocabularyExportItem[] = phrases.map((phrase) => ({
        phrase: phrase.phrase,
        translation: phrase.definition,
        definition: phrase.definition,
        partOfSpeech: phrase.partOfSpeech,
        difficulty: phrase.difficulty as "beginner" | "intermediate" | "advanced",
        category: phrase.partOfSpeech,
        context: phrase.context,
        dateAdded: getCurrentDateString(),
      }));

      exportVocabulary(vocabularyData);
    } catch (error) {
      // Export error logged to structured logging service
      alert("Failed to export vocabulary data. Please try again.");
    }
  }, [phrases]);

  if (!selectedImage) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Select an image to extract phrases and vocabulary.
        </p>
      </div>
    );
  }

  if (!descriptionText) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Phrases & Vocabulary</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Description Required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Please generate a description first. The phrases will be
                extracted from the actual description content.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Phrases & Vocabulary</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Difficulty Selector */}
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setDifficulty(e.target.value as DifficultyLevel)
              }
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Max Phrases Selector */}
          <div className="relative">
            <select
              value={maxPhrases}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setMaxPhrases(Number(e.target.value))
              }
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value={3}>3 phrases</option>
              <option value={5}>5 phrases</option>
              <option value={8}>8 phrases</option>
              <option value={10}>10 phrases</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={extractPhrases}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Extract
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error extracting phrases
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
              <button
                onClick={extractPhrases}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div>
          <PhrasesProgressIndicator isExtracting={true} />
          <div className="space-y-4 mt-6">
            {/* Show skeleton for phrases while loading */}
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <TextContentSkeleton lines={1} />
                    </div>
                    <div className="w-16 h-6 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-md p-3">
                    <TextContentSkeleton lines={2} />
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-md p-3">
                    <TextContentSkeleton lines={1} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phrases Display */}
      {phrases.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {phrases.length} {difficulty} level phrases
            </p>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          </div>

          <div className="grid gap-4">
            {phrases.map((phrase, index) => (
              <div
                key={phrase.id}
                className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  {/* Phrase Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                      &ldquo;{phrase.phrase}&rdquo;
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded">
                      {phrase.partOfSpeech}
                    </span>
                  </div>

                  {/* Definition */}
                  <div className="bg-white dark:bg-gray-700 rounded-md p-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Definition:
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {phrase.definition}
                    </p>
                  </div>

                  {/* Context Example */}
                  <div className="bg-white dark:bg-gray-700 rounded-md p-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Example:
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                      &ldquo;{phrase.context}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Study Actions */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Study Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                Add to Study Set
              </button>
              <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">
                Practice Flashcards
              </button>
              <button className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors">
                Quiz Me
              </button>
              <button
                onClick={handleExportVocabulary}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors flex items-center gap-1"
                title="Export vocabulary as CSV"
              >
                <Download className="h-3 w-3" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {phrases.length === 0 && !loading && !error && selectedImage && (
        <div className="text-center py-8">
          <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No phrases extracted yet.
          </p>
          <button
            onClick={extractPhrases}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Extract Phrases
          </button>
        </div>
      )}
    </div>
  );
});

PhrasesPanel.displayName = "PhrasesPanel";

export default PhrasesPanel;
