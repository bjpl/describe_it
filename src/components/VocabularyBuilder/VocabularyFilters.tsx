"use client";

import { memo, useCallback } from "react";
import { Search, Filter } from "lucide-react";
import { VocabularyFiltersProps } from "./types";

export const VocabularyFilters = memo<VocabularyFiltersProps>(function VocabularyFilters({
  vocabularySets,
  searchTerm,
  sortBy,
  sortOrder,
  onSearchChange,
  onSortChange,
}) {
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [newSortBy, newSortOrder] = e.target.value.split('-');
    onSortChange(newSortBy, newSortOrder);
  }, [onSortChange]);

  // Don't render if no sets exist
  if (vocabularySets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search vocabulary sets..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
        />
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={handleSortChange}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="created-desc">Newest First</option>
          <option value="created-asc">Oldest First</option>
          <option value="progress-desc">Highest Progress</option>
          <option value="progress-asc">Lowest Progress</option>
          <option value="size-desc">Largest Sets</option>
          <option value="size-asc">Smallest Sets</option>
        </select>
      </div>
    </div>
  );
});

VocabularyFilters.displayName = "VocabularyFilters";