/**
 * Deep linking utilities for shareable tab URLs
 */

import { logger } from '@/lib/logger';
import { DeepLinkConfig } from '../types';

/**
 * Generate a deep link URL for a specific tab
 */
export function generateDeepLink(
  config: DeepLinkConfig,
  tabKey: string,
  additionalParams?: Record<string, string>
): string {
  const tabConfig = config.tabs[tabKey];

  if (!tabConfig) {
    throw new Error(`Tab "${tabKey}" not found in deep link configuration`);
  }

  const url = new URL(tabConfig.path, config.baseUrl);

  // Add tab-specific query params
  if (tabConfig.queryParams) {
    Object.entries(tabConfig.queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  // Add additional params
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * Parse a deep link to extract tab and parameters
 */
export function parseDeepLink(
  url: string,
  config: DeepLinkConfig
): { tabKey: string | null; params: Record<string, string> } {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};

  // Extract all query parameters
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Try to match URL path to a tab
  let matchedTabKey: string | null = null;

  for (const [tabKey, tabConfig] of Object.entries(config.tabs)) {
    const tabPath = new URL(tabConfig.path, config.baseUrl).pathname;
    if (urlObj.pathname === tabPath) {
      matchedTabKey = tabKey;
      break;
    }
  }

  return { tabKey: matchedTabKey, params };
}

/**
 * Create a shareable link for the current tab state
 */
export function createShareableLink(
  currentPath: string,
  tabParam: string,
  tabValue: string,
  additionalParams?: Record<string, string>
): string {
  const url = new URL(currentPath, window.location.origin);
  url.searchParams.set(tabParam, tabValue);

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * Copy deep link to clipboard
 */
export async function copyDeepLinkToClipboard(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    logger.error('Failed to copy deep link:', error);
    return false;
  }
}

/**
 * Share deep link using Web Share API if available
 */
export async function shareDeepLink(
  link: string,
  title?: string,
  text?: string
): Promise<boolean> {
  if (!navigator.share) {
    return copyDeepLinkToClipboard(link);
  }

  try {
    await navigator.share({
      title,
      text,
      url: link,
    });
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      logger.error('Failed to share deep link:', error);
    }
    return false;
  }
}
