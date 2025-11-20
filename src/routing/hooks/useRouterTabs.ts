/**
 * Hook for integrating routing with existing Tabs component
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTabRouter } from './useTabRouter';
import { TabRouteConfig, TabChangeHandler } from '../types';

interface UseRouterTabsOptions extends TabRouteConfig {
  /** List of valid tab values */
  validTabs?: string[];
  /** Callback when tab changes */
  onTabChange?: TabChangeHandler;
}

/**
 * Hook that provides tab state synchronized with URL
 * Compatible with existing Tabs component props
 */
export function useRouterTabs(options: UseRouterTabsOptions = {}) {
  const { validTabs, onTabChange, ...routerConfig } = options;

  const tabRouter = useTabRouter(routerConfig);
  const [previousTab, setPreviousTab] = useState(tabRouter.activeTab);

  // Validate tab if validTabs provided
  const currentTab = validTabs
    ? (validTabs.includes(tabRouter.activeTab)
        ? tabRouter.activeTab
        : routerConfig.defaultTab ?? validTabs[0])
    : tabRouter.activeTab;

  // Handle tab change callback
  useEffect(() => {
    if (currentTab !== previousTab && onTabChange) {
      onTabChange(currentTab, previousTab);
      setPreviousTab(currentTab);
    }
  }, [currentTab, previousTab, onTabChange]);

  const handleValueChange = useCallback((value: string) => {
    tabRouter.setTab(value);
  }, [tabRouter]);

  return {
    // Props for Tabs component
    value: currentTab,
    onValueChange: handleValueChange,

    // Additional router utilities
    router: tabRouter,
  };
}
