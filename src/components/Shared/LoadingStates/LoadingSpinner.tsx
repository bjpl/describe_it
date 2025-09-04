import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  message?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function LoadingSpinner({
  size = "md",
  className = "",
  message,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center space-y-2 ${className}`}
    >
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && (
        <p className="text-sm text-gray-600 text-center">{message}</p>
      )}
    </div>
  );
}

// LoadingOverlay component
interface LoadingOverlayProps {
  show?: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  show = true,
  message = "Loading...",
  className = "",
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
}

// PageLoader component
interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({
  message = "Loading page...",
  className = "",
}: PageLoaderProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <LoadingSpinner size="xl" message={message} />
    </div>
  );
}
