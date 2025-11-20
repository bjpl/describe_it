/**
 * Route builder utilities for constructing tab routes
 */

/**
 * Build a route with tab parameter
 */
export function buildTabRoute(
  pathname: string,
  tabValue: string,
  paramName: string = 'tab',
  additionalParams?: Record<string, string>
): string {
  const params = new URLSearchParams();
  params.set(paramName, tabValue);

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  const queryString = params.toString();
  return `${pathname}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Extract tab value from pathname or search params
 */
export function extractTabFromRoute(
  pathname: string,
  searchParams: URLSearchParams,
  paramName: string = 'tab',
  pathPattern?: RegExp
): string | null {
  // First try query parameter
  const tabParam = searchParams.get(paramName);
  if (tabParam) return tabParam;

  // Try extracting from pathname if pattern provided
  if (pathPattern) {
    const match = pathname.match(pathPattern);
    return match?.[1] ?? null;
  }

  return null;
}

/**
 * Build a tab navigation history entry
 */
export interface HistoryEntry {
  pathname: string;
  search: string;
  hash?: string;
  state?: unknown;
}

export function buildHistoryEntry(
  currentPathname: string,
  tabValue: string,
  paramName: string = 'tab',
  preserveParams: boolean = true,
  currentSearch?: string
): HistoryEntry {
  const params = preserveParams && currentSearch
    ? new URLSearchParams(currentSearch)
    : new URLSearchParams();

  params.set(paramName, tabValue);

  return {
    pathname: currentPathname,
    search: `?${params.toString()}`,
  };
}

/**
 * Create a route matcher for tab-based routes
 */
export function createTabRouteMatcher(
  basePath: string,
  tabParam: string = 'tab'
): (pathname: string, searchParams: URLSearchParams) => string | null {
  return (pathname: string, searchParams: URLSearchParams) => {
    if (!pathname.startsWith(basePath)) return null;
    return searchParams.get(tabParam);
  };
}

/**
 * Normalize tab value for URL (lowercase, replace spaces with hyphens)
 */
export function normalizeTabValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Denormalize tab value from URL (reverse of normalize)
 */
export function denormalizeTabValue(value: string, originalValues: string[]): string {
  const normalized = normalizeTabValue(value);
  const match = originalValues.find(v => normalizeTabValue(v) === normalized);
  return match ?? value;
}
