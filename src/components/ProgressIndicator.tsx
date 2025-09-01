'use client';

import React from 'react';

export interface ProgressIndicatorProps {
  type?: 'spinner' | 'bar' | 'skeleton' | 'pulse';
  message?: string;
  progress?: number; // 0-100 for progress bar
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  type = 'spinner',
  message,
  progress = 0,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const renderSpinner = () => (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
  );

  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="flex space-x-4">
        <div className="rounded-full bg-gray-300 h-10 w-10"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      </div>
    </div>
  );

  const renderPulse = () => (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );

  const renderIndicator = () => {
    switch (type) {
      case 'bar':
        return renderProgressBar();
      case 'skeleton':
        return renderSkeleton();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderIndicator()}
      {message && (
        <p className="text-sm text-gray-600 text-center animate-pulse">
          {message}
        </p>
      )}
      {type === 'bar' && (
        <p className="text-xs text-gray-500">
          {Math.round(progress)}% complete
        </p>
      )}
    </div>
  );
};

// Specialized progress components for different operations
export const SearchProgressIndicator: React.FC<{ isSearching: boolean }> = ({ isSearching }) => {
  if (!isSearching) return null;
  
  return (
    <ProgressIndicator
      type="spinner"
      message="Searching images..."
      size="md"
      className="py-8"
    />
  );
};

export const DescriptionProgressIndicator: React.FC<{ isGenerating: boolean }> = ({ isGenerating }) => {
  if (!isGenerating) return null;
  
  return (
    <ProgressIndicator
      type="pulse"
      message="Generating description..."
      size="sm"
      className="py-4"
    />
  );
};

export const QAProgressIndicator: React.FC<{ isGenerating: boolean }> = ({ isGenerating }) => {
  if (!isGenerating) return null;
  
  return (
    <ProgressIndicator
      type="pulse"
      message="Creating questions and answers..."
      size="sm"
      className="py-4"
    />
  );
};

export const PhrasesProgressIndicator: React.FC<{ isExtracting: boolean }> = ({ isExtracting }) => {
  if (!isExtracting) return null;
  
  return (
    <ProgressIndicator
      type="pulse"
      message="Extracting key phrases..."
      size="sm"
      className="py-4"
    />
  );
};

export const ExportProgressIndicator: React.FC<{ 
  isExporting: boolean;
  progress?: number;
  currentStep?: string;
}> = ({ 
  isExporting, 
  progress = 0,
  currentStep = "Preparing export..."
}) => {
  if (!isExporting) return null;
  
  return (
    <ProgressIndicator
      type="bar"
      message={currentStep}
      progress={progress}
      size="md"
      className="py-6"
    />
  );
};

// Skeleton components for better loading UX
export const ImageGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="bg-gray-300 rounded-lg aspect-square"></div>
          <div className="mt-2 space-y-2">
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TextContentSkeleton: React.FC<{ lines?: number }> = ({ lines = 4 }) => {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
      ))}
    </div>
  );
};

export default ProgressIndicator;