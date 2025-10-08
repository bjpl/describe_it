"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton, MotionInput } from "@/components/ui/MotionComponents";
import { Search, X, Filter } from "lucide-react";
import { useDebounce, useImageSearch } from "@/hooks";
import { ImageGrid } from "./ImageGrid";
import { PaginationControls } from "./PaginationControls";
import { LoadingSpinner } from "@/components/Loading/LoadingSpinner";
import { SearchFilters } from "./SearchFilters";
import { UnsplashImage } from "@/types";
import { logger } from '@/lib/logger';
import {
  performanceProfiler,
  useRenderCount,
  optimizeAnimations,
} from "@/lib/utils/performance-helpers";

interface ImageSearchProps {
  onImageSelect?: (image: UnsplashImage) => void;
  className?: string;
}

const ImageSearchBase: React.FC<ImageSearchProps> = ({
  onImageSelect,
  className = "",
}) => {
  // Performance monitoring
  const renderCount = useRenderCount("ImageSearch");

  React.useEffect(() => {
    performanceProfiler.startMark("ImageSearch-render");
    return () => {
      performanceProfiler.endMark("ImageSearch-render");
    };
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    orientation: "all" as "all" | "landscape" | "portrait" | "squarish",
    category: "all" as
      | "all"
      | "nature"
      | "people"
      | "technology"
      | "architecture",
    color: "all" as
      | "all"
      | "black_and_white"
      | "black"
      | "white"
      | "yellow"
      | "orange"
      | "red"
      | "purple"
      | "magenta"
      | "green"
      | "teal"
      | "blue",
  });

  const debouncedQuery = useDebounce(searchQuery, 500);
  const {
    images,
    loading,
    error,
    searchParams,
    totalPages,
    searchImages,
    loadMoreImages,
    setPage,
    clearResults,
  } = useImageSearch();

  // Trigger search when debounced query changes and apply filters
  React.useEffect(() => {
    logger.info("[ImageSearch] useEffect triggered", { debouncedQuery, filters });
    if (debouncedQuery.trim()) {
      logger.info("[ImageSearch] Calling searchImages", { query: debouncedQuery });
      searchImages(debouncedQuery, 1);
    } else {
      logger.info("[ImageSearch] No query, clearing results");
      clearResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters]); // searchImages and clearResults are stable but excluded to prevent potential loops

  // Memoize stable callbacks
  const handleImageClick = useCallback(
    (image: UnsplashImage) => {
      if (onImageSelect) {
        onImageSelect(image);
      }
    },
    [onImageSelect],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    clearResults();
  }, [clearResults]);

  const handleFiltersChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);
      // Re-search with new filters if we have a query
      if (debouncedQuery.trim()) {
        searchImages(debouncedQuery, 1);
      }
    },
    [debouncedQuery, searchImages],
  );

  const handleToggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  // Memoize animation variants
  const containerVariants = useMemo(
    () =>
      optimizeAnimations.createOptimizedVariants({
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            staggerChildren: 0.1,
          },
        },
      }),
    [],
  );

  const itemVariants = useMemo(
    () =>
      optimizeAnimations.createOptimizedVariants({
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }),
    [],
  );

  // Memoize expensive computations
  const hasResults = useMemo(() => images.length > 0, [images.length]);
  const hasQuery = useMemo(
    () => Boolean(searchParams.query),
    [searchParams.query],
  );
  const shouldShowPagination = useMemo(() => totalPages > 1, [totalPages]);
  const shouldShowLoadMore = useMemo(
    () => searchParams.page < totalPages,
    [searchParams.page, totalPages],
  );

  return (
    <MotionDiv
      className={`w-full max-w-6xl mx-auto space-y-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Search Header */}
      <MotionDiv className="space-y-4" variants={itemVariants}>
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for images (e.g., &apos;mountain sunset&apos;, &apos;city street&apos;, &apos;happy people&apos;)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              autoComplete="off"
            />
            <AnimatePresence>
              {searchQuery && (
                <MotionButton
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </MotionButton>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <MotionButton
            onClick={handleToggleFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </MotionButton>

          {searchParams.query && (
            <div className="text-sm text-gray-500">
              {images.length > 0 && (
                <span>
                  Showing {images.length} images for &ldquo;{searchParams.query}&rdquo;
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search Filters */}
        <AnimatePresence>
          {showFilters && (
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          )}
        </AnimatePresence>
      </MotionDiv>

      {/* Loading State */}
      <AnimatePresence>
        {loading.isLoading && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">
              {loading.message || "Searching images..."}
            </p>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
          >
            <p className="text-red-600 font-medium mb-2">Search Error</p>
            <p className="text-red-500">{error}</p>
            <MotionButton
              onClick={() => searchImages(searchParams.query)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </MotionButton>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Image Results */}
      {!loading.isLoading && !error && hasResults && (
        <MotionDiv variants={itemVariants} className="space-y-6">
          <ImageGrid
            images={images}
            onImageClick={handleImageClick}
            loading={loading.isLoading}
          />

          {/* Pagination */}
          {shouldShowPagination && (
            <PaginationControls
              currentPage={searchParams.page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={loading.isLoading}
            />
          )}
        </MotionDiv>
      )}

      {/* Empty State */}
      {!loading.isLoading && !error && hasQuery && !hasResults && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 space-y-4"
        >
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-gray-700">No images found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Try different keywords or check your spelling. Popular searches
            include nature, people, technology, and architecture.
          </p>
        </MotionDiv>
      )}

      {/* Initial State */}
      {!hasQuery && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 space-y-4"
        >
          <div className="text-6xl mb-6">📸</div>
          <h2 className="text-2xl font-bold text-gray-800">
            Discover Amazing Images
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Search through millions of high-quality photos to practice your
            language skills.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {["nature", "people", "city", "food", "animals", "travel"].map(
              (suggestion) => (
                <MotionButton
                  key={suggestion}
                  onClick={() => setSearchQuery(suggestion)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {suggestion}
                </MotionButton>
              ),
            )}
          </div>
        </MotionDiv>
      )}
    </MotionDiv>
  );
};

// Export memoized component with optimized comparison
export const ImageSearch = memo(ImageSearchBase, (prevProps, nextProps) => {
  return (
    prevProps.onImageSelect === nextProps.onImageSelect &&
    prevProps.className === nextProps.className
  );
});

ImageSearch.displayName = 'ImageSearch';
