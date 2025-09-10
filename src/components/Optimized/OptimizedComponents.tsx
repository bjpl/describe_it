import React, { memo, useMemo, useCallback, forwardRef } from 'react';
import { UnsplashImage } from '@/types';
import { useLazyImage, usePerformanceCallback, useExpensiveMemo } from '@/hooks/usePerformanceOptimizations';

// Optimized Image Component with lazy loading and performance tracking
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

export const OptimizedImage = memo(forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ src, alt, className = '', width, height, priority = false, onLoad, onError, onClick }, ref) => {
    const { ref: lazyRef, loaded, error, inView } = useLazyImage(src);
    
    const handleLoad = usePerformanceCallback(() => {
      onLoad?.();
    }, [onLoad], 'OptimizedImage.onLoad');

    const handleError = usePerformanceCallback(() => {
      onError?.();
    }, [onError], 'OptimizedImage.onError');

    const handleClick = usePerformanceCallback(() => {
      onClick?.();
    }, [onClick], 'OptimizedImage.onClick');

    // Use the passed ref or the lazy loading ref
    const imageRef = useCallback((node: HTMLImageElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      if (lazyRef.current !== node) {
        (lazyRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
      }
    }, [ref, lazyRef]);

    // Show placeholder while loading
    if (!priority && !inView) {
      return (
        <div
          ref={imageRef}
          className={`bg-gray-200 animate-pulse ${className}`}
          style={{ width, height }}
        />
      );
    }

    if (error) {
      return (
        <div
          className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}
          style={{ width, height }}
        >
          <span className="text-sm">Failed to load</span>
        </div>
      );
    }

    return (
      <img
        ref={imageRef}
        src={loaded || priority ? src : undefined}
        alt={alt}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleClick}
      />
    );
  }
));

OptimizedImage.displayName = 'OptimizedImage';

// Optimized List Component with virtual scrolling support
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  itemHeight?: number;
  maxHeight?: number;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export const OptimizedList = memo(<T,>({ 
  items, 
  renderItem, 
  keyExtractor, 
  className = '', 
  itemHeight,
  maxHeight,
  loading = false,
  emptyState
}: OptimizedListProps<T>) => {
  const memoizedItems = useExpensiveMemo(
    () => items.map((item, index) => ({
      key: keyExtractor(item, index),
      item,
      index,
      rendered: renderItem(item, index)
    })),
    [items, renderItem, keyExtractor],
    'OptimizedList.items'
  );

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  // Use virtual scrolling for large lists
  if (itemHeight && maxHeight && items.length > 20) {
    return (
      <div 
        className={`overflow-auto ${className}`}
        style={{ maxHeight }}
      >
        <div style={{ height: items.length * itemHeight, position: 'relative' }}>
          {memoizedItems.map(({ key, rendered }, index) => (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: index * itemHeight,
                width: '100%',
                height: itemHeight
              }}
            >
              {rendered}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {memoizedItems.map(({ key, rendered }) => (
        <div key={key}>{rendered}</div>
      ))}
    </div>
  );
}) as <T>(props: OptimizedListProps<T>) => JSX.Element;

OptimizedList.displayName = 'OptimizedList';

// Optimized Search Input with debouncing
interface OptimizedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  onClear?: () => void;
}

export const OptimizedSearchInput = memo<OptimizedSearchInputProps>(({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  debounceMs = 300,
  onClear
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = usePerformanceCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  }, [onChange, debounceMs], 'OptimizedSearchInput.onChange');

  const handleClear = usePerformanceCallback(() => {
    setLocalValue('');
    onChange('');
    onClear?.();
  }, [onChange, onClear], 'OptimizedSearchInput.onClear');

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
    </div>
  );
});

OptimizedSearchInput.displayName = 'OptimizedSearchInput';

// Optimized Modal with proper focus management and performance
interface OptimizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlay?: boolean;
}

export const OptimizedModal = memo<OptimizedModalProps>(({
  isOpen,
  onClose,
  children,
  className = '',
  overlay = true
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const handleEscape = usePerformanceCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose], 'OptimizedModal.handleEscape');

  const handleOverlayClick = usePerformanceCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose], 'OptimizedModal.handleOverlayClick');

  React.useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus modal
      modalRef.current?.focus();
      
      // Add escape listener
      document.addEventListener('keydown', handleEscape);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      
      // Remove escape listener
      document.removeEventListener('keydown', handleEscape);
      
      // Restore body scroll
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlay ? 'bg-black bg-opacity-50' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 ${className}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
});

OptimizedModal.displayName = 'OptimizedModal';

// Optimized Button with proper event handling
interface OptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const OptimizedButton = memo<OptimizedButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = usePerformanceCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  }, [onClick, loading, disabled], 'OptimizedButton.onClick');

  const buttonClasses = useMemo(() => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    
    const disabledClasses = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : '';
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;
  }, [variant, size, disabled, loading, className]);

  return (
    <button
      {...props}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
});

OptimizedButton.displayName = 'OptimizedButton';