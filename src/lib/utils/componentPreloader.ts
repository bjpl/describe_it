/**
 * Component preloading utilities for improved performance
 * Implements intelligent preloading strategies based on user interaction patterns
 */

interface PreloadStrategy {
  name: string;
  components: string[];
  trigger: "hover" | "focus" | "immediate" | "intersection";
  delay?: number;
}

/**
 * Preload strategies for different user flows
 */
export const PreloadStrategies: Record<string, PreloadStrategy> = {
  // Preload learning components when user hovers over learning tabs
  learningFlow: {
    name: "Learning Components",
    components: ["PhrasesPanel", "QAPanel"],
    trigger: "hover",
    delay: 200,
  },

  // Preload image processing components on search interaction
  imageFlow: {
    name: "Image Processing",
    components: ["ImageSearch", "ImageViewer", "OptimizedImageGrid"],
    trigger: "focus",
    delay: 100,
  },

  // Preload performance tools for admin users
  performanceFlow: {
    name: "Performance Tools",
    components: ["PerformanceDashboard", "BundleAnalyzer"],
    trigger: "immediate",
  },
};

/**
 * Intelligent component preloader
 */
export class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  /**
   * Preload a component with caching
   */
  async preloadComponent(componentName: string): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    if (this.preloadPromises.has(componentName)) {
      return this.preloadPromises.get(componentName);
    }

    const preloadPromise = this.createPreloadPromise(componentName);
    this.preloadPromises.set(componentName, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedComponents.add(componentName);
    } catch (error) {
      logger.warn(`Failed to preload component ${componentName}:`, { error: error as Error, component: componentName });
      this.preloadPromises.delete(componentName);
    }
  }

  /**
   * Create preload promise based on component name
   */
  private createPreloadPromise(componentName: string): Promise<any> {
    switch (componentName) {
      case "PhrasesPanel":
        return import("../../components/EnhancedPhrasesPanel");
      case "QAPanel":
        return import("../../components/QAPanel");
      default:
        return Promise.reject(new Error(`Unknown component: ${componentName}`));
    }
  }

  /**
   * Preload multiple components
   */
  async preloadComponents(componentNames: string[]): Promise<void> {
    const promises = componentNames.map((name) => this.preloadComponent(name));
    await Promise.allSettled(promises);
  }

  /**
   * Execute a preload strategy
   */
  async executeStrategy(strategyName: string): Promise<void> {
    const strategy = PreloadStrategies[strategyName];
    if (!strategy) {
      logger.warn(`Unknown preload strategy: ${strategyName}`);
      return;
    }

    if (strategy.delay) {
      await new Promise((resolve) => setTimeout(resolve, strategy.delay));
    }

    await this.preloadComponents(strategy.components);
  }

  /**
   * Get preload statistics
   */
  getStats() {
    return {
      preloadedCount: this.preloadedComponents.size,
      pendingCount: this.preloadPromises.size,
      preloadedComponents: Array.from(this.preloadedComponents),
    };
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    this.preloadedComponents.clear();
    this.preloadPromises.clear();
  }
}

// Singleton instance
export const componentPreloader = new ComponentPreloader();

/**
 * React hook for component preloading
 */
export function useComponentPreloader() {
  return {
    preload: componentPreloader.preloadComponent.bind(componentPreloader),
    preloadMultiple:
      componentPreloader.preloadComponents.bind(componentPreloader),
    executeStrategy:
      componentPreloader.executeStrategy.bind(componentPreloader),
    getStats: componentPreloader.getStats.bind(componentPreloader),
  };
}

/**
 * HOC for automatic component preloading
 */
import React from "react";
import { logger } from '@/lib/logger';

export function withPreloader<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  strategy: string,
) {
  return function PreloaderWrapper(props: P) {
    // Preload on component mount
    React.useEffect(() => {
      componentPreloader.executeStrategy(strategy);
    }, []);

    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Preloader hook for tab interactions
 */
export function useTabPreloader(tabMappings: Record<string, string>) {
  const handleTabHover = React.useCallback(
    (tabName: string) => {
      const strategy = tabMappings[tabName];
      if (strategy) {
        componentPreloader.executeStrategy(strategy);
      }
    },
    [tabMappings],
  );

  return { handleTabHover };
}
