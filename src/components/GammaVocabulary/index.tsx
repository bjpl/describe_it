"use client";

/**
 * Gamma-3 Vocabulary Extraction System
 * HIVE MIND AGENT GAMMA-3: VOCABULARY EXTRACTION SPECIALIST
 *
 * Comprehensive 5-category phrase extraction with click-to-add functionality:
 * 1. Sustantivos (Nouns) - with articles (el/la/los/las)
 * 2. Verbos (Verbs) - conjugated + infinitive forms
 * 3. Adjetivos (Adjectives) - with gender variations
 * 4. Adverbios (Adverbs)
 * 5. Frases clave (Key phrases)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MotionDiv, MotionButton } from "@/components/ui/MotionComponents";
import {
  BookOpen,
  AlertCircle,
  Loader2,
  BookMarked,
} from "lucide-react";
import {
  CategorizedPhrase,
  VocabularyExtractionRequest,
} from "@/types/api";
import {
  PhraseExtractor,
  PhraseCategory,
} from "@/lib/services/phraseExtractor";
import {
  VocabularyManager,
  ClickToAddOptions,
} from "@/lib/services/vocabularyManager";
import { safeStringify } from "@/lib/utils/json-safe";
import { logger } from "@/lib/logger";

import { ExtractorControls } from "./ExtractorControls";
import { CategoryDisplay } from "./CategoryDisplay";
import { ExtractionStats } from "./ExtractionStats";
import {
  GammaVocabularyExtractorProps,
  ExtractorState,
  ExtractionSettings,
  ExtractionStatsData,
} from "./types";

const GammaVocabularyExtractor: React.FC<GammaVocabularyExtractorProps> = ({
  selectedImage,
  descriptionText,
  style,
  onPhrasesUpdated,
  coordinateWithAlpha1 = true,
  activeDescriptionTab = "current",
  allDescriptions = {},
}) => {
  const [state, setState] = useState<ExtractorState>({
    isExtracting: false,
    error: null,
    categorizedPhrases: {
      sustantivos: [],
      verbos: [],
      adjetivos: [],
      adverbios: [],
      frasesClaves: [],
    },
    selectedPhrases: new Set(),
    activeCategories: new Set([
      "sustantivos",
      "verbos",
      "adjetivos",
      "adverbios",
      "frasesClaves",
    ] as PhraseCategory[]),
    searchTerm: "",
    showSettings: false,
    addedPhrases: new Set(),
  });

  const [settings, setSettings] = useState<ExtractionSettings>({
    difficulty: "intermediate",
    maxPhrases: 15,
    autoAddSmallExtractions: true,
    showTranslations: true,
    groupBySimilarity: false,
    enabledCategories: new Set([
      "sustantivos",
      "verbos",
      "adjetivos",
      "adverbios",
      "frasesClaves",
    ] as PhraseCategory[]),
  });

  const [vocabularyManager] = useState(
    () =>
      new VocabularyManager({
        autoSave: true,
        enableTranslation: settings.showTranslations,
        sortIgnoreArticles: true,
      }),
  );

  const [extractionStats, setExtractionStats] = useState<ExtractionStatsData>({
    totalExtractions: 0,
    recentExtractions: [],
  });

  // Get current description (coordinate with Alpha-1 if enabled)
  const currentDescription = useMemo(() => {
    if (
      coordinateWithAlpha1 &&
      activeDescriptionTab &&
      allDescriptions[activeDescriptionTab]
    ) {
      return allDescriptions[activeDescriptionTab];
    }
    return descriptionText;
  }, [
    coordinateWithAlpha1,
    activeDescriptionTab,
    allDescriptions,
    descriptionText,
  ]);

  // Auto-extract when dependencies change
  useEffect(() => {
    if (
      selectedImage &&
      currentDescription &&
      settings.autoAddSmallExtractions
    ) {
      const timer = setTimeout(() => extractPhrases(), 1200);
      return () => clearTimeout(timer);
    }
    // extractPhrases is intentionally omitted to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedImage?.id,
    currentDescription,
    settings.difficulty,
    settings.maxPhrases,
  ]);

  // Coordinate with Delta-4 logging
  useEffect(() => {
    if (coordinateWithAlpha1 && typeof window !== "undefined") {
      const coordinationData = {
        agent: "gamma-3",
        status: "active",
        capabilities: [
          "phrase-extraction",
          "5-category-system",
          "click-to-add",
          "csv-export",
          "alpha1-coordination",
        ],
        settings,
        stats: extractionStats,
      };

      window.sessionStorage.setItem(
        "gamma3-status",
        safeStringify(coordinationData),
      );
      window.dispatchEvent(
        new CustomEvent("gamma3StatusUpdate", { detail: coordinationData }),
      );
    }
  }, [coordinateWithAlpha1, settings, extractionStats]);

  // Extract phrases from current description
  const extractPhrases = useCallback(async () => {
    if (!selectedImage || !currentDescription) {
      setState((prev) => ({
        ...prev,
        error: "No image or description available for phrase extraction",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isExtracting: true, error: null }));

    try {
      const imageUrl = selectedImage.urls?.regular || selectedImage.urls.small;
      const extractionRequest: VocabularyExtractionRequest = {
        text: currentDescription,
        description: currentDescription,
        imageUrl,
        targetLevel: settings.difficulty,
        maxPhrases: settings.maxPhrases,
        categories: Array.from(settings.enabledCategories),
      };

      const categorizedPhrases =
        await PhraseExtractor.extractCategorizedPhrases({
          description: extractionRequest.description ?? "",
          imageUrl: extractionRequest.imageUrl ?? "",
          targetLevel: extractionRequest.targetLevel ?? "beginner",
          maxPhrases: extractionRequest.maxPhrases ?? 20,
          categories: (extractionRequest.categories ?? []) as PhraseCategory[],
        });

      setState((prev) => ({
        ...prev,
        categorizedPhrases,
        isExtracting: false,
        selectedPhrases: new Set(),
      }));

      // Update extraction stats
      const allPhrases = Object.values(categorizedPhrases).flat();
      setExtractionStats((prev) => ({
        totalExtractions: prev.totalExtractions + allPhrases.length,
        recentExtractions: [
          ...allPhrases.slice(0, 8),
          ...prev.recentExtractions,
        ].slice(0, 16),
      }));

      // Notify parent component
      onPhrasesUpdated?.(allPhrases);

      // Auto-add small extractions if enabled
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (settings.autoAddSmallExtractions && allPhrases.length <= 5) {
        await addMultiplePhrases(allPhrases);
      }

      // Log to Delta-4
      if (typeof window !== "undefined") {
        const extractionEvent = {
          agent: "gamma-3",
          timestamp: new Date().toISOString(),
          event: "phrases-extracted",
          data: {
            totalPhrases: allPhrases.length,
            categories: Object.keys(categorizedPhrases).reduce(
              (acc, key) => {
                acc[key] = categorizedPhrases[key as PhraseCategory].length;
                return acc;
              },
              {} as Record<string, number>,
            ),
            difficulty: settings.difficulty,
            imageId: selectedImage.id,
            style,
          },
        };

        window.sessionStorage.setItem(
          "gamma3-latest-extraction",
          safeStringify(extractionEvent),
        );
        window.dispatchEvent(
          new CustomEvent("vocabularyExtracted", { detail: extractionEvent }),
        );
      }
    } catch (error) {
      logger.error("Phrase extraction error:", error);
      setState((prev) => ({
        ...prev,
        isExtracting: false,
        error:
          error instanceof Error ? error.message : "Failed to extract phrases",
      }));
    }
  }, [selectedImage, currentDescription, settings, onPhrasesUpdated, style]);

  // Toggle phrase selection
  const togglePhraseSelection = useCallback((phraseId: string) => {
    setState((prev) => ({
      ...prev,
      selectedPhrases: new Set(
        prev.selectedPhrases.has(phraseId)
          ? [...prev.selectedPhrases].filter((id) => id !== phraseId)
          : [...prev.selectedPhrases, phraseId],
      ),
    }));
  }, []);

  // Toggle category filter
  const toggleCategory = useCallback((category: PhraseCategory) => {
    setState((prev) => ({
      ...prev,
      activeCategories: new Set(
        prev.activeCategories.has(category)
          ? [...prev.activeCategories].filter((cat) => cat !== category)
          : [...prev.activeCategories, category],
      ),
    }));
  }, []);

  // Add single phrase to vocabulary (click-to-add)
  const addPhraseToVocabulary = useCallback(
    async (phrase: CategorizedPhrase, options: ClickToAddOptions = {}) => {
      try {
        await vocabularyManager.addPhraseWithClick(phrase, {
          autoTranslate: settings.showTranslations,
          markAsNew: true,
          ...options,
        });

        setState((prev) => ({
          ...prev,
          addedPhrases: new Set([...prev.addedPhrases, phrase.id]),
        }));

        // Visual feedback
        const button = document.querySelector(
          `[data-phrase-id="${phrase.id}"]`,
        );
        if (button) {
          button.classList.add("animate-pulse", "scale-110");
          setTimeout(() => {
            button.classList.remove("animate-pulse", "scale-110");
          }, 1200);
        }
      } catch (error) {
        logger.error("Error adding phrase to vocabulary:", error);
        alert("Error adding phrase to vocabulary. Please try again.");
      }
    },
    [vocabularyManager, settings.showTranslations],
  );

  // Add multiple phrases
  const addMultiplePhrases = useCallback(
    async (phrasesToAdd?: CategorizedPhrase[]) => {
      const selectedPhraseObjects =
        phrasesToAdd ||
        Object.values(state.categorizedPhrases)
          .flat()
          .filter((phrase) => state.selectedPhrases.has(phrase.id));

      if (selectedPhraseObjects.length === 0) {
        alert("Please select phrases to add to vocabulary");
        return;
      }

      try {
        const addedPhrases = await vocabularyManager.addMultiplePhrases(
          selectedPhraseObjects,
          {
            autoTranslate: settings.showTranslations,
            markAsNew: true,
          },
        );

        addedPhrases.forEach((phrase) => {
          setState((prev) => ({
            ...prev,
            addedPhrases: new Set([...prev.addedPhrases, phrase.id]),
          }));
        });

        if (!phrasesToAdd) {
          setState((prev) => ({ ...prev, selectedPhrases: new Set() }));
        }

        alert(
          `Successfully added ${addedPhrases.length} phrases to vocabulary!`,
        );
      } catch (error) {
        logger.error("Error adding selected phrases:", error);
        alert("Error adding phrases to vocabulary. Please try again.");
      }
    },
    [
      state.categorizedPhrases,
      state.selectedPhrases,
      vocabularyManager,
      settings.showTranslations,
    ],
  );

  // Export vocabulary as CSV
  const exportVocabularyCSV = useCallback(async () => {
    try {
      await vocabularyManager.downloadTargetWordList(
        undefined,
        settings.showTranslations,
      );

      // Log export for Delta-4
      if (typeof window !== "undefined") {
        const exportEvent = {
          agent: "gamma-3",
          timestamp: new Date().toISOString(),
          event: "vocabulary-exported",
          data: {
            format: "target_word_list.csv",
            includeTranslations: settings.showTranslations,
          },
        };

        window.sessionStorage.setItem(
          "gamma3-latest-export",
          safeStringify(exportEvent),
        );
        window.dispatchEvent(
          new CustomEvent("vocabularyExported", { detail: exportEvent }),
        );
      }
    } catch (error) {
      logger.error("Export error:", error);
      alert("Error exporting vocabulary. Please try again.");
    }
  }, [vocabularyManager, settings.showTranslations]);

  // Filter phrases by search term
  const filteredCategories = useMemo(() => {
    if (!state.searchTerm) return state.categorizedPhrases;

    const filtered: Record<PhraseCategory, CategorizedPhrase[]> = {
      sustantivos: [],
      verbos: [],
      adjetivos: [],
      adverbios: [],
      frasesClaves: [],
    };

    Object.entries(state.categorizedPhrases).forEach(([category, phrases]) => {
      filtered[category as PhraseCategory] = phrases.filter(
        (phrase) =>
          phrase.phrase
            .toLowerCase()
            .includes(state.searchTerm.toLowerCase()) ||
          phrase.definition
            .toLowerCase()
            .includes(state.searchTerm.toLowerCase()) ||
          phrase.context.toLowerCase().includes(state.searchTerm.toLowerCase()),
      );
    });

    return filtered;
  }, [state.categorizedPhrases, state.searchTerm]);

  // Get category configurations
  const categoryConfigs = useMemo(() => PhraseExtractor.getAllCategories(), []);

  // Count total phrases
  const totalPhrases = useMemo(
    () =>
      Object.values(state.categorizedPhrases).reduce(
        (sum, phrases) => sum + phrases.length,
        0,
      ),
    [state.categorizedPhrases],
  );

  // Empty state when no image selected
  if (!selectedImage) {
    return (
      <div className="text-center py-12">
        <BookMarked className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agent Gamma-3: Vocabulary Extractor
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Select an image to start extracting Spanish vocabulary into 5
            categories: Sustantivos, Verbos, Adjetivos, Adverbios, and Frases
            Clave.
          </p>
        </div>
      </div>
    );
  }

  // No description state
  if (!currentDescription) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-blue-600" />
            Vocabulary Extractor
            <span className="text-sm font-normal text-gray-500">Gamma-3</span>
          </h2>
          {coordinateWithAlpha1 && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              ⚡ Coordinating with Alpha-1
            </div>
          )}
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Description Required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Please generate a description first. The vocabulary will be
                extracted from the description content.
                {coordinateWithAlpha1 && (
                  <span className="block mt-1 font-medium">
                    📝 Currently monitoring: {activeDescriptionTab} tab
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ExtractorControls
        state={state}
        settings={settings}
        extractionStats={extractionStats}
        categoryConfigs={categoryConfigs}
        totalPhrases={totalPhrases}
        coordinateWithAlpha1={coordinateWithAlpha1}
        onExtract={extractPhrases}
        onSettingsChange={setSettings}
        onSettingsToggle={() =>
          setState((prev) => ({ ...prev, showSettings: !prev.showSettings }))
        }
        onSearchChange={(searchTerm) =>
          setState((prev) => ({ ...prev, searchTerm }))
        }
        onCategoryToggle={toggleCategory}
        onAddSelected={() => addMultiplePhrases()}
        onExportCSV={exportVocabularyCSV}
      />

      {/* Error Display */}
      {state.error && (
        <MotionDiv
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Extraction Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {state.error}
              </p>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Loading State */}
      {state.isExtracting && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Extracting {settings.difficulty} level vocabulary from
              description...
            </span>
          </div>

          {/* Skeleton loading for categories */}
          {categoryConfigs.map((config) => (
            <div key={config.name} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-300 animate-pulse">
                {config.displayName}
              </h3>
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse"
                  >
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </MotionDiv>
      )}

      {/* Categorized Phrases Display */}
      {!state.isExtracting && totalPhrases > 0 && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <CategoryDisplay
            categoryConfigs={categoryConfigs}
            filteredCategories={filteredCategories}
            activeCategories={state.activeCategories}
            selectedPhrases={state.selectedPhrases}
            addedPhrases={state.addedPhrases}
            onToggleSelection={togglePhraseSelection}
            onAddPhrase={addPhraseToVocabulary}
          />
        </MotionDiv>
      )}

      {/* Empty State */}
      {!state.isExtracting && totalPhrases === 0 && !state.error && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Ready to Extract Vocabulary
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Click "Extract" to analyze the current description and extract
            Spanish vocabulary into 5 categories with click-to-add
            functionality.
          </p>
          <MotionButton
            onClick={extractPhrases}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BookOpen className="h-5 w-5" />
            Extract Vocabulary
          </MotionButton>
        </MotionDiv>
      )}

      {/* Recent Extractions Footer */}
      <ExtractionStats stats={extractionStats} />
    </div>
  );
};

export default GammaVocabularyExtractor;
