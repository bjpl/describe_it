/**
 * Database-Integrated Vocabulary Manager Component
 * Uses real Supabase data with fallback to sample data
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Database,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { useVocabulary } from "@/hooks/useVocabulary";
import { VocabularyItem } from "@/types/database";
import { dbLogger } from '@/lib/logger';

interface VocabularyManagerProps {
  className?: string;
  showStats?: boolean;
  allowEdit?: boolean;
  compact?: boolean;
  onVocabularyUpdate?: (vocabulary: VocabularyItem[]) => void;
}

export const DatabaseVocabularyManager: React.FC<VocabularyManagerProps> = ({
  className = "",
  showStats = true,
  allowEdit = true,
  compact = false,
  onVocabularyUpdate,
}) => {
  const {
    items,
    stats,
    loading,
    error,
    connectionStatus,
    filters,
    setFilter,
    clearFilters,
    search,
    getUniqueCategories,
    getUniqueDifficulties,
    isConnected,
    hasFilters,
  } = useVocabulary({ autoLoad: true });

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time update effect
  useEffect(() => {
    if (isRealTimeEnabled) {
      realTimeIntervalRef.current = setInterval(() => {
        // Simulate real-time updates by refreshing data
        setLastUpdate(new Date());
      }, 5000); // Update every 5 seconds
    } else {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
        realTimeIntervalRef.current = null;
      }
    }

    return () => {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
    };
  }, [isRealTimeEnabled]);

  // Notify parent component when vocabulary changes
  useEffect(() => {
    if (items && onVocabularyUpdate) {
      onVocabularyUpdate(items);
    }
  }, [items, onVocabularyUpdate]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      search(query);
    } else {
      setFilter("search", "");
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return "bg-green-100 text-green-800 border-green-200";
    if (difficulty <= 6)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      greetings: "bg-blue-100 text-blue-800 border-blue-200",
      home: "bg-green-100 text-green-800 border-green-200",
      food_drink: "bg-orange-100 text-orange-800 border-orange-200",
      colors: "bg-purple-100 text-purple-800 border-purple-200",
      family: "bg-pink-100 text-pink-800 border-pink-200",
      emotions: "bg-indigo-100 text-indigo-800 border-indigo-200",
      weather: "bg-cyan-100 text-cyan-800 border-cyan-200",
      travel: "bg-teal-100 text-teal-800 border-teal-200",
      abstract: "bg-gray-100 text-gray-800 border-gray-200",
      academic: "bg-slate-100 text-slate-800 border-slate-200",
      business: "bg-amber-100 text-amber-800 border-amber-200",
      environment: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const toggleRealTimeUpdates = useCallback(() => {
    setIsRealTimeEnabled((prev) => !prev);
  }, []);

  const handleBulkAction = useCallback(
    (action: "study" | "export" | "delete") => {
      if (selectedItems.length === 0) return;

      switch (action) {
        case "study":
          // Implement study session with selected items
          dbLogger.info(
            "Starting study session with",
            selectedItems.length,
            "items",
          );
          break;
        case "export":
          // Implement export functionality for selected items
          dbLogger.info("Exporting", selectedItems.length, "items");
          break;
        case "delete":
          // Implement delete functionality for selected items
          if (confirm(`Delete ${selectedItems.length} selected items?`)) {
            dbLogger.info("Deleting", selectedItems.length, "items");
            setSelectedItems([]);
          }
          break;
      }
    },
    [selectedItems],
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status and Real-time Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">
                Connected to Database
              </span>
              <Database className="w-4 h-4 text-green-500" />
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400">
                Using Sample Data
              </span>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRealTimeUpdates}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isRealTimeEnabled
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isRealTimeEnabled
                    ? "bg-green-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              {isRealTimeEnabled ? "Real-time ON" : "Real-time OFF"}
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {showStats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-lg font-semibold">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Words
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-lg font-semibold">
                  {Object.keys(stats.byCategory).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Categories
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-lg font-semibold">
                  {stats.averageDifficulty}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Difficulty
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-lg font-semibold">
                  {stats.averageFrequency}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Frequency
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Vocabulary Library</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Clear Filters
              </button>
            )}
          </div>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Study Selected ({selectedItems.length})
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear
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
              placeholder="Search Spanish words or English translations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={filters.category || "all"}
              onChange={(e) => setFilter("category", e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {getUniqueCategories().map((category) => (
                <option key={category} value={category}>
                  {category
                    .replace("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>

            <select
              value={filters.difficulty || "all"}
              onChange={(e) => setFilter("difficulty", e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulty Levels</option>
              {getUniqueDifficulties().map((level) => (
                <option key={level} value={level.toString()}>
                  Level {level}{" "}
                  {level <= 3
                    ? "(Beginner)"
                    : level <= 6
                      ? "(Intermediate)"
                      : "(Advanced)"}
                </option>
              ))}
            </select>

            <select
              value={filters.partOfSpeech || "all"}
              onChange={(e) => setFilter("partOfSpeech", e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Parts of Speech</option>
              <option value="noun">Nouns</option>
              <option value="verb">Verbs</option>
              <option value="adjective">Adjectives</option>
              <option value="adverb">Adverbs</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vocabulary Items */}
      <div className="space-y-4">
        {loading && !items.length ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading vocabulary...
            </p>
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-all duration-200 ${
                selectedItems.includes(item.id)
                  ? "ring-2 ring-blue-500 ring-opacity-50"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Item Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleItemSelect(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">
                          {item.spanish_text}
                        </h3>
                        {item.frequency_score && item.frequency_score > 80 && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {item.english_translation}
                      </p>

                      {/* Context sentences */}
                      {item.context_sentence_spanish && (
                        <div className="text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="italic text-gray-700 dark:text-gray-300 mb-1">
                            &ldquo;{item.context_sentence_spanish}&rdquo;
                          </p>
                          {item.context_sentence_english && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              &ldquo;{item.context_sentence_english}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(item.difficulty_level)}`}
                        >
                          Level {item.difficulty_level}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                        >
                          {item.category.replace("_", " ")}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {item.part_of_speech}
                        </span>
                        {item.frequency_score && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Frequency: {item.frequency_score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {allowEdit && (
                  <div className="flex flex-col gap-2">
                    <button
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Add to Study List"
                    >
                      <Plus className="w-4 h-4" />
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
              No vocabulary found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {hasFilters
                ? "Try adjusting your filters or search terms"
                : "Start learning Spanish by exploring image descriptions"}
            </p>
            {!isConnected && (
              <p className="text-orange-600 dark:text-orange-400 text-sm mt-2">
                Database not connected - showing sample data
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseVocabularyManager;
