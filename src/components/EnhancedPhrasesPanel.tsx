"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { logger } from "@/lib/logger";
import {
  BookOpen,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Save,
  Bookmark,
  BookmarkCheck,
  Languages,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { CategorizedPhrase, VocabularySet } from "@/types/api";
import {
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
  sortPhrasesByCategory,
  getDifficultyColor,
  getCategoryColor,
} from "@/lib/utils/phrase-helpers";

interface EnhancedPhrasesPanelProps {
  selectedImage: {
    id: string;
    urls: { regular: string; small: string };
    alt_description: string | null;
    user: { name: string };
  } | null;
  descriptionText: string | null;
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
}

type DifficultyLevel = "beginner" | "intermediate" | "advanced";
type CategoryFilter =
  | "all"
  | "sustantivos"
  | "verbos"
  | "adjetivos"
  | "adverbios"
  | "frasesClaves";

const categoryLabels = {
  sustantivos: "Sustantivos (Nouns)",
  verbos: "Verbos (Verbs)",
  adjetivos: "Adjetivos (Adjectives)",
  adverbios: "Adverbios (Adverbs)",
  frasesClaves: "Frases Clave (Key Phrases)",
};

const EnhancedPhrasesPanel = memo<EnhancedPhrasesPanelProps>(
  function EnhancedPhrasesPanel({ selectedImage, descriptionText, style }) {
    const [phrases, setPhrases] = useState<CategorizedPhrase[]>([]);
    const [categorizedPhrases, setCategorizedPhrases] = useState<
      Record<string, CategorizedPhrase[]>
    >({});
    const [savedPhrases, setSavedPhrases] = useState<CategorizedPhrase[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [difficulty, setDifficulty] =
      useState<DifficultyLevel>("intermediate");
    const [maxPhrases, setMaxPhrases] = useState(8);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
      new Set(["sustantivos", "verbos"]),
    );
    const [showTranslations, setShowTranslations] = useState(false);
    const [phraseTranslations, setPhraseTranslations] = useState<
      Record<string, string>
    >({});
    const [translatingBatch, setTranslatingBatch] = useState(false);

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
          body: safeStringify({
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

        const extractedPhrases: CategorizedPhrase[] = responseData;
        setPhrases(extractedPhrases);

        // Categorize and sort phrases
        const categorized = sortPhrasesByCategory(extractedPhrases);
        setCategorizedPhrases(categorized);
      } catch (err) {
        logger.error("Phrase extraction error", err as Error, {
          component: "enhanced-phrases-panel",
          imageId: selectedImage?.id,
        });
        setError(
          err instanceof Error ? err.message : "Failed to extract phrases",
        );
      } finally {
        setLoading(false);
      }
    }, [selectedImage, descriptionText, style, difficulty, maxPhrases]);

    // Auto-extract when dependencies change
    useEffect(() => {
      if (!selectedImage || !descriptionText) {
        setPhrases([]);
        setCategorizedPhrases({});
        setError(null);
        return;
      }

      const timer = setTimeout(() => {
        extractPhrases();
      }, 500);

      return () => clearTimeout(timer);
    }, [selectedImage, descriptionText, difficulty, style, extractPhrases]);

    // Event handlers
    const handleDifficultyChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) =>
        setDifficulty(e.target.value as DifficultyLevel),
      [],
    );

    const handleMaxPhrasesChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) =>
        setMaxPhrases(Number(e.target.value)),
      [],
    );

    // Toggle category expansion
    const toggleCategory = useCallback((category: string) => {
      setExpandedCategories((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(category)) {
          newSet.delete(category);
        } else {
          newSet.add(category);
        }
        return newSet;
      });
    }, []);

    // Save phrase to vocabulary
    const savePhrase = useCallback(async (phrase: CategorizedPhrase) => {
      try {
        const updatedPhrase = { ...phrase, saved: true };

        // Update local state
        setPhrases((prev) =>
          prev.map((p) => (p.id === phrase.id ? updatedPhrase : p)),
        );
        setCategorizedPhrases((prev) => {
          const updated = { ...prev };
          if (updated[phrase.category]) {
            updated[phrase.category] = updated[phrase.category].map((p) =>
              p.id === phrase.id ? updatedPhrase : p,
            );
          }
          return updated;
        });

        setSavedPhrases((prev) => [...prev, updatedPhrase]);

        // TODO: Persist to backend/localStorage
        logger.info("Phrase saved to vocabulary", {
          component: "enhanced-phrases-panel",
          phraseId: updatedPhrase.id,
        });
      } catch (error) {
        logger.error("Error saving phrase", error as Error, {
          component: "enhanced-phrases-panel",
        });
      }
    }, []);

    // Translate phrase
    const translatePhrase = useCallback(
      async (phrase: CategorizedPhrase) => {
        if (phraseTranslations[phrase.id]) {
          return; // Already translated
        }

        try {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: safeStringify({
              text: phrase.phrase,
              fromLanguage: "es",
              toLanguage: "en",
              context: `Spanish learning context: "${phrase.definition}". This is a ${phrase.partOfSpeech} in the category of ${phrase.category}.`,
            }),
          });

          if (!response.ok) {
            throw new Error("Translation request failed");
          }

          const result = await response.json();

          setPhraseTranslations((prev) => ({
            ...prev,
            [phrase.id]: result.translatedText,
          }));
        } catch (error) {
          logger.error("Error translating phrase", error as Error, {
            component: "enhanced-phrases-panel",
            phraseId: phrase.id,
          });
          // Fallback to a simple error message
          setPhraseTranslations((prev) => ({
            ...prev,
            [phrase.id]: `Translation unavailable for "${phrase.phrase}"`,
          }));
        }
      },
      [phraseTranslations],
    );

    // Batch translate all visible phrases
    const translateAllPhrases = useCallback(async () => {
      if (translatingBatch) return;

      // Get all visible phrases that aren't already translated
      const phrasesToTranslate = Object.values(filteredCategories)
        .flat()
        .filter((phrase) => !phraseTranslations[phrase.id])
        .slice(0, 20); // Limit to 20 phrases at once

      if (phrasesToTranslate.length === 0) return;

      setTranslatingBatch(true);

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: safeStringify({
            texts: phrasesToTranslate.map((phrase) => phrase.phrase),
            fromLanguage: "es",
            toLanguage: "en",
            context:
              "Spanish language learning phrases with educational context",
          }),
        });

        if (!response.ok) {
          throw new Error("Batch translation request failed");
        }

        const result = await response.json();

        if (result.translations) {
          const newTranslations: Record<string, string> = {};

          result.translations.forEach(
            (
              translation: {
                phrase: string;
                definition: string;
                category: string;
              },
              index: number,
            ) => {
              if (translation && phrasesToTranslate[index]) {
                newTranslations[phrasesToTranslate[index].id] =
                  translation.definition;
              }
            },
          );

          setPhraseTranslations((prev) => ({
            ...prev,
            ...newTranslations,
          }));
        }

        // Handle failed translations
        if (result.failed && result.failed.length > 0) {
          const failedTranslations: Record<string, string> = {};
          result.failed.forEach(
            (failedItem: { phrase: string; error: string }, index: number) => {
              if (phrasesToTranslate[index]) {
                failedTranslations[phrasesToTranslate[index].id] =
                  `Translation unavailable for "${failedItem.phrase}"`;
              }
            },
          );

          setPhraseTranslations((prev) => ({
            ...prev,
            ...failedTranslations,
          }));
        }
      } catch (error) {
        logger.error("Error batch translating phrases", error as Error, {
          component: "enhanced-phrases-panel",
        });
        // Set error messages for all phrases
        const errorTranslations: Record<string, string> = {};
        phrasesToTranslate.forEach((phrase) => {
          errorTranslations[phrase.id] =
            `Translation unavailable for "${phrase.phrase}"`;
        });

        setPhraseTranslations((prev) => ({
          ...prev,
          ...errorTranslations,
        }));
      } finally {
        setTranslatingBatch(false);
      }
    }, [
      categorizedPhrases,
      phraseTranslations,
      translatingBatch,
      categoryFilter,
      searchTerm,
    ]);

    // Filter phrases based on category and search
    const filteredCategories = useMemo(() => {
      if (categoryFilter === "all" && !searchTerm) {
        return categorizedPhrases;
      }

      const filtered: Record<string, CategorizedPhrase[]> = {};

      Object.entries(categorizedPhrases).forEach(([category, phrases]) => {
        if (categoryFilter !== "all" && category !== categoryFilter) {
          return;
        }

        let filteredPhrases = phrases;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredPhrases = phrases.filter(
            (phrase) =>
              phrase.phrase.toLowerCase().includes(term) ||
              phrase.definition.toLowerCase().includes(term),
          );
        }

        if (filteredPhrases.length > 0) {
          filtered[category] = filteredPhrases;
        }
      });

      return filtered;
    }, [categorizedPhrases, categoryFilter, searchTerm]);

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
          <h2 className="text-2xl font-bold">Enhanced Phrases & Vocabulary</h2>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Description Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Please generate a description first. The phrases will be
                  categorized by grammatical type.
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Enhanced Phrases & Vocabulary
            </h2>

            {/* Primary Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={difficulty}
                onChange={handleDifficultyChange}
                className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                value={maxPhrases}
                onChange={handleMaxPhrasesChange}
                className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value={5}>5 phrases</option>
                <option value={8}>8 phrases</option>
                <option value={12}>12 phrases</option>
                <option value={15}>15 phrases</option>
              </select>

              <button
                onClick={extractPhrases}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Extract
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          {phrases.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as CategoryFilter)
                  }
                  className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="sustantivos">Sustantivos</option>
                  <option value="verbos">Verbos</option>
                  <option value="adjetivos">Adjetivos</option>
                  <option value="adverbios">Adverbios</option>
                  <option value="frasesClaves">Frases Clave</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search phrases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Translation Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTranslations(!showTranslations)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    showTranslations
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Languages className="h-4 w-4" />
                  {showTranslations ? "Hide" : "Show"} Translations
                </button>

                {showTranslations && (
                  <button
                    onClick={translateAllPhrases}
                    disabled={translatingBatch}
                    className="px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${translatingBatch ? "animate-spin" : ""}`}
                    />
                    {translatingBatch ? "Translating..." : "Translate All"}
                  </button>
                )}
              </div>
            </div>
          )}
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
              <p className="text-blue-700 dark:text-blue-300">
                Extracting and categorizing phrases...
              </p>
            </div>
          </div>
        )}

        {/* Categorized Phrases Display */}
        {Object.keys(filteredCategories).length > 0 && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {phrases.length} phrases in{" "}
                {Object.keys(filteredCategories).length} categories
              </p>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>

            {Object.entries(filteredCategories).map(
              ([category, categoryPhrases]) => (
                <div
                  key={category}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${expandedCategories.has(category) ? "rotate-90" : ""}`}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {
                          categoryLabels[
                            category as keyof typeof categoryLabels
                          ]
                        }
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}
                      >
                        {categoryPhrases.length}
                      </span>
                    </div>
                  </button>

                  {/* Category Phrases */}
                  {expandedCategories.has(category) && (
                    <div className="p-4 space-y-3">
                      {categoryPhrases.map((phrase) => (
                        <div
                          key={phrase.id}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="space-y-3">
                            {/* Phrase Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {phrase.article && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                      {phrase.article}
                                    </span>
                                  )}
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    &ldquo;{phrase.phrase}&rdquo;
                                  </h4>
                                  {phrase.gender && (
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        phrase.gender === "masculino"
                                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                          : phrase.gender === "femenino"
                                            ? "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                      }`}
                                    >
                                      {phrase.gender}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {phrase.partOfSpeech}
                                  {phrase.conjugation &&
                                    ` • Infinitive: ${phrase.conjugation}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Translation Button */}
                                {showTranslations && (
                                  <button
                                    onClick={() => translatePhrase(phrase)}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="Translate phrase"
                                  >
                                    <Languages className="h-4 w-4" />
                                  </button>
                                )}

                                {/* Save Button */}
                                <button
                                  onClick={() => savePhrase(phrase)}
                                  disabled={phrase.saved}
                                  className={`p-1.5 transition-colors ${
                                    phrase.saved
                                      ? "text-green-500"
                                      : "text-gray-400 hover:text-green-500"
                                  }`}
                                  title={
                                    phrase.saved
                                      ? "Already saved"
                                      : "Save to vocabulary"
                                  }
                                >
                                  {phrase.saved ? (
                                    <BookmarkCheck className="h-4 w-4" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Definition */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                Definition:
                              </h5>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {phrase.definition}
                              </p>
                            </div>

                            {/* Translation */}
                            {showTranslations &&
                              phraseTranslations[phrase.id] && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
                                  <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    Translation:
                                  </h5>
                                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                                    {phraseTranslations[phrase.id]}
                                  </p>
                                </div>
                              )}

                            {/* Context Example */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                Context:
                              </h5>
                              <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                                &ldquo;{phrase.context}&rdquo;
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {/* Vocabulary Builder Actions */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Vocabulary Builder
              </h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Create Study Set
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Practice Flashcards
                </button>
                {showTranslations && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Languages className="h-4 w-4" />
                    <span>
                      {Object.keys(phraseTranslations).length} of{" "}
                      {phrases.length} phrases translated
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  {savedPhrases.length} phrases saved to vocabulary
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {phrases.length === 0 &&
          !loading &&
          !error &&
          selectedImage &&
          descriptionText && (
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
  },
);

EnhancedPhrasesPanel.displayName = "EnhancedPhrasesPanel";

export default EnhancedPhrasesPanel;
