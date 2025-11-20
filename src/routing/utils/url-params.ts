/**
 * URL parameter utilities for tab routing
 */

import { RouteParams } from '../types';

/**
 * Parse URL search params into a RouteParams object
 */
export function parseUrlParams(searchParams: URLSearchParams): RouteParams {
  const params: RouteParams = {};

  searchParams.forEach((value, key) => {
    const existing = params[key];

    if (existing === undefined) {
      params[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      params[key] = [existing, value];
    }
  });

  return params;
}

/**
 * Build URL search params from a RouteParams object
 */
export function buildUrlParams(params: RouteParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else {
      searchParams.set(key, value);
    }
  });

  return searchParams;
}

/**
 * Merge query parameters, preserving or replacing as specified
 */
export function mergeQueryParams(
  current: URLSearchParams,
  updates: Record<string, string | undefined>,
  preserve: boolean = true
): URLSearchParams {
  const params = preserve ? new URLSearchParams(current) : new URLSearchParams();

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  return params;
}

/**
 * Get a single query parameter value
 */
export function getQueryParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue?: string
): string | undefined {
  return searchParams.get(key) ?? defaultValue;
}

/**
 * Remove specific query parameters
 */
export function removeQueryParams(
  searchParams: URLSearchParams,
  keys: string[]
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  keys.forEach(key => params.delete(key));
  return params;
}

/**
 * Create a URL with updated query parameters
 */
export function createUrlWithParams(
  pathname: string,
  params: Record<string, string | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Validate tab parameter against allowed values
 */
export function validateTabParam(
  tab: string | null,
  allowedTabs: string[],
  defaultTab: string
): string {
  if (!tab) return defaultTab;
  return allowedTabs.includes(tab) ? tab : defaultTab;
}
