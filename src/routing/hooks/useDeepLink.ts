/**
 * Hook for deep linking functionality
 */

'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  createShareableLink,
  copyDeepLinkToClipboard,
  shareDeepLink
} from '../utils/deep-linking';

interface UseDeepLinkOptions {
  /** Tab parameter name (default: 'tab') */
  tabParam?: string;
  /** Additional params to include in deep link */
  includeParams?: string[];
  /** Base URL for deep links (defaults to current origin) */
  baseUrl?: string;
}

/**
 * Hook for creating and sharing deep links to tabs
 */
export function useDeepLink(options: UseDeepLinkOptions = {}) {
  const {
    tabParam = 'tab',
    includeParams = [],
    baseUrl,
  } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Get current tab value
   */
  const currentTab = useMemo(() => {
    return searchParams?.get(tabParam) ?? '';
  }, [searchParams, tabParam]);

  /**
   * Generate deep link for a specific tab
   */
  const generateLink = useCallback((tab: string) => {
    const additionalParams: Record<string, string> = {};

    includeParams.forEach(param => {
      const value = searchParams?.get(param);
      if (value) {
        additionalParams[param] = value;
      }
    });

    const base = baseUrl ?? window.location.origin;
    const fullPath = `${base}${pathname}`;

    return createShareableLink(fullPath, tabParam, tab, additionalParams);
  }, [pathname, searchParams, tabParam, includeParams, baseUrl]);

  /**
   * Get deep link for current tab
   */
  const currentLink = useMemo(() => {
    return currentTab ? generateLink(currentTab) : '';
  }, [currentTab, generateLink]);

  /**
   * Copy deep link to clipboard
   */
  const copyLink = useCallback(async (tab?: string) => {
    const link = tab ? generateLink(tab) : currentLink;
    return copyDeepLinkToClipboard(link);
  }, [generateLink, currentLink]);

  /**
   * Share deep link using Web Share API
   */
  const share = useCallback(async (
    tab?: string,
    title?: string,
    text?: string
  ) => {
    const link = tab ? generateLink(tab) : currentLink;
    return shareDeepLink(link, title, text);
  }, [generateLink, currentLink]);

  return {
    /** Current tab value from URL */
    currentTab,
    /** Deep link for current tab */
    currentLink,
    /** Generate deep link for any tab */
    generateLink,
    /** Copy link to clipboard */
    copyLink,
    /** Share link via Web Share API */
    share,
  };
}
