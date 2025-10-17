'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
}

export interface SearchFilters {
  type?: 'descriptions' | 'vocabulary' | 'all';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search descriptions and vocabulary...",
  showFilters = true
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all'
  });

  // Debounced search with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() || Object.keys(filters).length > 1) {
        onSearch(query, filters);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, onSearch]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setFilters({ type: 'all' });
    onSearch('', { type: 'all' });
  }, [onSearch]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="relative">
        <div className="flex items-center gap-2 bg-white border-2 border-blue-200 rounded-lg shadow-sm hover:border-blue-400 focus-within:border-blue-500 transition-colors">
          <Search className="ml-4 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-2 py-3 outline-none text-gray-700"
            aria-label="Search input"
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`mr-2 p-2 rounded-lg transition-colors ${
                showFilterPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'
              }`}
              aria-label="Toggle filters"
            >
              <Filter size={20} />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && showFilterPanel && (
          <div className="absolute top-full mt-2 w-full bg-white border-2 border-blue-200 rounded-lg shadow-lg p-4 z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search In
                </label>
                <select
                  value={filters.type || 'all'}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="descriptions">Descriptions</option>
                  <option value="vocabulary">Vocabulary</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={filters.difficulty || 'all'}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  placeholder="e.g., grammar, idioms"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setFilters({ type: 'all' });
                setShowFilterPanel(false);
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(filters.difficulty || filters.category) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.difficulty && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              Difficulty: {filters.difficulty}
              <button
                onClick={() => handleFilterChange('difficulty', 'all')}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </span>
          )}
          {filters.category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              Category: {filters.category}
              <button
                onClick={() => handleFilterChange('category', 'all')}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Highlight matching text utility component
export function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
