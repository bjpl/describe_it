'use client';

import { memo, useCallback } from 'react';
import { Search, History, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { getUsageStats, clearExpiredImages } from '@/lib/tracking/imageTracker';

interface SearchSectionProps {
  searchQuery: string;
  loading: boolean;
  searchError: string | null;
  showUsedImages?: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onToggleUsedImages?: () => void;
  onClearHistory?: () => void;
}

export const SearchSection = memo<SearchSectionProps>(function SearchSection({
  searchQuery,
  loading,
  searchError,
  showUsedImages = false,
  onSearchQueryChange,
  onSearch,
  onToggleUsedImages,
  onClearHistory
}) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  }, [onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(e.target.value);
  }, [onSearchQueryChange]);

  const handleToggleUsedImages = useCallback(() => {
    onToggleUsedImages?.();
  }, [onToggleUsedImages]);

  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear your image usage history? This cannot be undone.')) {
      onClearHistory?.();
    }
  }, [onClearHistory]);

  const handleClearExpired = useCallback(() => {
    const cleared = clearExpiredImages();
    if (cleared > 0) {
      alert(`Cleared ${cleared} expired entries from image history.`);
    } else {
      alert('No expired entries found.');
    }
  }, []);

  const usageStats = getUsageStats();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for images..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          aria-label="Search for images"
          autoComplete="off"
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Search for images"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Image tracking controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleUsedImages}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={showUsedImages ? 'Hide previously used images' : 'Show previously used images'}
          >
            {showUsedImages ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showUsedImages ? 'Hide Used' : 'Show Used'}
          </button>

          {usageStats.totalUsed > 0 && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <History className="h-4 w-4" />
              <span>{usageStats.totalUsed} used</span>
              {usageStats.usedToday > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                  {usageStats.usedToday} today
                </span>
              )}
            </div>
          )}
        </div>

        {usageStats.totalUsed > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearExpired}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
              title="Clear expired entries from history"
            >
              Clean expired
            </button>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
              title="Clear all image usage history"
            >
              <RotateCcw className="h-3 w-3" />
              Clear history
            </button>
          </div>
        )}
      </div>

      {searchError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {searchError}
        </div>
      )}
    </div>
  );
});

SearchSection.displayName = 'SearchSection';