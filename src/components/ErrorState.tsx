"use client";

import React from "react";
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Home,
  Wifi,
  WifiOff,
} from "lucide-react";

export interface ErrorStateProps {
  /**
   * Error title
   */
  title?: string;
  /**
   * Error message
   */
  message?: string;
  /**
   * Error code to display
   */
  code?: string;
  /**
   * Retry handler
   */
  onRetry?: () => void;
  /**
   * Whether currently retrying
   */
  retrying?: boolean;
  /**
   * Go back handler
   */
  onGoBack?: () => void;
  /**
   * Go home handler
   */
  onGoHome?: () => void;
  /**
   * Show navigation buttons
   */
  showNavigation?: boolean;
  /**
   * Show retry button
   */
  showRetry?: boolean;
  /**
   * Whether to center the content
   */
  centered?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
  /**
   * Custom content to render
   */
  children?: React.ReactNode;
  /**
   * Size of the error state
   */
  size?: "sm" | "md" | "lg";
}

/**
 * Primary error state component with comprehensive error handling patterns.
 * Consolidates all error display functionality from multiple implementations.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  code,
  onRetry,
  retrying = false,
  onGoBack,
  onGoHome,
  showNavigation = false,
  showRetry = true,
  centered = true,
  className = "",
  size = "md",
  children,
}: ErrorStateProps) {
  const sizeClasses = {
    sm: {
      icon: "w-8 h-8",
      title: "text-lg",
      message: "text-sm",
      container: "p-4",
    },
    md: {
      icon: "w-12 h-12",
      title: "text-xl",
      message: "text-base",
      container: "p-6",
    },
    lg: {
      icon: "w-16 h-16",
      title: "text-2xl",
      message: "text-lg",
      container: "p-8",
    },
  };

  const {
    icon: iconSize,
    title: titleSize,
    message: messageSize,
    container: containerPadding,
  } = sizeClasses[size];

  const content = (
    <div
      className={`flex flex-col items-center text-center space-y-4 max-w-md w-full ${containerPadding} ${className}`}
    >
      {/* Custom children content */}
      {children}

      {/* Error Icon - only show if no children */}
      {!children && (
        <div className="flex justify-center">
          <div className="bg-red-100 rounded-full p-4">
            <AlertTriangle className={`${iconSize} text-red-600`} />
          </div>
        </div>
      )}

      {/* Error Title */}
      <h2 className={`font-semibold text-gray-900 ${titleSize}`}>{title}</h2>

      {/* Error Message */}
      <p className={`text-gray-600 ${messageSize} leading-relaxed`}>
        {message}
      </p>

      {/* Error Code */}
      {code && (
        <div className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">
          Error Code: {code}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="
              flex items-center justify-center gap-2 px-4 py-2 
              bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <RefreshCw
              className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`}
            />
            {retrying ? "Retrying..." : "Try Again"}
          </button>
        )}

        {showNavigation && onGoBack && (
          <button
            onClick={onGoBack}
            className="
              flex items-center justify-center gap-2 px-4 py-2 
              bg-gray-600 text-white rounded-lg hover:bg-gray-700 
              transition-colors
            "
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {showNavigation && onGoHome && (
          <button
            onClick={onGoHome}
            className="
              flex items-center justify-center gap-2 px-4 py-2 
              bg-gray-600 text-white rounded-lg hover:bg-gray-700 
              transition-colors
            "
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        )}
      </div>
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-64 w-full">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline error state for smaller spaces
 */
export function InlineErrorState({
  message = "Error occurred",
  onRetry,
  className = "",
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-red-600 ${className}`}>
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-blue-600 hover:text-blue-700 text-sm underline"
          aria-label="Retry"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Network-specific error state
 */
export function NetworkErrorState({
  onRetry,
  className = "",
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ErrorState
      title="Connection Problem"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      showRetry={!!onRetry}
      className={className}
    >
      <div className="flex justify-center mb-4">
        <div className="bg-orange-100 rounded-full p-4">
          <WifiOff className="w-12 h-12 text-orange-600" />
        </div>
      </div>
    </ErrorState>
  );
}

export default ErrorState;
