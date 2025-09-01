'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  /**
   * Size of the loading indicator
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Whether to show as overlay (full screen/container)
   */
  overlay?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
  /**
   * Whether to center the content
   */
  centered?: boolean;
  /**
   * Show progress bar with percentage
   */
  progress?: number;
}

/**
 * Primary loading state component with comprehensive loading patterns.
 * Consolidates all loading spinner functionality from multiple implementations.
 */
export function LoadingState({
  size = 'md',
  message = 'Loading...',
  overlay = false,
  className = '',
  centered = true,
  progress
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const content = (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Spinner */}
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-blue-600`}
        aria-hidden="true"
      />
      
      {/* Message */}
      {message && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
          {message}
        </p>
      )}

      {/* Progress Bar */}
      {typeof progress === 'number' && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div 
        className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        {content}
      </div>
    );
  }

  if (centered) {
    return (
      <div 
        className="flex items-center justify-center min-h-32 w-full"
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        {content}
      </div>
    );
  }

  return (
    <div 
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {content}
    </div>
  );
}

/**
 * Inline loading state for smaller spaces
 */
export function InlineLoadingState({
  size = 'sm',
  message,
  className = ''
}: Pick<LoadingStateProps, 'size' | 'message' | 'className'>) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} role="status" aria-live="polite">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoadingState({
  size = 'sm',
  className = ''
}: Pick<LoadingStateProps, 'size' | 'className'>) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  return (
    <Loader2 
      className={`${sizeClasses[size]} animate-spin ${className}`}
      aria-hidden="true"
    />
  );
}

export default LoadingState;