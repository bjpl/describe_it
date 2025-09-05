"use client";

/**
 * Enhanced Vocabulary Panel - Agent Gamma-3 Integration with Alpha-1
 * Coordinates with description tabs and provides comprehensive vocabulary extraction
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Download,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Search,
  Plus,
  CheckCircle2,
  Target,
  BookMarked,
  Layers,
} from "lucide-react";
import { CategorizedPhrase } from "@/types/api";
import {
  PhraseExtractor,
  PhraseCategory,
} from "@/lib/services/phraseExtractor";
import { VocabularyManager } from "@/lib/services/vocabularyManager";
import GammaVocabularyExtractor from "./GammaVocabularyExtractor";

interface EnhancedVocabularyPanelProps {
  selectedImage: any;
  descriptionText: string | null;
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
  // Alpha-1 coordination props
  activeDescriptionTab?: string;
  onTabChange?: (tab: string) => void;
  allDescriptions?: Record<string, string>;
}

interface PanelState {
  activeView: "extractor" | "builder" | "export";
  showSettings: boolean;
  vocabularyStats: {
    totalPhrases: number;
    byCategory: Record<PhraseCategory, number>;
    byDifficulty: Record<string, number>;
  };
  recentExtractions: CategorizedPhrase[];
}

const EnhancedVocabularyPanel: React.FC<EnhancedVocabularyPanelProps> = ({
  selectedImage,
  descriptionText,
  style,
  activeDescriptionTab = "current",
  onTabChange,
  allDescriptions = {},
}) => {
  const [panelState, setPanelState] = useState<PanelState>({
    activeView: "extractor",
    showSettings: false,
    vocabularyStats: {
      totalPhrases: 0,
      byCategory: {
        sustantivos: 0,
        verbos: 0,
        adjetivos: 0,
        adverbios: 0,
        frasesClaves: 0,
      },
      byDifficulty: {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      },
    },
    recentExtractions: [],
  });

  const [vocabularyManager] = useState(
    () =>
      new VocabularyManager({
        autoSave: true,
        enableTranslation: true,
        sortIgnoreArticles: true,
      }),
  );

  const [extractionSettings, setExtractionSettings] = useState({
    autoExtractOnDescriptionChange: true,
    preferredDifficulty: "intermediate" as
      | "beginner"
      | "intermediate"
      | "advanced",
    maxPhrasesPerExtraction: 15,
    enabledCategories: new Set<PhraseCategory>([
      "sustantivos",
      "verbos",
      "adjetivos",
      "adverbios",
      "frasesClaves",
    ]),
    coordinateWithAlpha1: true,
  });

  // Load vocabulary statistics on mount
  useEffect(() => {
    const loadStats = () => {
      try {
        const stats = vocabularyManager.getVocabularyStats();
        setPanelState((prev) => ({
          ...prev,
          vocabularyStats: {
            totalPhrases: stats.totalPhrases,
            byCategory: {
              sustantivos: stats.categoryCounts["sustantivos"] || 0,
              verbos: stats.categoryCounts["verbos"] || 0,
              adjetivos: stats.categoryCounts["adjetivos"] || 0,
              adverbios: stats.categoryCounts["adverbios"] || 0,
              frasesClaves: stats.categoryCounts["frasesClaves"] || 0,
            },
            byDifficulty: {
              beginner: stats.difficultyDistribution["beginner"] || 0,
              intermediate: stats.difficultyDistribution["intermediate"] || 0,
              advanced: stats.difficultyDistribution["advanced"] || 0,
            },
          },
        }));
      } catch (error) {
        console.error("Error loading vocabulary stats:", error);
      }
    };

    loadStats();

    // Listen for vocabulary changes
    const handleVocabularyEvent = () => loadStats();
    vocabularyManager.addEventListener(handleVocabularyEvent);

    return () => {
      vocabularyManager.removeEventListener(handleVocabularyEvent);
    };
  }, [vocabularyManager]);

  // Coordinate with Alpha-1 description tabs
  useEffect(() => {
    if (extractionSettings.coordinateWithAlpha1 && onTabChange) {
      // Send signal to Alpha-1 that we're ready to coordinate
      const coordinationData = {
        agent: "gamma-3",
        status: "ready",
        capabilities: [
          "vocabulary-extraction",
          "phrase-categorization",
          "csv-export",
        ],
        preferences: extractionSettings,
      };

      // Store coordination data in memory for Delta-4
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "gamma3-coordination",
          JSON.stringify(coordinationData),
        );
      }
    }
  }, [extractionSettings.coordinateWithAlpha1, onTabChange]);

  // Handle phrases updated from VocabularyExtractor
  const handlePhrasesUpdated = useCallback(
    (phrases: CategorizedPhrase[]) => {
      setPanelState((prev) => ({
        ...prev,
        recentExtractions: phrases.slice(0, 10), // Keep last 10 extractions
      }));

      // Notify Delta-4 about new extractions
      if (typeof window !== "undefined") {
        const extractionEvent = {
          agent: "gamma-3",
          timestamp: new Date().toISOString(),
          event: "phrases-extracted",
          data: {
            count: phrases.length,
            categories: phrases.reduce(
              (acc, phrase) => {
                acc[phrase.category] = (acc[phrase.category] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
            difficulty: extractionSettings.preferredDifficulty,
            imageId: selectedImage?.id,
          },
        };

        window.sessionStorage.setItem(
          "gamma3-latest-extraction",
          JSON.stringify(extractionEvent),
        );

        // Dispatch custom event for real-time coordination
        window.dispatchEvent(
          new CustomEvent("vocabularyExtracted", { detail: extractionEvent }),
        );
      }
    },
    [extractionSettings.preferredDifficulty, selectedImage?.id],
  );

  // Quick extract from current description
  const quickExtractFromDescription = useCallback(async () => {
    if (!descriptionText || !selectedImage) return;

    try {
      const imageUrl = selectedImage.urls?.regular;
      const categorizedPhrases =
        await PhraseExtractor.extractCategorizedPhrases({
          description: descriptionText,
          imageUrl,
          targetLevel: extractionSettings.preferredDifficulty,
          maxPhrases: extractionSettings.maxPhrasesPerExtraction,
          categories: Array.from(extractionSettings.enabledCategories),
        });

      const allPhrases = Object.values(categorizedPhrases).flat();
      handlePhrasesUpdated(allPhrases);

      // Auto-add to vocabulary if less than 5 phrases
      if (allPhrases.length <= 5) {
        const addedPhrases = await vocabularyManager.addMultiplePhrases(
          allPhrases,
          {
            autoTranslate: true,
            markAsNew: true,
          },
        );

        if (addedPhrases.length > 0) {
          alert(
            `Automatically added ${addedPhrases.length} phrases to vocabulary!`,
          );
        }
      }
    } catch (error) {
      console.error("Quick extraction error:", error);
    }
  }, [
    descriptionText,
    selectedImage,
    extractionSettings,
    vocabularyManager,
    handlePhrasesUpdated,
  ]);

  // Export vocabulary as target_word_list.csv
  const exportTargetWordList = useCallback(async () => {
    try {
      await vocabularyManager.downloadTargetWordList(undefined, true);

      // Log export event for Delta-4
      if (typeof window !== "undefined") {
        const exportEvent = {
          agent: "gamma-3",
          timestamp: new Date().toISOString(),
          event: "vocabulary-exported",
          data: {
            format: "target_word_list.csv",
            totalPhrases: panelState.vocabularyStats.totalPhrases,
            categories: panelState.vocabularyStats.byCategory,
          },
        };

        window.sessionStorage.setItem(
          "gamma3-latest-export",
          JSON.stringify(exportEvent),
        );
        window.dispatchEvent(
          new CustomEvent("vocabularyExported", { detail: exportEvent }),
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Error exporting vocabulary. Please try again.");
    }
  }, [vocabularyManager, panelState.vocabularyStats]);

  // Get current description for extraction (coordinate with Alpha-1)
  const getCurrentDescription = useMemo(() => {
    if (activeDescriptionTab && allDescriptions[activeDescriptionTab]) {
      return allDescriptions[activeDescriptionTab];
    }
    return descriptionText;
  }, [activeDescriptionTab, allDescriptions, descriptionText]);

  // Category statistics for display
  const categoryStats = useMemo(() => {
    const categories = PhraseExtractor.getAllCategories();
    return categories.map((config) => ({
      ...config,
      count: panelState.vocabularyStats.byCategory[config.name] || 0,
      percentage:
        panelState.vocabularyStats.totalPhrases > 0
          ? Math.round(
              ((panelState.vocabularyStats.byCategory[config.name] || 0) /
                panelState.vocabularyStats.totalPhrases) *
                100,
            )
          : 0,
    }));
  }, [panelState.vocabularyStats]);

  if (!selectedImage) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Select an image to start vocabulary extraction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-blue-600" />
            Vocabulary Extractor
            <span className="text-sm font-normal text-gray-500">
              Agent Gamma-3
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {panelState.vocabularyStats.totalPhrases} phrases saved
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {
                Object.values(panelState.vocabularyStats.byCategory).filter(
                  (count) => count > 0,
                ).length
              }{" "}
              categories
            </span>
            {panelState.recentExtractions.length > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {panelState.recentExtractions.length} recent extractions
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() =>
                setPanelState((prev) => ({ ...prev, activeView: "extractor" }))
              }
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                panelState.activeView === "extractor"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Extract
            </button>
            <button
              onClick={() =>
                setPanelState((prev) => ({ ...prev, activeView: "builder" }))
              }
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                panelState.activeView === "builder"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Builder
            </button>
          </div>

          {/* Quick Actions */}
          <button
            onClick={quickExtractFromDescription}
            disabled={!getCurrentDescription}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Quick extract from current description"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            onClick={exportTargetWordList}
            disabled={panelState.vocabularyStats.totalPhrases === 0}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export target_word_list.csv"
          >
            <Download className="h-5 w-5" />
          </button>

          <button
            onClick={() =>
              setPanelState((prev) => ({
                ...prev,
                showSettings: !prev.showSettings,
              }))
            }
            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Alpha-1 Coordination Status */}
      {extractionSettings.coordinateWithAlpha1 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>Coordinating with Alpha-1 description tabs</span>
            {activeDescriptionTab && (
              <span className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">
                Active: {activeDescriptionTab}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {panelState.showSettings && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Extraction Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Difficulty
              </label>
              <select
                value={extractionSettings.preferredDifficulty}
                onChange={(e) =>
                  setExtractionSettings((prev) => ({
                    ...prev,
                    preferredDifficulty: e.target.value as
                      | "beginner"
                      | "intermediate"
                      | "advanced",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Phrases Per Extraction
              </label>
              <select
                value={extractionSettings.maxPhrasesPerExtraction}
                onChange={(e) =>
                  setExtractionSettings((prev) => ({
                    ...prev,
                    maxPhrasesPerExtraction: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                <option value={10}>10 phrases</option>
                <option value={15}>15 phrases</option>
                <option value={20}>20 phrases</option>
                <option value={25}>25 phrases</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoExtract"
                checked={extractionSettings.autoExtractOnDescriptionChange}
                onChange={(e) =>
                  setExtractionSettings((prev) => ({
                    ...prev,
                    autoExtractOnDescriptionChange: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="autoExtract"
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Auto-extract when description changes
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="coordinateAlpha1"
                checked={extractionSettings.coordinateWithAlpha1}
                onChange={(e) =>
                  setExtractionSettings((prev) => ({
                    ...prev,
                    coordinateWithAlpha1: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="coordinateAlpha1"
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Coordinate with Alpha-1 description tabs
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Category Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {categoryStats.map((category) => (
          <div
            key={category.name}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center"
          >
            <div
              className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${category.color}`}
            >
              {category.count}
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              {category.displayName.split(" ")[0]}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {category.percentage}%
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-96">
        {panelState.activeView === "extractor" && (
          <GammaVocabularyExtractor
            selectedImage={selectedImage}
            descriptionText={getCurrentDescription}
            style={style}
            onPhrasesUpdated={handlePhrasesUpdated}
          />
        )}

        {panelState.activeView === "builder" && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Vocabulary Builder integration coming soon.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Use the Extract tab to build your vocabulary for now.
            </p>
          </div>
        )}
      </div>

      {/* Recent Extractions Footer */}
      {panelState.recentExtractions.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Recent Extractions ({panelState.recentExtractions.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {panelState.recentExtractions.slice(0, 8).map((phrase) => (
              <span
                key={phrase.id}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                title={phrase.definition}
              >
                {phrase.phrase}
              </span>
            ))}
            {panelState.recentExtractions.length > 8 && (
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs rounded">
                +{panelState.recentExtractions.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVocabularyPanel;
