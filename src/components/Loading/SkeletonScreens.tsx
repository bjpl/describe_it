"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

// Base skeleton component
export const Skeleton = memo<SkeletonProps>(
  ({ className = "", width, height, rounded = false, animate = true }) => {
    const baseClasses = `
    bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 
    dark:from-gray-700 dark:via-gray-600 dark:to-gray-700
    ${rounded ? "rounded-full" : "rounded"}
    ${animate ? "animate-pulse" : ""}
  `.trim();

    const style = {
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    };

    return <div className={`${baseClasses} ${className}`} style={style} />;
  },
);

Skeleton.displayName = "Skeleton";

// Image skeleton with shimmer effect
export const ImageSkeleton = memo<{
  className?: string;
  aspectRatio?: "square" | "video" | "portrait" | "wide";
  showShimmer?: boolean;
}>(({ className = "", aspectRatio = "square", showShimmer = true }) => {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    wide: "aspect-[21/9]",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${aspectClasses[aspectRatio]} ${className}`}
    >
      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
      {showShimmer && (
        <MotionDiv
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          animate={{
            translateX: ["100%", "400%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
});

ImageSkeleton.displayName = "ImageSkeleton";

// Text skeleton with multiple lines
export const TextSkeleton = memo<{
  lines?: number;
  className?: string;
  lineHeight?: string;
  lastLineWidth?: string;
}>(
  ({
    lines = 3,
    className = "",
    lineHeight = "h-4",
    lastLineWidth = "75%",
  }) => {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={lineHeight}
            width={index === lines - 1 ? lastLineWidth : "100%"}
          />
        ))}
      </div>
    );
  },
);

TextSkeleton.displayName = "TextSkeleton";

// Card skeleton for image cards
export const ImageCardSkeleton = memo<{
  className?: string;
  showUser?: boolean;
  showStats?: boolean;
}>(({ className = "", showUser = true, showStats = true }) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      {/* Image */}
      <ImageSkeleton aspectRatio="square" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <TextSkeleton lines={2} lastLineWidth="60%" />

        {showStats && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="w-4 h-4" rounded />
              <Skeleton className="w-8 h-3" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="w-4 h-4" rounded />
              <Skeleton className="w-12 h-3" />
            </div>
          </div>
        )}

        {showUser && (
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8" rounded />
            <Skeleton className="w-20 h-4" />
          </div>
        )}
      </div>
    </div>
  );
});

ImageCardSkeleton.displayName = "ImageCardSkeleton";

// Grid skeleton for image grids
export const ImageGridSkeleton = memo<{
  count?: number;
  columns?: number;
  className?: string;
}>(({ count = 8, columns = 4, className = "" }) => {
  const gridClasses = `
    grid gap-4
    ${columns === 1 ? "grid-cols-1" : ""}
    ${columns === 2 ? "grid-cols-1 sm:grid-cols-2" : ""}
    ${columns === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : ""}
    ${columns === 4 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : ""}
    ${className}
  `.trim();

  return (
    <div className={gridClasses}>
      {Array.from({ length: count }).map((_, index) => (
        <ImageCardSkeleton key={index} />
      ))}
    </div>
  );
});

ImageGridSkeleton.displayName = "ImageGridSkeleton";

// Search results skeleton
export const SearchResultsSkeleton = memo(() => {
  return (
    <div className="space-y-6">
      {/* Search stats skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-48 h-5" />
        <Skeleton className="w-24 h-8 rounded-full" />
      </div>

      {/* Results grid */}
      <ImageGridSkeleton count={12} columns={4} />

      {/* Pagination skeleton */}
      <div className="flex items-center justify-center space-x-2">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
        <span className="text-gray-400">...</span>
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  );
});

SearchResultsSkeleton.displayName = "SearchResultsSkeleton";

// Content skeleton for description tabs
export const DescriptionSkeleton = memo(() => {
  return (
    <div className="space-y-6">
      {/* Language toggle skeleton */}
      <div className="flex items-center space-x-4">
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>

      {/* Description content */}
      <div className="space-y-4">
        <TextSkeleton lines={4} />
        <TextSkeleton lines={3} lastLineWidth="85%" />
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3">
        <Skeleton className="w-24 h-10 rounded-lg" />
        <Skeleton className="w-28 h-10 rounded-lg" />
      </div>
    </div>
  );
});

DescriptionSkeleton.displayName = "DescriptionSkeleton";

// QA skeleton for question/answer panels
export const QASkeleton = memo(() => {
  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <TextSkeleton lines={2} />
        </div>
      </div>

      {/* Answer options */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-3 border rounded-lg"
          >
            <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
            <Skeleton className="flex-1 h-4" />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-20 h-10 rounded-lg" />
        <div className="flex space-x-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="w-2 h-2 rounded-full" />
        </div>
        <Skeleton className="w-20 h-10 rounded-lg" />
      </div>
    </div>
  );
});

QASkeleton.displayName = "QASkeleton";

// Phrases skeleton for vocabulary panels
export const PhrasesSkeleton = memo(() => {
  return (
    <div className="space-y-4">
      {/* Header with extract button */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-28 h-10 rounded-lg" />
      </div>

      {/* Phrases list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="space-y-1 flex-1">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-40 h-3" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="w-8 h-8 rounded" />
              <Skeleton className="w-8 h-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

PhrasesSkeleton.displayName = "PhrasesSkeleton";

// Full page skeleton for initial loading
export const PageSkeleton = memo(() => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-32 h-8" />
            <Skeleton className="w-48 h-5" />
          </div>
          <div className="flex items-center space-x-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="w-10 h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search skeleton */}
            <div className="space-y-4">
              <Skeleton className="w-full h-14 rounded-xl" />
              <div className="flex items-center justify-between">
                <Skeleton className="w-20 h-8 rounded-lg" />
                <Skeleton className="w-32 h-5" />
              </div>
            </div>

            {/* Image viewer skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <ImageSkeleton aspectRatio="video" />
              <div className="mt-4 space-y-3">
                <TextSkeleton lines={2} />
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2">
            {/* Tabs skeleton */}
            <div className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="flex-1 h-10 rounded-md" />
              ))}
            </div>

            {/* Tab content skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <DescriptionSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PageSkeleton.displayName = "PageSkeleton";
