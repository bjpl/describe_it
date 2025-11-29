"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton } from "@/components/ui/MotionComponents";
import { Plus, CheckCircle2 } from "lucide-react";
import { CategorizedPhrase } from "@/types/api";
import { PhraseCategory } from "@/lib/services/phraseExtractor";
import { getDifficultyColor } from "@/lib/utils/phrase-helpers";

interface CategoryDisplayProps {
  categoryConfigs: Array<{
    name: PhraseCategory;
    displayName: string;
    color: string;
  }>;
  filteredCategories: Record<PhraseCategory, CategorizedPhrase[]>;
  activeCategories: Set<PhraseCategory>;
  selectedPhrases: Set<string>;
  addedPhrases: Set<string>;
  onToggleSelection: (phraseId: string) => void;
  onAddPhrase: (phrase: CategorizedPhrase) => void;
}

export const CategoryDisplay: React.FC<CategoryDisplayProps> = ({
  categoryConfigs,
  filteredCategories,
  activeCategories,
  selectedPhrases,
  addedPhrases,
  onToggleSelection,
  onAddPhrase,
}) => {
  return (
    <div className="space-y-6">
      {categoryConfigs.map((config) => {
        const phrases = filteredCategories[config.name];
        if (!activeCategories.has(config.name) || phrases.length === 0)
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
                  const isSelected = selectedPhrases.has(phrase.id);
                  const isAdded = addedPhrases.has(phrase.id);

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
                                "{phrase.phrase}"
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
                              "{phrase.context}"
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
                              onChange={() => onToggleSelection(phrase.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />

                            {/* Quick add button */}
                            <MotionButton
                              data-phrase-id={phrase.id}
                              onClick={() => onAddPhrase(phrase)}
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
    </div>
  );
};
