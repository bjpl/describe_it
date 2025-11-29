"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton } from "@/components/ui/MotionComponents";
import {
  BookOpen,
  Plus,
  Download,
  Search,
  ChevronDown,
  Loader2,
  Target,
  BookMarked,
  Languages,
  Layers,
  Settings,
} from "lucide-react";
import { PhraseCategory } from "@/lib/services/phraseExtractor";
import { ExtractionSettings, ExtractionStatsData, ExtractorState } from "./types";

interface ExtractorControlsProps {
  state: ExtractorState;
  settings: ExtractionSettings;
  extractionStats: ExtractionStatsData;
  categoryConfigs: Array<{
    name: PhraseCategory;
    displayName: string;
    color: string;
  }>;
  totalPhrases: number;
  coordinateWithAlpha1: boolean;
  onExtract: () => void;
  onSettingsChange: (settings: ExtractionSettings) => void;
  onSettingsToggle: () => void;
  onSearchChange: (searchTerm: string) => void;
  onCategoryToggle: (category: PhraseCategory) => void;
  onAddSelected: () => void;
  onExportCSV: () => void;
}

export const ExtractorControls: React.FC<ExtractorControlsProps> = ({
  state,
  settings,
  extractionStats,
  categoryConfigs,
  totalPhrases,
  coordinateWithAlpha1,
  onExtract,
  onSettingsChange,
  onSettingsToggle,
  onSearchChange,
  onCategoryToggle,
  onAddSelected,
  onExportCSV,
}) => {
  return (
    <>
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
                onSettingsChange({
                  ...settings,
                  difficulty: e.target.value as
                    | "beginner"
                    | "intermediate"
                    | "advanced",
                })
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
                onSettingsChange({
                  ...settings,
                  maxPhrases: Number(e.target.value),
                })
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
            onClick={onExtract}
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
            onClick={onSettingsToggle}
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
                      onSettingsChange({
                        ...settings,
                        autoAddSmallExtractions: e.target.checked,
                      })
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
                      onSettingsChange({
                        ...settings,
                        showTranslations: e.target.checked,
                      })
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
                      onSettingsChange({
                        ...settings,
                        groupBySimilarity: e.target.checked,
                      })
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
              onChange={(e) => onSearchChange(e.target.value)}
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
                onClick={() => onCategoryToggle(config.name)}
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
                  onClick={onAddSelected}
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
              onClick={onExportCSV}
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
    </>
  );
};
