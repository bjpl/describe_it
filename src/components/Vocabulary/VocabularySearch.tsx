"use client";

import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Search, X, Filter, ChevronDown, Save, Clock } from "lucide-react";

export interface VocabularyWord {
  id: string;
  spanish: string;
  english: string;
  category: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "other";
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: Date;
  examples?: string[];
}

export interface SearchFilters {
  category?: string;
  partOfSpeech?: string;
  difficulty?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  timestamp: Date;
}

export interface VocabularySearchProps {
  words: VocabularyWord[];
  onSearch: (query: string, filters: SearchFilters) => void;
  onSelectWord?: (word: VocabularyWord) => void;
  placeholder?: string;
  minSearchLength?: number;
  debounceDelay?: number;
  showAdvanced?: boolean;
  savedSearches?: SavedSearch[];
  onSaveSearch?: (search: SavedSearch) => void;
  onLoadSearch?: (search: SavedSearch) => void;
}

export const VocabularySearch = memo<VocabularySearchProps>(function VocabularySearch({
  words,
  onSearch,
  onSelectWord,
  placeholder = "Search Spanish or English...",
  minSearchLength = 2,
  debounceDelay = 300,
  showAdvanced = false,
  savedSearches = [],
  onSaveSearch,
  onLoadSearch,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [searchCache, setSearchCache] = useState<Map<string, VocabularyWord[]>>(new Map());
  const [activeRequest, setActiveRequest] = useState<AbortController | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize text for accent-insensitive search
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }, []);

  // Filter and search words
  const searchResults = useMemo(() => {
    if (searchQuery.length < minSearchLength) {
      return [];
    }

    const cacheKey = `${searchQuery}-${JSON.stringify(filters)}`;
    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey)!;
    }

    const normalizedQuery = normalizeText(searchQuery);

    const results = words.filter(word => {
      // Text search (Spanish or English)
      const matchesText =
        normalizeText(word.spanish).includes(normalizedQuery) ||
        normalizeText(word.english).includes(normalizedQuery);

      if (!matchesText) return false;

      // Apply filters
      if (filters.category && word.category !== filters.category) return false;
      if (filters.partOfSpeech && word.partOfSpeech !== filters.partOfSpeech) return false;
      if (filters.difficulty && word.difficulty !== filters.difficulty) return false;
      if (filters.dateFrom && word.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && word.createdAt > filters.dateTo) return false;

      return true;
    });

    // Cache the results
    setSearchCache(prev => new Map(prev).set(cacheKey, results));

    return results;
  }, [searchQuery, filters, words, minSearchLength, normalizeText, searchCache]);

  // Highlight matching text
  const highlightMatch = useCallback((text: string, query: string): React.ReactElement => {
    if (!query) return <>{text}</>;

    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query);
    const index = normalizedText.indexOf(normalizedQuery);

    if (index === -1) return <>{text}</>;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-600">{match}</mark>
        {after}
      </>
    );
  }, [normalizeText]);

  // Debounced search
  const performSearch = useCallback(() => {
    if (activeRequest) {
      activeRequest.abort();
    }

    const controller = new AbortController();
    setActiveRequest(controller);

    onSearch(searchQuery, filters);

    setActiveRequest(null);
  }, [searchQuery, filters, onSearch, activeRequest]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.length >= minSearchLength) {
      debounceTimerRef.current = setTimeout(performSearch, debounceDelay);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, filters, minSearchLength, debounceDelay, performSearch]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowResults(true);
    setSelectedIndex(-1);
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchQuery("");
    setFilters({});
    setShowResults(false);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectWord(searchResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowResults(false);
        break;
    }
  }, [showResults, searchResults, selectedIndex]);

  // Handle word selection
  const handleSelectWord = useCallback((word: VocabularyWord) => {
    onSelectWord?.(word);
    setShowResults(false);
    setSearchQuery("");
  }, [onSelectWord]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  // Save current search
  const handleSaveSearch = useCallback(() => {
    if (!onSaveSearch || !searchQuery) return;

    const savedSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: searchQuery,
      query: searchQuery,
      filters,
      timestamp: new Date(),
    };

    onSaveSearch(savedSearch);
  }, [searchQuery, filters, onSaveSearch]);

  // Load saved search
  const handleLoadSearch = useCallback((search: SavedSearch) => {
    setSearchQuery(search.query);
    setFilters(search.filters);
    onLoadSearch?.(search);
  }, [onLoadSearch]);

  return (
    <div className="relative w-full">
      {/* Main Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"
          aria-hidden="true"
        />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
          aria-label="Search vocabulary"
          aria-autocomplete="list"
          aria-controls="search-results"
          role="combobox"
          aria-expanded={showResults && searchResults.length > 0}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Advanced Search Toggle */}
        {showAdvanced && (
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Toggle advanced search"
            aria-expanded={isAdvancedOpen}
          >
            <Filter className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Advanced Search Panel */}
      {isAdvancedOpen && (
        <div className="mt-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={filters.category || ""}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Categories</option>
                <option value="food">Food</option>
                <option value="travel">Travel</option>
                <option value="business">Business</option>
                <option value="culture">Culture</option>
              </select>
            </div>

            {/* Part of Speech Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Part of Speech</label>
              <select
                value={filters.partOfSpeech || ""}
                onChange={(e) => handleFilterChange("partOfSpeech", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Types</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select
                value={filters.difficulty || ""}
                onChange={(e) => handleFilterChange("difficulty", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Save Search */}
          {onSaveSearch && searchQuery && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleSaveSearch}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Save className="h-4 w-4" />
                Save Search
              </button>
            </div>
          )}

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Saved Searches</label>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map(search => (
                  <button
                    key={search.id}
                    onClick={() => handleLoadSearch(search)}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                  >
                    <Clock className="h-3 w-3" />
                    {search.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <div
          ref={resultsRef}
          id="search-results"
          className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
        >
          {searchResults.map((word, index) => (
            <button
              key={word.id}
              onClick={() => handleSelectWord(word)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? "bg-gray-100 dark:bg-gray-700" : ""
              } ${index > 0 ? "border-t border-gray-200 dark:border-gray-700" : ""}`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {highlightMatch(word.spanish, searchQuery)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {highlightMatch(word.english, searchQuery)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {word.category}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {word.partOfSpeech}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {/* Results Count */}
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {showResults && searchQuery.length >= minSearchLength && searchResults.length === 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
          No results found for &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
});

VocabularySearch.displayName = "VocabularySearch";
