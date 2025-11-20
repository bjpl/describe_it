/**
 * Main hook for URL-based tab routing
 */

'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TabRouteConfig, TabRouterState, NavigateOptions } from '../types';
import {
  mergeQueryParams,
  validateTabParam,
  buildTabRoute
} from '../utils';

/**
 * Hook for managing tab state with URL synchronization
 */
export function useTabRouter(
  config: TabRouteConfig = {}
): TabRouterState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    paramName = 'tab',
    defaultTab = '',
    replace = false,
    scroll = false,
    preserveParams = true,
  } = config;

  // Track previous tab for change detection
  const previousTabRef = useRef<string>(defaultTab);

  // Get current tab from URL or use default
  const activeTab = useMemo(() => {
    const urlTab = searchParams?.get(paramName);
    return urlTab ?? defaultTab;
  }, [searchParams, paramName, defaultTab]);

  // Update previous tab ref
  useEffect(() => {
    previousTabRef.current = activeTab;
  }, [activeTab]);

  /**
   * Navigate to a specific tab
   */
  const setTab = useCallback((tab: string) => {
    if (tab === activeTab) return;

    const currentParams = searchParams ?? new URLSearchParams();
    const newParams = mergeQueryParams(
      currentParams,
      { [paramName]: tab },
      preserveParams
    );

    const url = `${pathname}?${newParams.toString()}`;

    if (replace) {
      router.replace(url, { scroll });
    } else {
      router.push(url, { scroll });
    }
  }, [
    activeTab,
    searchParams,
    paramName,
    preserveParams,
    pathname,
    router,
    replace,
    scroll
  ]);

  /**
   * Check if a tab is currently active
   */
  const isActive = useCallback((tab: string) => {
    return activeTab === tab;
  }, [activeTab]);

  /**
   * Get the full URL for a specific tab
   */
  const getTabUrl = useCallback((tab: string) => {
    const currentParams = searchParams ?? new URLSearchParams();
    const newParams = mergeQueryParams(
      currentParams,
      { [paramName]: tab },
      preserveParams
    );

    return `${pathname}?${newParams.toString()}`;
  }, [searchParams, paramName, preserveParams, pathname]);

  /**
   * Navigate to a tab with additional options
   */
  const navigateToTab = useCallback((tab: string, options: NavigateOptions = {}) => {
    if (tab === activeTab && !options.queryParams) return;

    const currentParams = searchParams ?? new URLSearchParams();
    const newParams = mergeQueryParams(
      currentParams,
      {
        [paramName]: tab,
        ...options.queryParams
      },
      preserveParams
    );

    const url = `${pathname}?${newParams.toString()}`;
    const shouldReplace = options.replace ?? replace;
    const shouldScroll = options.scroll ?? scroll;

    if (shouldReplace) {
      router.replace(url, { scroll: shouldScroll });
    } else {
      router.push(url, { scroll: shouldScroll });
    }
  }, [
    activeTab,
    searchParams,
    paramName,
    preserveParams,
    pathname,
    router,
    replace,
    scroll
  ]);

  return {
    activeTab,
    setTab,
    isActive,
    getTabUrl,
    navigateToTab,
  };
}
