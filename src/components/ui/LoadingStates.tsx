"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner, ContentSkeleton, CardSkeleton } from "../Loading/LoadingSpinner";
import { EnhancedSkeleton, TextSkeleton, ProfileSkeleton, CardSkeletonEnhanced, TableSkeleton } from "./Skeleton";

// Re-export all loading components
export { LoadingSpinner, ContentSkeleton, CardSkeleton };
export { EnhancedSkeleton, TextSkeleton, ProfileSkeleton, CardSkeletonEnhanced, TableSkeleton };

// Loading overlay for full page loading
export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  message?: string;
  spinner?: React.ComponentType<any>;
}

export function LoadingOverlay({
  isLoading,
  children,
  className,
  message = "Loading...",
  spinner: Spinner = LoadingSpinner,
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner message={message} />
          </div>
        </div>
      )}
    </div>
  );
}

// Page loader for full screen loading
export interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message = "Loading...", className }: PageLoaderProps) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center", className)}>
      <LoadingSpinner size="xl" message={message} />
    </div>
  );
}

// Button loading state
export interface ButtonLoaderProps {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  size?: "sm" | "md" | "lg";
}

export function ButtonLoader({
  loading = false,
  children,
  loadingText,
  size = "md",
}: ButtonLoaderProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (loading) {
    return (
      <>
        <svg
          className={cn("animate-spin mr-2", sizeClasses[size])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {loadingText || children}
      </>
    );
  }

  return <>{children}</>;
}

// Inline loader for small loading states
export interface InlineLoaderProps {
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function InlineLoader({ size = "sm", className }: InlineLoaderProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
  };

  return (
    <svg
      className={cn("animate-spin", sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default LoadingOverlay;
