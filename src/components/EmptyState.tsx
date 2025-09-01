'use client';

import React from 'react';
import { 
  Search, 
  ImageIcon, 
  BookOpen, 
  Package, 
  FileText, 
  Users, 
  Calendar,
  Inbox,
  X
} from 'lucide-react';

interface ActionButton {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  /**
   * Type of empty state to display
   */
  type?: 'default' | 'search' | 'images' | 'vocabulary' | 'content' | 'users' | 'calendar' | 'inbox';
  /**
   * Custom title
   */
  title?: string;
  /**
   * Custom description
   */
  description?: string;
  /**
   * Primary action button
   */
  action?: ActionButton;
  /**
   * Secondary action button
   */
  secondaryAction?: ActionButton;
  /**
   * Custom icon component
   */
  icon?: React.ReactNode;
  /**
   * Size of the empty state
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to center the content
   */
  centered?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
}

const typeConfigs = {
  default: {
    title: 'Nothing here yet',
    description: 'Get started by adding some content.',
    icon: Package
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search criteria or browse our content.',
    icon: Search
  },
  images: {
    title: 'No images found',
    description: 'Upload or select images to get started.',
    icon: ImageIcon
  },
  vocabulary: {
    title: 'No vocabulary words',
    description: 'Start learning by adding words to your vocabulary.',
    icon: BookOpen
  },
  content: {
    title: 'No content available',
    description: 'Create your first piece of content to get started.',
    icon: FileText
  },
  users: {
    title: 'No users found',
    description: 'Invite users to join your workspace.',
    icon: Users
  },
  calendar: {
    title: 'No events scheduled',
    description: 'Create your first event to get started.',
    icon: Calendar
  },
  inbox: {
    title: 'Inbox empty',
    description: 'All caught up! No new messages.',
    icon: Inbox
  }
};

/**
 * Primary empty state component with comprehensive empty state patterns.
 * Consolidates all empty state functionality from multiple implementations.
 */
export function EmptyState({
  type = 'default',
  title,
  description,
  action,
  secondaryAction,
  icon,
  size = 'md',
  centered = true,
  className = ''
}: EmptyStateProps) {
  const config = typeConfigs[type];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const IconComponent = icon || React.createElement(config.icon);

  const sizeClasses = {
    sm: { icon: 'w-12 h-12', title: 'text-lg', description: 'text-sm', container: 'p-4' },
    md: { icon: 'w-16 h-16', title: 'text-xl', description: 'text-base', container: 'p-6' },
    lg: { icon: 'w-20 h-20', title: 'text-2xl', description: 'text-lg', container: 'p-8' }
  };

  const { icon: iconSize, title: titleSize, description: descriptionSize, container: containerPadding } = sizeClasses[size];

  const content = (
    <div className={`flex flex-col items-center text-center space-y-4 max-w-md w-full ${containerPadding} ${className}`}>
      {/* Icon */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-full p-6">
          {React.isValidElement(IconComponent) ? 
            React.cloneElement(IconComponent as React.ReactElement, { 
              className: `${iconSize} text-gray-400`
            } as any) :
            React.createElement(config.icon, { 
              className: `${iconSize} text-gray-400` 
            })
          }
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 ${titleSize}`}>
        {displayTitle}
      </h3>

      {/* Description */}
      <p className={`text-gray-600 ${descriptionSize} leading-relaxed`}>
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {action && (
            <button
              onClick={action.onClick}
              className="
                px-4 py-2 bg-blue-600 text-white rounded-lg 
                hover:bg-blue-700 transition-colors
                font-medium
              "
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="
                px-4 py-2 bg-gray-200 text-gray-700 rounded-lg 
                hover:bg-gray-300 transition-colors
                font-medium
              "
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
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
 * Inline empty state for smaller spaces
 */
export function InlineEmptyState({
  type = 'default',
  message,
  className = ''
}: {
  type?: EmptyStateProps['type'];
  message?: string;
  className?: string;
}) {
  const config = typeConfigs[type || 'default'];
  const displayMessage = message || config.title;
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
      <IconComponent className="w-4 h-4" />
      <span className="text-sm">{displayMessage}</span>
    </div>
  );
}

/**
 * Search-specific empty state with query display
 */
export function SearchEmptyState({
  query,
  onClearSearch,
  suggestions,
  className = ''
}: {
  query?: string;
  onClearSearch?: () => void;
  suggestions?: string[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center space-y-4 max-w-md w-full p-6 ${className}`}>
      {/* Search Icon */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-full p-6">
          <Search className="w-16 h-16 text-gray-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900">
        {query ? `No results for "${query}"` : 'No search results'}
      </h3>

      {/* Description */}
      <p className="text-base text-gray-600 leading-relaxed">
        {query 
          ? 'Try adjusting your search terms or browse our content.'
          : 'Enter a search term to find what you\'re looking for.'
        }
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {onClearSearch && query && (
          <button
            onClick={onClearSearch}
            className="
              flex items-center justify-center gap-2 px-4 py-2 
              bg-gray-200 text-gray-700 rounded-lg 
              hover:bg-gray-300 transition-colors
              font-medium
            "
          >
            <X className="w-4 h-4" />
            Clear Search
          </button>
        )}
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmptyState;