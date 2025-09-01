'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, ArrowLeft, ArrowRight, RefreshCw, Shuffle, History, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { getUsageStats, clearExpiredImages } from '@/lib/tracking/imageTracker';

interface ImageSearchControlsProps {
  searchQuery: string;
  loading: boolean;
  searchError: string | null;
  currentPage: number;
  totalPages: number;
  hasImages: boolean;
  showUsedImages?: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: (resetPage?: boolean) => void;
  onPageChange: (page: number) => void;
  onNewSearch: () => void;
  onAnotherImage: () => void;
  onToggleUsedImages?: () => void;
  onClearHistory?: () => void;
  className?: string;
}

export function ImageSearchControls({
  searchQuery,
  loading,
  searchError,
  currentPage,
  totalPages,
  hasImages,
  showUsedImages = false,
  onSearchQueryChange,
  onSearch,
  onPageChange,
  onNewSearch,
  onAnotherImage,
  onToggleUsedImages,
  onClearHistory,
  className = ''
}: ImageSearchControlsProps) {
  const [inputValue, setInputValue] = useState(searchQuery);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearchQueryChange(inputValue.trim());
      onSearch(true, inputValue.trim()); // Reset to page 1 on new search, pass query
    }
  }, [inputValue, onSearchQueryChange, onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleNewSearch = useCallback(() => {
    setInputValue('');
    onNewSearch();
  }, [onNewSearch]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;
  const hasSearchResults = hasImages && totalPages > 0;

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

  const [usageStats, setUsageStats] = useState({ totalUsed: 0, usedToday: 0, usedThisWeek: 0 });
  
  useEffect(() => {
    // Only get usage stats on client side
    if (typeof window !== 'undefined') {
      setUsageStats(getUsageStats());
    }
  }, [showUsedImages, hasImages]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Search for images (e.g., 'sunset', 'coffee', 'books')..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Images
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNewSearch}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Search
            </button>

            {hasSearchResults && (
              <button
                type="button"
                onClick={onAnotherImage}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium rounded-lg transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Another Image
              </button>
            )}
          </div>
        </form>

        {/* Image Usage Tracking Controls */}
        <div className="flex items-center justify-between text-sm mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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

        {/* Error Display */}
        {searchError && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {searchError}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {hasSearchResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {/* Page Info */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              {totalPages > 1 && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  ({totalPages * 10} images total)
                </span>
              )}
            </div>

            {/* Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={!canGoBack || loading}
                  className="flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Previous page"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={handleNextPage}
                  disabled={!canGoForward || loading}
                  className="flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Next page"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Page Navigation for larger result sets */}
          {totalPages > 3 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                  Jump to:
                </span>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = i < 3 ? i + 1 : totalPages - (4 - i);
                  const isCurrentPage = page === currentPage;
                  const shouldShow = totalPages <= 5 || 
                    (i < 2) || 
                    (i >= 3 && page > totalPages - 2);

                  if (!shouldShow) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      disabled={loading}
                      className={`px-2 py-1 text-xs rounded transition-colors focus:ring-1 focus:ring-blue-500 ${
                        isCurrentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}