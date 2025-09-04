/**
 * Simple Vocabulary Manager Component - Gamma-3 Agent
 * Simplified version without external UI dependencies
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  BookOpen,
  Star,
  Trash2,
  Edit3,
  Volume2,
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
} from "lucide-react";

interface Phrase {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: string;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  word_type?: string;
  formality_level?: string;
  is_user_selected?: boolean;
  is_mastered?: boolean;
  study_count?: number;
  correct_count?: number;
  last_studied_at?: string;
  user_notes?: string;
}

interface VocabularyStats {
  total: number;
  selected: number;
  mastered: number;
  mastery_rate: number;
}

interface VocabularyManagerProps {
  className?: string;
  showStats?: boolean;
  allowEdit?: boolean;
  compact?: boolean;
  onVocabularyUpdate?: (vocabulary: any[]) => void;
}

// Mock data for now - would come from API/hooks in real implementation
const mockPhrases: Phrase[] = [
  {
    id: "1",
    spanish_text: "Buenos días",
    english_translation: "Good morning",
    category: "expression",
    difficulty_level: "beginner",
    context_sentence_spanish: "Buenos días, ¿cómo está usted?",
    context_sentence_english: "Good morning, how are you?",
    word_type: "greeting",
    formality_level: "formal",
    is_user_selected: true,
    is_mastered: false,
    study_count: 5,
    correct_count: 4,
    user_notes: "Common formal greeting",
  },
  {
    id: "2",
    spanish_text: "La casa",
    english_translation: "The house",
    category: "vocabulary",
    difficulty_level: "beginner",
    context_sentence_spanish: "La casa es muy grande.",
    context_sentence_english: "The house is very big.",
    word_type: "noun",
    formality_level: "neutral",
    is_user_selected: false,
    is_mastered: true,
    study_count: 3,
    correct_count: 3,
  },
];

const mockStats: VocabularyStats = {
  total: 15,
  selected: 8,
  mastered: 3,
  mastery_rate: 0.2,
};

export const SimpleVocabularyManager: React.FC<VocabularyManagerProps> = ({
  className = "",
  showStats = true,
  allowEdit = true,
  compact = false,
  onVocabularyUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [phrases] = useState<Phrase[]>(mockPhrases);
  const [stats] = useState<VocabularyStats>(mockStats);

  // Filter phrases based on current filters
  const filteredPhrases = useMemo(() => {
    return phrases.filter((phrase) => {
      const matchesSearch =
        searchQuery === "" ||
        phrase.spanish_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phrase.english_translation
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || phrase.category === selectedCategory;
      const matchesDifficulty =
        selectedDifficulty === "all" ||
        phrase.difficulty_level === selectedDifficulty;

      let matchesFilter = true;
      if (selectedFilter === "selected") {
        matchesFilter = phrase.is_user_selected === true;
      } else if (selectedFilter === "mastered") {
        matchesFilter = phrase.is_mastered === true;
      }

      return (
        matchesSearch && matchesCategory && matchesDifficulty && matchesFilter
      );
    });
  }, [
    phrases,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    selectedFilter,
  ]);

  // Notify parent component when vocabulary changes
  useEffect(() => {
    if (phrases && onVocabularyUpdate) {
      onVocabularyUpdate(phrases);
    }
  }, [phrases, onVocabularyUpdate]);

  const handlePhraseSelect = (phraseId: string) => {
    setSelectedPhrases((prev) =>
      prev.includes(phraseId)
        ? prev.filter((id) => id !== phraseId)
        : [...prev, phraseId],
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      vocabulary: "bg-blue-100 text-blue-800 border-blue-200",
      expression: "bg-purple-100 text-purple-800 border-purple-200",
      idiom: "bg-pink-100 text-pink-800 border-pink-200",
      phrase: "bg-indigo-100 text-indigo-800 border-indigo-200",
      grammar_pattern: "bg-orange-100 text-orange-800 border-orange-200",
      verb_conjugation: "bg-teal-100 text-teal-800 border-teal-200",
      cultural_reference: "bg-cyan-100 text-cyan-800 border-cyan-200",
    };
    return (
      colors[category as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      {showStats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-lg font-semibold">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Phrases
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-lg font-semibold">{stats.selected}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Selected
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-lg font-semibold">{stats.mastered}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mastered
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-lg font-semibold">
                  {Math.round(stats.mastery_rate * 100)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mastery Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Vocabulary Library</h3>
          </div>
          {selectedPhrases.length > 0 && (
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Select for Study
              </button>
              <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Deselect
              </button>
              <button className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Delete ({selectedPhrases.length})
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search phrases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="expression">Expression</option>
              <option value="phrase">Phrase</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Phrases</option>
              <option value="selected">Selected for Study</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Phrases List */}
      <div className="space-y-4">
        {filteredPhrases && filteredPhrases.length > 0 ? (
          filteredPhrases.map((phrase) => (
            <div
              key={phrase.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-all duration-200 ${
                selectedPhrases.includes(phrase.id)
                  ? "ring-2 ring-blue-500 ring-opacity-50"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Phrase Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPhrases.includes(phrase.id)}
                      onChange={() => handlePhraseSelect(phrase.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">
                          {phrase.spanish_text}
                        </h3>
                        {phrase.is_user_selected && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        {phrase.is_mastered && (
                          <CheckCircle className="w-4 h-4 text-green-500 fill-current" />
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {phrase.english_translation}
                      </p>

                      {/* Context sentences */}
                      {phrase.context_sentence_spanish && (
                        <div className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          <p className="italic text-gray-700 dark:text-gray-300">
                            {phrase.context_sentence_spanish}
                          </p>
                          {phrase.context_sentence_english && (
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              {phrase.context_sentence_english}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(phrase.difficulty_level)}`}
                        >
                          {phrase.difficulty_level}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(phrase.category)}`}
                        >
                          {phrase.category.replace("_", " ")}
                        </span>
                        {phrase.word_type && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {phrase.word_type}
                          </span>
                        )}
                      </div>

                      {/* Study Stats */}
                      {(phrase.study_count || 0) > 0 && (
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                          <span>Studied {phrase.study_count} times</span>
                          <span>
                            Accuracy:{" "}
                            {phrase.study_count! > 0
                              ? Math.round(
                                  ((phrase.correct_count || 0) /
                                    phrase.study_count!) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                          {phrase.last_studied_at && (
                            <span>
                              Last:{" "}
                              {new Date(
                                phrase.last_studied_at,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* User Notes */}
                      {phrase.user_notes && (
                        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-4 border-blue-300 mt-2">
                          <strong>Note:</strong> {phrase.user_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {allowEdit && (
                  <div className="flex flex-col gap-2">
                    <button
                      className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                        phrase.is_user_selected
                          ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                          : "border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {phrase.is_user_selected ? (
                        <>
                          <Star className="w-4 h-4 mr-1 inline fill-current" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-1 inline" />
                          Select
                        </>
                      )}
                    </button>

                    <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
              No phrases found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ||
              selectedCategory !== "all" ||
              selectedDifficulty !== "all"
                ? "Try adjusting your filters"
                : "Start extracting phrases from images to build your vocabulary"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleVocabularyManager;
