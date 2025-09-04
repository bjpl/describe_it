"use client";

import React from "react";
import { Loader2, Search, MessageSquare, FileText, Globe } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  type?: "default" | "search" | "ai" | "description" | "qa" | "phrases";
  message?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  type = "default",
  message,
  progress,
  showProgress = false,
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const getIcon = () => {
    const iconClass = `${sizeClasses[size]} animate-spin`;

    switch (type) {
      case "search":
        return <Search className={iconClass} />;
      case "ai":
      case "description":
        return <FileText className={iconClass} />;
      case "qa":
        return <MessageSquare className={iconClass} />;
      case "phrases":
        return <Globe className={iconClass} />;
      default:
        return <Loader2 className={iconClass} />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case "search":
        return "Searching images...";
      case "ai":
      case "description":
        return "Generating description...";
      case "qa":
        return "Processing question...";
      case "phrases":
        return "Extracting phrases...";
      default:
        return "Loading...";
    }
  };

  const displayMessage = message || getDefaultMessage();

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      {/* Spinner Icon */}
      <div className="flex items-center justify-center">{getIcon()}</div>

      {/* Message */}
      {displayMessage && (
        <p
          className={`text-center text-gray-600 ${
            size === "sm"
              ? "text-sm"
              : size === "lg" || size === "xl"
                ? "text-lg"
                : "text-base"
          }`}
        >
          {displayMessage}
        </p>
      )}

      {/* Progress Bar */}
      {showProgress && typeof progress === "number" && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Processing</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* AI Processing Indicator */}
      {(type === "ai" ||
        type === "description" ||
        type === "qa" ||
        type === "phrases") && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
          <span>AI processing</span>
        </div>
      )}
    </div>
  );
}

// Skeleton loader component for content placeholders
export function ContentSkeleton({
  lines = 3,
  className = "",
  showAvatar = false,
}: {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {showAvatar && (
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-200 rounded ${
              i === lines - 1 ? "w-3/4" : "w-full"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}

// Card skeleton for image/content cards
export function CardSkeleton({
  showImage = true,
  className = "",
}: {
  showImage?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border rounded-lg overflow-hidden animate-pulse ${className}`}
    >
      {showImage && <div className="w-full h-48 bg-gray-200"></div>}
      <div className="p-4">
        <div className="h-6 bg-gray-200 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  );
}
