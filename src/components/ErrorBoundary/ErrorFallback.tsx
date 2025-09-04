"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface ErrorFallbackProps {
  error?: Error;
  errorType?: "network" | "server" | "timeout" | "validation" | "unknown";
  onRetry?: () => void;
  onReset?: () => void;
  retryCount?: number;
  maxRetries?: number;
  isRetrying?: boolean;
  title?: string;
  message?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ErrorFallback({
  error,
  errorType = "unknown",
  onRetry,
  onReset,
  retryCount = 0,
  maxRetries = 3,
  isRetrying = false,
  title,
  message,
  showDetails = false,
  compact = false,
}: ErrorFallbackProps) {
  const getErrorIcon = () => {
    switch (errorType) {
      case "network":
        return <WifiOff className="w-8 h-8 text-red-500" />;
      case "timeout":
        return <WifiOff className="w-8 h-8 text-orange-500" />;
      case "server":
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    if (title) return title;

    switch (errorType) {
      case "network":
        return "Connection Failed";
      case "timeout":
        return "Request Timed Out";
      case "server":
        return "Service Unavailable";
      case "validation":
        return "Invalid Input";
      default:
        return "Something went wrong";
    }
  };

  const getErrorMessage = () => {
    if (message) return message;

    switch (errorType) {
      case "network":
        return "Unable to connect to the server. Please check your internet connection and try again.";
      case "timeout":
        return "The request took too long to complete. This may be due to high server load or a slow connection.";
      case "server":
        return "The service is temporarily unavailable. Please try again in a few moments.";
      case "validation":
        return "The provided information is invalid. Please check your input and try again.";
      default:
        return (
          error?.message || "An unexpected error occurred. Please try again."
        );
    }
  };

  const canRetry =
    onRetry && errorType !== "validation" && retryCount < maxRetries;
  const showRetryInfo = retryCount > 0 && maxRetries > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex-shrink-0">
          {errorType === "network" ? (
            <WifiOff className="w-5 h-5 text-red-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{getErrorTitle()}</p>
          <p className="text-sm text-red-600 truncate">{getErrorMessage()}</p>
        </div>
        {canRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-shrink-0 px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              "Retry"
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-white border-2 border-dashed border-gray-200 rounded-lg">
      <div className="text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">{getErrorIcon()}</div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {getErrorTitle()}
        </h3>

        {/* Message */}
        <p className="text-gray-600 mb-6 max-w-md">{getErrorMessage()}</p>

        {/* Retry Information */}
        {showRetryInfo && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Attempt {retryCount} of {maxRetries} failed.
              {canRetry
                ? " Trying again..."
                : " Maximum retry attempts reached."}
            </p>
          </div>
        )}

        {/* Error Details */}
        {showDetails && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Show error details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 border rounded-md">
              <pre className="text-xs text-gray-700 overflow-auto">
                {error.stack || error.message}
              </pre>
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>

        {/* Network Status Hint */}
        {errorType === "network" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Wifi className="w-4 h-4" />
            <span>Check your internet connection</span>
          </div>
        )}
      </div>
    </div>
  );
}
