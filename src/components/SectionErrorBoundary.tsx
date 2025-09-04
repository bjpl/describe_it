"use client";

import React, { ReactNode, memo, useMemo, useCallback } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  AlertCircle,
  RefreshCw,
  Image,
  MessageSquare,
  BookOpen,
} from "lucide-react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  sectionType:
    | "image-gallery"
    | "qa-panel"
    | "phrases-panel"
    | "descriptions"
    | "search"
    | "general";
  onRetry?: () => void;
  fallback?: ReactNode;
}

/**
 * Specialized error boundary for different application sections
 */
export const SectionErrorBoundary = memo<SectionErrorBoundaryProps>(
  function SectionErrorBoundary({
    children,
    sectionName,
    sectionType,
    onRetry,
    fallback,
  }) {
    const getSectionConfig = useCallback(() => {
      switch (sectionType) {
        case "image-gallery":
          return {
            icon: <Image className="h-8 w-8 text-blue-500" />,
            title: "Image Gallery Error",
            description:
              "The image gallery failed to load. This might be due to network issues or problems with the image service.",
            suggestions: [
              "Check your internet connection",
              "Try searching for different terms",
              "Refresh the page to reload images",
            ],
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            borderColor: "border-blue-200 dark:border-blue-800",
            textColor: "text-blue-700 dark:text-blue-300",
          };

        case "qa-panel":
          return {
            icon: <MessageSquare className="h-8 w-8 text-green-500" />,
            title: "Q&A Panel Error",
            description:
              "The question and answer panel encountered an error. This could be due to API issues or problems generating questions.",
            suggestions: [
              "Try selecting a different image",
              "Check if the API service is available",
              "Generate new questions for the current image",
            ],
            bgColor: "bg-green-50 dark:bg-green-900/20",
            borderColor: "border-green-200 dark:border-green-800",
            textColor: "text-green-700 dark:text-green-300",
          };

        case "phrases-panel":
          return {
            icon: <BookOpen className="h-8 w-8 text-purple-500" />,
            title: "Phrases Panel Error",
            description:
              "The phrases and vocabulary panel failed to load. This might be due to issues with the phrase extraction service.",
            suggestions: [
              "Try a different difficulty level",
              "Select a new image for phrase extraction",
              "Reduce the number of phrases requested",
            ],
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
            borderColor: "border-purple-200 dark:border-purple-800",
            textColor: "text-purple-700 dark:text-purple-300",
          };

        case "descriptions":
          return {
            icon: <MessageSquare className="h-8 w-8 text-yellow-500" />,
            title: "Descriptions Error",
            description:
              "Failed to generate or load image descriptions. This could be due to AI service issues.",
            suggestions: [
              "Try generating descriptions again",
              "Select a different image",
              "Check your internet connection",
            ],
            bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
            borderColor: "border-yellow-200 dark:border-yellow-800",
            textColor: "text-yellow-700 dark:text-yellow-300",
          };

        case "search":
          return {
            icon: <AlertCircle className="h-8 w-8 text-red-500" />,
            title: "Search Error",
            description:
              "The image search functionality encountered an error. This might be due to network issues or search service problems.",
            suggestions: [
              "Check your internet connection",
              "Try different search terms",
              "Wait a moment and try again",
            ],
            bgColor: "bg-red-50 dark:bg-red-900/20",
            borderColor: "border-red-200 dark:border-red-800",
            textColor: "text-red-700 dark:text-red-300",
          };

        default:
          return {
            icon: <AlertCircle className="h-8 w-8 text-gray-500" />,
            title: `${sectionName} Error`,
            description: "This section encountered an unexpected error.",
            suggestions: [
              "Try refreshing the page",
              "Check your internet connection",
              "Contact support if the issue persists",
            ],
            bgColor: "bg-gray-50 dark:bg-gray-900/20",
            borderColor: "border-gray-200 dark:border-gray-800",
            textColor: "text-gray-700 dark:text-gray-300",
          };
      }
    }, [sectionName, sectionType]);

    const config = useMemo(() => getSectionConfig(), [getSectionConfig]);

    const customFallback = useMemo(
      () =>
        fallback || (
          <div
            className={`
      w-full rounded-lg border p-6
      ${config.bgColor} ${config.borderColor}
    `}
          >
            <div className="text-center">
              {/* Icon */}
              <div className="mb-4 flex justify-center">{config.icon}</div>

              {/* Title */}
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {config.title}
              </h3>

              {/* Description */}
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {config.description}
              </p>

              {/* Suggestions */}
              <div className="mb-6 text-left max-w-sm mx-auto">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Try these solutions:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {config.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-500">
                        •
                      </span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Retry Button */}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`
              px-4 py-2 rounded-lg font-medium text-white
              bg-gray-600 hover:bg-gray-700 
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
              transition-colors duration-200
              flex items-center justify-center gap-2 mx-auto
            `}
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              )}
            </div>
          </div>
        ),
      [fallback, config, onRetry],
    );

    return (
      <ErrorBoundary
        fallback={customFallback}
        onError={(error, errorInfo) => {
          console.error(
            `Section Error in ${sectionName} (${sectionType}):`,
            error,
            errorInfo,
          );
        }}
      >
        {children}
      </ErrorBoundary>
    );
  },
);

/**
 * Pre-configured error boundaries for specific sections
 */
export const ImageGalleryErrorBoundary = ({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="Image Gallery"
    sectionType="image-gallery"
    onRetry={onRetry}
  >
    {children}
  </SectionErrorBoundary>
);

export const QAPanelErrorBoundary = ({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="Q&A Panel"
    sectionType="qa-panel"
    onRetry={onRetry}
  >
    {children}
  </SectionErrorBoundary>
);

export const PhrasesPanelErrorBoundary = ({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="Phrases Panel"
    sectionType="phrases-panel"
    onRetry={onRetry}
  >
    {children}
  </SectionErrorBoundary>
);

export const DescriptionsErrorBoundary = ({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="Descriptions"
    sectionType="descriptions"
    onRetry={onRetry}
  >
    {children}
  </SectionErrorBoundary>
);

export const SearchErrorBoundary = ({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="Search"
    sectionType="search"
    onRetry={onRetry}
  >
    {children}
  </SectionErrorBoundary>
);

export default SectionErrorBoundary;
