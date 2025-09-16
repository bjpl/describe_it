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
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton } from "@/components/ui/MotionComponents";
import {
  BookOpen,
  Plus,
  Download,
  Filter,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Target,
  BookMarked,
  Languages,
  Layers,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import {
  CategorizedPhrase,
  UnsplashImage,
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
import {
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
  getDifficultyColor,
  getCategoryColor,
  createSortKey,
} from "@/lib/utils/phrase-helpers";

interface GammaVocabularyExtractorProps {
  selectedImage: UnsplashImage | null;
  descriptionText: string | null;
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
  onPhrasesUpdated?: (phrases: CategorizedPhrase[]) => void;
  // Alpha-1 coordination
  coordinateWithAlpha1?: boolean;
  activeDescriptionTab?: string;
  allDescriptions?: Record<string, string>;
}

interface ExtractorState {
  isExtracting: boolean;
  error: string | null;
  categorizedPhrases: Record<PhraseCategory, CategorizedPhrase[]>;
  selectedPhrases: Set<string>;
  activeCategories: Set<PhraseCategory>;
  searchTerm: string;
  showSettings: boolean;
  addedPhrases: Set<string>;
}

interface ExtractionSettings {
  difficulty: "beginner" | "intermediate" | "advanced";
  maxPhrases: number;
  autoAddSmallExtractions: boolean;
  showTranslations: boolean;
  groupBySimilarity: boolean;
  enabledCategories: Set<PhraseCategory>;
}

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

  const [extractionStats, setExtractionStats] = useState({
    totalExtractions: 0,
    recentExtractions: [] as CategorizedPhrase[],
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
        description: currentDescription,
        imageUrl,
        targetLevel: settings.difficulty,
        maxPhrases: settings.maxPhrases,
        categories: Array.from(settings.enabledCategories),
      };

      const categorizedPhrases =
        await PhraseExtractor.extractCategorizedPhrases({
          description: extractionRequest.description,
          imageUrl: extractionRequest.imageUrl,
          targetLevel: extractionRequest.targetLevel,
          maxPhrases: extractionRequest.maxPhrases,
          categories: extractionRequest.categories,
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
      console.error("Phrase extraction error:", error);
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
        console.error("Error adding phrase to vocabulary:", error);
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
        console.error("Error adding selected phrases:", error);
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
      console.error("Export error:", error);
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
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-blue-600" />
            Vocabulary Extractor
            <span className="text-sm font-normal text-gray-500">
              Agent Gamma-3
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
            {coordinateWithAlpha1 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Languages className="h-3 w-3" />
                Alpha-1 coordination active
              </span>
            )}
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {extractionStats.totalExtractions} total extracted
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {
                Object.values(state.categorizedPhrases).filter(
                  (cat) => cat.length > 0,
                ).length
              }
              /5 categories
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty Selector */}
          <div className="relative">
            <select
              value={settings.difficulty}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  difficulty: e.target.value as
                    | "beginner"
                    | "intermediate"
                    | "advanced",
                }))
              }
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={state.isExtracting}
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
              value={settings.maxPhrases}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  maxPhrases: Number(e.target.value),
                }))
              }
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={state.isExtracting}
            >
              <option value={10}>10 phrases</option>
              <option value={15}>15 phrases</option>
              <option value={20}>20 phrases</option>
              <option value={25}>25 phrases</option>
              <option value={30}>30 phrases</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Extract Button */}
          <MotionButton
            onClick={extractPhrases}
            disabled={state.isExtracting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {state.isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            Extract
          </MotionButton>

          {/* Settings Button */}
          <MotionButton
            onClick={() =>
              setState((prev) => ({
                ...prev,
                showSettings: !prev.showSettings,
              }))
            }
            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="h-4 w-4" />
          </MotionButton>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {state.showSettings && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-4"
          >
            <h3 className="text-lg font-semibold">Extraction Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoAdd"
                    checked={settings.autoAddSmallExtractions}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoAddSmallExtractions: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="autoAdd"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Auto-add small extractions (≤5 phrases)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showTranslations"
                    checked={settings.showTranslations}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        showTranslations: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="showTranslations"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Include translations
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="groupSimilarity"
                    checked={settings.groupBySimilarity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        groupBySimilarity: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="groupSimilarity"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Group similar phrases
                  </label>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      {totalPhrases > 0 && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search phrases..."
              value={state.searchTerm}
              onChange={(e) =>
                setState((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2 py-1">
              Categories:
            </span>
            {categoryConfigs.map((config) => (
              <MotionButton
                key={config.name}
                onClick={() => toggleCategory(config.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  state.activeCategories.has(config.name)
                    ? config.color
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {config.displayName}
              </MotionButton>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {state.selectedPhrases.size} of {totalPhrases} phrases selected
              </span>
              {state.selectedPhrases.size > 0 && (
                <MotionButton
                  onClick={() => addMultiplePhrases()}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="h-3 w-3" />
                  Add Selected
                </MotionButton>
              )}
            </div>

            <MotionButton
              onClick={exportVocabularyCSV}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-1"
              title="Export target_word_list.csv"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="h-3 w-3" />
              Export CSV
            </MotionButton>
          </div>
        </div>
      )}

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
          {categoryConfigs.map((config) => {
            const phrases = filteredCategories[config.name];
            if (
              !state.activeCategories.has(config.name) ||
              phrases.length === 0
            )
              return null;

            return (
              <MotionDiv
                key={config.name}
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
                    >
                      {phrases.length}
                    </span>
                    {config.displayName}
                  </h3>
                </div>

                <div className="grid gap-3">
                  <AnimatePresence mode="popLayout">
                    {phrases.map((phrase, index) => {
                      const isSelected = state.selectedPhrases.has(phrase.id);
                      const isAdded = state.addedPhrases.has(phrase.id);

                      return (
                        <MotionDiv
                          key={phrase.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                          } ${isAdded ? "opacity-70" : ""}`}
                        >
                          <div className="space-y-3">
                            {/* Phrase Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    &ldquo;{phrase.phrase}&rdquo;
                                  </h4>
                                  {phrase.gender && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                      {phrase.gender}
                                    </span>
                                  )}
                                  {phrase.article && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                      {phrase.article}
                                    </span>
                                  )}
                                  {phrase.conjugation &&
                                    phrase.conjugation !== phrase.phrase && (
                                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                                        → {phrase.conjugation}
                                      </span>
                                    )}
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">
                                  {phrase.definition}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                  &ldquo;{phrase.context}&rdquo;
                                </p>
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(phrase.difficulty)}`}
                                >
                                  {phrase.difficulty}
                                </span>

                                {/* Selection checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    togglePhraseSelection(phrase.id)
                                  }
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />

                                {/* Quick add button */}
                                <MotionButton
                                  data-phrase-id={phrase.id}
                                  onClick={() => addPhraseToVocabulary(phrase)}
                                  disabled={isAdded}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isAdded
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-not-allowed"
                                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                  }`}
                                  title={
                                    isAdded
                                      ? "Added to vocabulary"
                                      : "Add to vocabulary"
                                  }
                                  whileHover={{ scale: isAdded ? 1 : 1.1 }}
                                  whileTap={{ scale: isAdded ? 1 : 0.9 }}
                                >
                                  {isAdded ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </MotionButton>
                              </div>
                            </div>

                            {/* Part of Speech Details */}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span>Part of Speech: {phrase.partOfSpeech}</span>
                              <span>
                                Category: {config.displayName.split(" ")[0]}
                              </span>
                              <span>Sort Key: {phrase.sortKey}</span>
                            </div>
                          </div>
                        </MotionDiv>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </MotionDiv>
            );
          })}
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
            Click &ldquo;Extract&rdquo; to analyze the current description and extract
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
      {extractionStats.recentExtractions.length > 0 && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-gray-200 dark:border-gray-600 pt-4"
        >
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Recent Extractions ({extractionStats.recentExtractions.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {extractionStats.recentExtractions.slice(0, 12).map((phrase) => (
              <span
                key={phrase.id}
                className={`px-2 py-1 text-xs rounded ${getCategoryColor(phrase.category)}`}
                title={`${phrase.definition} (${phrase.category})`}
              >
                {phrase.phrase}
              </span>
            ))}
            {extractionStats.recentExtractions.length > 12 && (
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs rounded">
                +{extractionStats.recentExtractions.length - 12} more
              </span>
            )}
          </div>
        </MotionDiv>
      )}
    </div>
  );
};

export default GammaVocabularyExtractor;
