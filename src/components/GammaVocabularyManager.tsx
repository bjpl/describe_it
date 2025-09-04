"use client";

/**
 * Gamma-3 Vocabulary Manager - Comprehensive Management System
 * HIVE MIND AGENT GAMMA-3: VOCABULARY MANAGEMENT SPECIALIST
 *
 * Coordinates vocabulary building across the entire application:
 * - Click-to-add functionality from descriptions
 * - Alphabetical sorting ignoring articles
 * - CSV export to target_word_list.csv
 * - Integration with Alpha-1 description tabs
 * - Real-time coordination with Delta-4 logging
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Download,
  Search,
  Filter,
  Settings,
  Target,
  BookMarked,
  Languages,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Calendar,
  Clock,
} from "lucide-react";
import {
  CategorizedPhrase,
  SavedPhrase,
  VocabularySet,
  UnsplashImage,
} from "@/types/api";
import {
  PhraseExtractor,
  PhraseCategory,
} from "@/lib/services/phraseExtractor";
import {
  VocabularyManager,
  VocabularyStats,
} from "@/lib/services/vocabularyManager";
import VocabularyStorage from "@/lib/storage/vocabularyStorage";
import {
  getDifficultyColor,
  getCategoryColor,
} from "@/lib/utils/phrase-helpers";
import GammaVocabularyExtractor from "./GammaVocabularyExtractor";

interface GammaVocabularyManagerProps {
  selectedImage: UnsplashImage | null;
  descriptionText: string | null;
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
  // Alpha-1 coordination
  activeDescriptionTab?: string;
  onTabChange?: (tab: string) => void;
  allDescriptions?: Record<string, string>;
  // Delta-4 coordination
  onLogEvent?: (event: any) => void;
}

interface ManagerState {
  activeView: "extractor" | "builder" | "stats" | "sets";
  showSettings: boolean;
  vocabularyStats: VocabularyStats;
  searchTerm: string;
  selectedCategory: PhraseCategory | "all";
  selectedDifficulty: "all" | "beginner" | "intermediate" | "advanced";
  isExporting: boolean;
  isCreatingSet: boolean;
  editingSetId: string | null;
}

interface ManagerSettings {
  autoSave: boolean;
  enableTranslation: boolean;
  sortIgnoreArticles: boolean;
  maxPhrasesPerSet: number;
  coordinateWithAlpha1: boolean;
  logToDelta4: boolean;
  displayDensity: "compact" | "comfortable" | "spacious";
}

const GammaVocabularyManager: React.FC<GammaVocabularyManagerProps> = ({
  selectedImage,
  descriptionText,
  style,
  activeDescriptionTab = "current",
  onTabChange,
  allDescriptions = {},
  onLogEvent,
}) => {
  const [state, setState] = useState<ManagerState>({
    activeView: "extractor",
    showSettings: false,
    vocabularyStats: {
      totalPhrases: 0,
      categoryCounts: {},
      difficultyDistribution: {},
      recentlyAdded: [],
      mostStudied: [],
    },
    searchTerm: "",
    selectedCategory: "all",
    selectedDifficulty: "all",
    isExporting: false,
    isCreatingSet: false,
    editingSetId: null,
  });

  const [settings, setSettings] = useState<ManagerSettings>({
    autoSave: true,
    enableTranslation: true,
    sortIgnoreArticles: true,
    maxPhrasesPerSet: 100,
    coordinateWithAlpha1: true,
    logToDelta4: true,
    displayDensity: "comfortable",
  });

  const [vocabularyManager] = useState(
    () =>
      new VocabularyManager({
        autoSave: settings.autoSave,
        enableTranslation: settings.enableTranslation,
        sortIgnoreArticles: settings.sortIgnoreArticles,
        maxPhrasesPerSet: settings.maxPhrasesPerSet,
      }),
  );

  const [vocabularySets, setVocabularySets] = useState<VocabularySet[]>([]);
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(
    new Set(),
  );

  // Load vocabulary stats on mount and periodically
  useEffect(() => {
    const loadVocabularyData = () => {
      try {
        const stats = vocabularyManager.getVocabularyStats();
        setState((prev) => ({ ...prev, vocabularyStats: stats }));

        // Load vocabulary sets
        // TODO: Add public method to VocabularyManager to get vocabulary sets
        // const sets = vocabularyManager.storage.loadVocabularySets();
        // setVocabularySets(sets);
        setVocabularySets([]);
      } catch (error) {
        console.error("Error loading vocabulary data:", error);
      }
    };

    loadVocabularyData();

    // Refresh every 30 seconds
    const interval = setInterval(loadVocabularyData, 30000);

    // Listen for vocabulary changes
    const handleVocabularyEvent = () => loadVocabularyData();
    vocabularyManager.addEventListener(handleVocabularyEvent);

    return () => {
      clearInterval(interval);
      vocabularyManager.removeEventListener(handleVocabularyEvent);
    };
  }, [vocabularyManager]);

  // Coordinate with Alpha-1 and Delta-4
  useEffect(() => {
    if (settings.coordinateWithAlpha1 && typeof window !== "undefined") {
      const coordinationData = {
        agent: "gamma-3-manager",
        timestamp: new Date().toISOString(),
        status: "active",
        capabilities: [
          "vocabulary-management",
          "phrase-organization",
          "csv-export",
          "set-management",
          "alpha1-coordination",
          "delta4-logging",
        ],
        stats: state.vocabularyStats,
        settings,
      };

      window.sessionStorage.setItem(
        "gamma3-manager-status",
        JSON.stringify(coordinationData),
      );

      if (settings.logToDelta4 && onLogEvent) {
        onLogEvent({
          agent: "gamma-3-manager",
          event: "status-update",
          data: coordinationData,
        });
      }
    }
  }, [settings, state.vocabularyStats, onLogEvent]);

  // Handle phrases updated from extractor
  const handlePhrasesUpdated = useCallback(
    (phrases: CategorizedPhrase[]) => {
      // Refresh stats after extraction
      setTimeout(() => {
        const stats = vocabularyManager.getVocabularyStats();
        setState((prev) => ({ ...prev, vocabularyStats: stats }));
      }, 500);

      // Log to Delta-4
      if (settings.logToDelta4 && onLogEvent) {
        onLogEvent({
          agent: "gamma-3-manager",
          event: "phrases-updated",
          data: {
            totalPhrases: phrases.length,
            categories: phrases.reduce(
              (acc, phrase) => {
                acc[phrase.category] = (acc[phrase.category] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
            imageId: selectedImage?.id,
          },
        });
      }
    },
    [vocabularyManager, selectedImage?.id, settings.logToDelta4, onLogEvent],
  );

  // Export vocabulary as CSV
  const exportVocabularyCSV = useCallback(
    async (setId?: string) => {
      setState((prev) => ({ ...prev, isExporting: true }));

      try {
        await vocabularyManager.downloadTargetWordList(
          setId,
          settings.enableTranslation,
        );

        // Log successful export
        if (settings.logToDelta4 && onLogEvent) {
          onLogEvent({
            agent: "gamma-3-manager",
            event: "vocabulary-exported",
            data: {
              format: "target_word_list.csv",
              setId,
              includeTranslations: settings.enableTranslation,
              totalPhrases: setId
                ? vocabularySets.find((set) => set.id === setId)?.phrases
                    .length || 0
                : state.vocabularyStats.totalPhrases,
            },
          });
        }

        alert("Vocabulary exported successfully!");
      } catch (error) {
        console.error("Export error:", error);
        alert("Error exporting vocabulary. Please try again.");
      } finally {
        setState((prev) => ({ ...prev, isExporting: false }));
      }
    },
    [
      vocabularyManager,
      settings.enableTranslation,
      settings.logToDelta4,
      onLogEvent,
      vocabularySets,
      state.vocabularyStats.totalPhrases,
    ],
  );

  // Create new vocabulary set from selected phrases
  const createVocabularySet = useCallback(
    async (name: string, description?: string) => {
      if (selectedPhrases.size === 0) {
        alert("Please select phrases to create a vocabulary set");
        return;
      }

      setState((prev) => ({ ...prev, isCreatingSet: true }));

      try {
        const vocabularySet = await vocabularyManager.createSetFromPhrases(
          Array.from(selectedPhrases),
          name,
          description,
        );

        // Refresh data
        const stats = vocabularyManager.getVocabularyStats();
        const sets = VocabularyStorage.loadVocabularySets();
        setState((prev) => ({ ...prev, vocabularyStats: stats }));
        setVocabularySets(sets);
        setSelectedPhrases(new Set());

        // Log to Delta-4
        if (settings.logToDelta4 && onLogEvent) {
          onLogEvent({
            agent: "gamma-3-manager",
            event: "vocabulary-set-created",
            data: {
              setId: vocabularySet.id,
              setName: name,
              phraseCount: vocabularySet.phrases.length,
            },
          });
        }

        alert(`Vocabulary set "${name}" created successfully!`);
      } catch (error) {
        console.error("Error creating vocabulary set:", error);
        alert("Error creating vocabulary set. Please try again.");
      } finally {
        setState((prev) => ({ ...prev, isCreatingSet: false }));
      }
    },
    [selectedPhrases, vocabularyManager, settings.logToDelta4, onLogEvent],
  );

  // Delete vocabulary set
  const deleteVocabularySet = useCallback(
    async (setId: string) => {
      if (!confirm("Are you sure you want to delete this vocabulary set?"))
        return;

      try {
        const success = VocabularyStorage.deleteVocabularySet(setId);
        if (success) {
          // Refresh data
          const stats = vocabularyManager.getVocabularyStats();
          const sets = VocabularyStorage.loadVocabularySets();
          setState((prev) => ({ ...prev, vocabularyStats: stats }));
          setVocabularySets(sets);

          // Log to Delta-4
          if (settings.logToDelta4 && onLogEvent) {
            onLogEvent({
              agent: "gamma-3-manager",
              event: "vocabulary-set-deleted",
              data: { setId },
            });
          }

          alert("Vocabulary set deleted successfully!");
        } else {
          alert("Failed to delete vocabulary set.");
        }
      } catch (error) {
        console.error("Error deleting vocabulary set:", error);
        alert("Error deleting vocabulary set. Please try again.");
      }
    },
    [vocabularyManager, settings.logToDelta4, onLogEvent],
  );

  // Filter phrases based on search and category
  const filteredPhrases = useMemo(() => {
    const allPhrases = vocabularySets.flatMap((set) => set.phrases);

    return allPhrases.filter((phrase) => {
      const matchesSearch =
        !state.searchTerm ||
        phrase.phrase.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        phrase.definition
          .toLowerCase()
          .includes(state.searchTerm.toLowerCase()) ||
        (phrase.translation &&
          phrase.translation
            .toLowerCase()
            .includes(state.searchTerm.toLowerCase()));

      const matchesCategory =
        state.selectedCategory === "all" ||
        phrase.category === state.selectedCategory;
      const matchesDifficulty =
        state.selectedDifficulty === "all" ||
        phrase.difficulty === state.selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [
    vocabularySets,
    state.searchTerm,
    state.selectedCategory,
    state.selectedDifficulty,
  ]);

  // Get category configurations
  const categoryConfigs = useMemo(() => PhraseExtractor.getAllCategories(), []);

  // Density classes
  const densityClasses = {
    compact: "py-2 text-sm",
    comfortable: "py-3",
    spacious: "py-4",
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-blue-600" />
            Vocabulary Manager
            <span className="text-sm font-normal text-gray-500">
              Agent Gamma-3
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {state.vocabularyStats.totalPhrases} phrases
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {vocabularySets.length} sets
            </span>
            {settings.coordinateWithAlpha1 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Languages className="h-4 w-4" />
                Alpha-1 sync
              </span>
            )}
            {settings.logToDelta4 && (
              <span className="flex items-center gap-1 text-green-600">
                <BarChart3 className="h-4 w-4" />
                Delta-4 logging
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(["extractor", "builder", "stats", "sets"] as const).map(
              (view) => (
                <button
                  key={view}
                  onClick={() =>
                    setState((prev) => ({ ...prev, activeView: view }))
                  }
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                    state.activeView === view
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {view}
                </button>
              ),
            )}
          </div>

          {/* Quick Actions */}
          <motion.button
            onClick={() => exportVocabularyCSV()}
            disabled={
              state.vocabularyStats.totalPhrases === 0 || state.isExporting
            }
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export all vocabulary as CSV"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {state.isExporting ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </motion.button>

          <motion.button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                showSettings: !prev.showSettings,
              }))
            }
            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Alpha-1 Coordination Status */}
      {settings.coordinateWithAlpha1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>Coordinating with Alpha-1 description system</span>
            {activeDescriptionTab && (
              <span className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">
                Active: {activeDescriptionTab}
              </span>
            )}
            {onTabChange && (
              <button
                onClick={() => onTabChange("all")}
                className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-700"
              >
                Switch Tab
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {state.showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold">Manager Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Storage
                </h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={settings.autoSave}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoSave: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="autoSave"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Auto-save phrases
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sortIgnoreArticles"
                    checked={settings.sortIgnoreArticles}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        sortIgnoreArticles: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="sortIgnoreArticles"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Ignore articles in sorting
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Features
                </h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableTranslation"
                    checked={settings.enableTranslation}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        enableTranslation: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="enableTranslation"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Enable translations
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Density
                  </label>
                  <select
                    value={settings.displayDensity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        displayDensity: e.target.value as
                          | "compact"
                          | "comfortable"
                          | "spacious",
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Coordination
                </h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="coordinateWithAlpha1"
                    checked={settings.coordinateWithAlpha1}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        coordinateWithAlpha1: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="coordinateWithAlpha1"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Coordinate with Alpha-1
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="logToDelta4"
                    checked={settings.logToDelta4}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        logToDelta4: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="logToDelta4"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Log to Delta-4
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {categoryConfigs.map((config) => {
          const count = state.vocabularyStats.categoryCounts[config.name] || 0;
          const percentage =
            state.vocabularyStats.totalPhrases > 0
              ? Math.round((count / state.vocabularyStats.totalPhrases) * 100)
              : 0;

          return (
            <motion.div
              key={config.name}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  selectedCategory:
                    prev.selectedCategory === config.name ? "all" : config.name,
                  activeView: "builder",
                }))
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${config.color}`}
              >
                {count}
              </div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {config.displayName.split(" ")[0]}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {percentage}%
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="min-h-96">
        {state.activeView === "extractor" && (
          <GammaVocabularyExtractor
            selectedImage={selectedImage}
            descriptionText={descriptionText}
            style={style}
            onPhrasesUpdated={handlePhrasesUpdated}
            coordinateWithAlpha1={settings.coordinateWithAlpha1}
            activeDescriptionTab={activeDescriptionTab}
            allDescriptions={allDescriptions}
          />
        )}

        {state.activeView === "builder" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search phrases..."
                  value={state.searchTerm}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      searchTerm: e.target.value,
                    }))
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                />
              </div>

              <select
                value={state.selectedCategory}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    selectedCategory: e.target.value as PhraseCategory | "all",
                  }))
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                <option value="all">All Categories</option>
                {categoryConfigs.map((config) => (
                  <option key={config.name} value={config.name}>
                    {config.displayName}
                  </option>
                ))}
              </select>

              <select
                value={state.selectedDifficulty}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    selectedDifficulty: e.target.value as
                      | "all"
                      | "beginner"
                      | "intermediate"
                      | "advanced",
                  }))
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPhrases.size} of {filteredPhrases.length} phrases
                  selected
                </span>
                {selectedPhrases.size > 0 && (
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => {
                        const setName = prompt("Enter vocabulary set name:");
                        if (setName) createVocabularySet(setName);
                      }}
                      disabled={state.isCreatingSet}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="h-3 w-3" />
                      Create Set
                    </motion.button>

                    <motion.button
                      onClick={() => setSelectedPhrases(new Set())}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Clear
                    </motion.button>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredPhrases.length} phrases shown
              </div>
            </div>

            {/* Phrase List */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredPhrases.map((phrase) => {
                  const isSelected = selectedPhrases.has(phrase.id);

                  return (
                    <motion.div
                      key={phrase.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`border rounded-lg p-4 transition-all hover:shadow-sm cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                      } ${densityClasses[settings.displayDensity]}`}
                      onClick={() => {
                        setSelectedPhrases((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(phrase.id)) {
                            newSet.delete(phrase.id);
                          } else {
                            newSet.add(phrase.id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {phrase.phrase}
                            </h4>
                            {phrase.article && (
                              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                {phrase.article}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                            {phrase.definition}
                          </p>
                          {phrase.translation && settings.enableTranslation && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                              {phrase.translation}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(phrase.category)}`}
                          >
                            {phrase.category}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(phrase.difficulty)}`}
                          >
                            {phrase.difficulty}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredPhrases.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {state.vocabularyStats.totalPhrases === 0
                      ? "No vocabulary phrases yet. Use the Extractor to build your collection."
                      : "No phrases match your current filters."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {state.activeView === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Stats */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold">Total Vocabulary</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {state.vocabularyStats.totalPhrases}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Phrases across {vocabularySets.length} sets
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    {state.vocabularyStats.recentlyAdded.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Added in last 7 days
                  </div>
                </div>
              </div>

              {/* Study Progress */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <h3 className="text-lg font-semibold">Study Progress</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-purple-600">
                    {state.vocabularyStats.mostStudied.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Phrases with study data
                  </div>
                </div>
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Difficulty Distribution
              </h3>
              <div className="space-y-3">
                {(["beginner", "intermediate", "advanced"] as const).map(
                  (level) => {
                    const count =
                      state.vocabularyStats.difficultyDistribution[level] || 0;
                    const percentage =
                      state.vocabularyStats.totalPhrases > 0
                        ? (count / state.vocabularyStats.totalPhrases) * 100
                        : 0;

                    return (
                      <div
                        key={level}
                        className="flex items-center justify-between"
                      >
                        <span className="capitalize font-medium">{level}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getDifficultyColor(level).includes("green") ? "bg-green-500" : getDifficultyColor(level).includes("yellow") ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Recent Additions */}
            {state.vocabularyStats.recentlyAdded.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Recently Added Phrases
                </h3>
                <div className="space-y-2">
                  {state.vocabularyStats.recentlyAdded
                    .slice(0, 10)
                    .map((phrase) => (
                      <div
                        key={phrase.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div>
                          <span className="font-medium">{phrase.phrase}</span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            - {phrase.definition}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(phrase.category)}`}
                          >
                            {phrase.category}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {phrase.savedAt?.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {state.activeView === "sets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vocabulary Sets</h3>
              <motion.button
                onClick={() => {
                  const setName = prompt("Enter new vocabulary set name:");
                  if (setName)
                    createVocabularySet(setName, "Custom vocabulary set");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="h-4 w-4" />
                New Set
              </motion.button>
            </div>

            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {vocabularySets.map((set) => (
                  <motion.div
                    key={set.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {set.name}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {set.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{set.phrases.length} phrases</span>
                          <span>
                            Created {set.createdAt.toLocaleDateString()}
                          </span>
                          <span>
                            Modified {set.lastModified.toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <motion.button
                          onClick={() => exportVocabularyCSV(set.id)}
                          disabled={state.isExporting}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Export as CSV"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Download className="h-4 w-4" />
                        </motion.button>

                        <motion.button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              editingSetId:
                                prev.editingSetId === set.id ? null : set.id,
                            }))
                          }
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit set"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </motion.button>

                        <motion.button
                          onClick={() => deleteVocabularySet(set.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete set"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Set Stats */}
                    <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {set.studyStats.totalPhrases}
                        </div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {set.studyStats.masteredPhrases}
                        </div>
                        <div className="text-xs text-gray-500">Mastered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">
                          {set.studyStats.reviewsDue}
                        </div>
                        <div className="text-xs text-gray-500">Due</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">
                          {Math.round(set.studyStats.averageProgress * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">Progress</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {vocabularySets.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Vocabulary Sets
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create vocabulary sets to organize your Spanish phrases and
                    track your learning progress.
                  </p>
                  <motion.button
                    onClick={() => {
                      const setName = prompt("Enter vocabulary set name:");
                      if (setName)
                        createVocabularySet(setName, "Custom vocabulary set");
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="h-5 w-5" />
                    Create First Set
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GammaVocabularyManager;
