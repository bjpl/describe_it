/**
 * Lazy Load Manager
 * Implements advanced lazy loading with intersection observer and priority loading
 */
import React, { 
  lazy, 
  Suspense, 
  useState, 
  useEffect, 
  useRef, 
  useCallback,
  ComponentType 
} from 'react';
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner';
import { isDevelopment } from '@/config/env';

interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  priority?: 'low' | 'normal' | 'high';
  preload?: boolean;
  fallback?: React.ComponentType;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface LazyComponentWrapperProps extends LazyLoadOptions {
  children: React.ReactNode;
  className?: string;
  minHeight?: string | number;
}

// Component registry for preloading
const componentRegistry = new Map<string, Promise<any>>();
const loadingStates = new Map<string, 'loading' | 'loaded' | 'error'>();

/**
 * Advanced lazy loading wrapper with intersection observer
 */
export const LazyLoadManager: React.FC<LazyComponentWrapperProps> = ({
  children,
  className,
  minHeight = '200px',
  threshold = 0.1,
  rootMargin = '50px',
  priority = 'normal',
  preload = false,
  fallback: CustomFallback,
  onLoad,
  onError,
}) => {
  const [isVisible, setIsVisible] = useState(preload);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create intersection observer
  useEffect(() => {
    if (isVisible || !elementRef.current) return;

    const options: IntersectionObserverInit = {
      threshold,
      rootMargin,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.disconnect();
          
          if (onLoad) {
            onLoad();
          }
          
          if (isDevelopment()) {
            console.log('LazyLoadManager: Component became visible', {
              priority,
              threshold,
              rootMargin,
            });
          }
        }
      });
    }, options);

    observerRef.current.observe(elementRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [isVisible, threshold, rootMargin, onLoad, priority]);

  // Handle loading state
  const handleLoad = useCallback(() => {
    setHasLoaded(true);
  }, []);

  const handleError = useCallback((error: Error) => {
    if (onError) {
      onError(error);
    }
    if (isDevelopment()) {
      console.error('LazyLoadManager: Component failed to load', error);
    }
  }, [onError]);

  const DefaultFallback = CustomFallback || (() => (
    <div 
      style={{ minHeight }}
      className={`flex items-center justify-center ${className || ''}`}
    >
      <LoadingSpinner 
        size="lg" 
        message={`Loading ${priority} priority content...`}
        type="default"
      />
    </div>
  ));

  return (
    <div ref={elementRef} className={className} style={{ minHeight }}>
      {isVisible ? (
        <Suspense fallback={<DefaultFallback />}>
          <div onLoad={handleLoad} onError={() => handleError(new Error('Failed to load'))}>
            {children}
          </div>
        </Suspense>
      ) : (
        <DefaultFallback />
      )}
    </div>
  );
};

/**
 * Create lazy component with advanced options
 */
export function createLazyComponent<P extends object>(
  importFunction: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
): ComponentType<P & { lazyLoadOptions?: LazyLoadOptions }> {
  const LazyComponent = lazy(importFunction);
  
  return (props: P & { lazyLoadOptions?: LazyLoadOptions }) => {
    const mergedOptions = { ...options, ...props.lazyLoadOptions };
    const { lazyLoadOptions, ...componentProps } = props;
    
    return (
      <LazyLoadManager {...mergedOptions}>
        <LazyComponent {...(componentProps as P)} />
      </LazyLoadManager>
    );
  };
}

/**
 * Preload components based on priority
 */
export class ComponentPreloader {
  private static instance: ComponentPreloader;
  private preloadQueue: Array<{ 
    id: string; 
    loader: () => Promise<any>; 
    priority: 'low' | 'normal' | 'high';
  }> = [];
  private isProcessing = false;

  static getInstance(): ComponentPreloader {
    if (!ComponentPreloader.instance) {
      ComponentPreloader.instance = new ComponentPreloader();
    }
    return ComponentPreloader.instance;
  }

  /**
   * Register component for preloading
   */
  registerComponent(
    id: string,
    loader: () => Promise<any>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): void {
    if (componentRegistry.has(id) || loadingStates.get(id) === 'loaded') {
      return;
    }

    this.preloadQueue.push({ id, loader, priority });
    this.sortQueue();
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Preload component immediately
   */
  async preloadComponent(id: string, loader: () => Promise<any>): Promise<void> {
    if (componentRegistry.has(id)) {
      return componentRegistry.get(id);
    }

    loadingStates.set(id, 'loading');
    
    try {
      const component = loader();
      componentRegistry.set(id, component);
      await component;
      loadingStates.set(id, 'loaded');
      
      if (isDevelopment()) {
        console.log(`ComponentPreloader: Successfully preloaded ${id}`);
      }
    } catch (error) {
      loadingStates.set(id, 'error');
      if (isDevelopment()) {
        console.error(`ComponentPreloader: Failed to preload ${id}`, error);
      }
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    this.preloadQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Process preload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const { id, loader } = this.preloadQueue.shift()!;
      
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        await new Promise<void>((resolve) => {
          (window as any).requestIdleCallback(async () => {
            await this.preloadComponent(id, loader);
            resolve();
          });
        });
      } else {
        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            await this.preloadComponent(id, loader);
            resolve();
          }, 0);
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get loading state of component
   */
  getLoadingState(id: string): 'loading' | 'loaded' | 'error' | 'unknown' {
    return loadingStates.get(id) || 'unknown';
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    componentRegistry.clear();
    loadingStates.clear();
    this.preloadQueue = [];
  }
}

// Export singleton instance
export const componentPreloader = ComponentPreloader.getInstance();

/**
 * Hook for component preloading
 */
export function useComponentPreloader() {
  const preloader = ComponentPreloader.getInstance();
  
  const preload = useCallback((
    id: string, 
    loader: () => Promise<any>, 
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) => {
    preloader.registerComponent(id, loader, priority);
  }, [preloader]);

  const preloadImmediate = useCallback((
    id: string,
    loader: () => Promise<any>
  ) => {
    return preloader.preloadComponent(id, loader);
  }, [preloader]);

  const getLoadingState = useCallback((id: string) => {
    return preloader.getLoadingState(id);
  }, [preloader]);

  return {
    preload,
    preloadImmediate,
    getLoadingState,
  };
}

export default LazyLoadManager;