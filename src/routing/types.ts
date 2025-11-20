/**
 * Type definitions for URL-based routing system
 */

export interface TabRouteConfig {
  /** The query parameter name to use for tab state (default: 'tab') */
  paramName?: string;
  /** Default tab value when no URL param is present */
  defaultTab?: string;
  /** Whether to replace history instead of pushing (default: false) */
  replace?: boolean;
  /** Whether to scroll to top on tab change (default: false) */
  scroll?: boolean;
  /** Optional base path for the route */
  basePath?: string;
  /** Whether to preserve other query params (default: true) */
  preserveParams?: boolean;
}

export interface TabRouterState {
  /** Current active tab value */
  activeTab: string;
  /** Navigate to a specific tab */
  setTab: (tab: string) => void;
  /** Check if a tab is currently active */
  isActive: (tab: string) => boolean;
  /** Get the full URL for a specific tab */
  getTabUrl: (tab: string) => string;
  /** Navigate to a tab (programmatic) */
  navigateToTab: (tab: string, options?: NavigateOptions) => void;
}

export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** Scroll to top after navigation */
  scroll?: boolean;
  /** Additional query params to merge */
  queryParams?: Record<string, string>;
}

export interface RouteParams {
  /** Tab parameter value */
  tab?: string;
  /** Additional custom params */
  [key: string]: string | string[] | undefined;
}

export interface DeepLinkConfig {
  /** Base URL for deep links */
  baseUrl: string;
  /** Tab configuration */
  tabs: {
    [key: string]: {
      path: string;
      queryParams?: Record<string, string>;
    };
  };
}

export type TabChangeHandler = (tab: string, previousTab: string) => void;

export interface RoutedTabsProps {
  /** Available tab values */
  tabs: string[];
  /** Configuration for routing behavior */
  config?: TabRouteConfig;
  /** Callback when tab changes */
  onTabChange?: TabChangeHandler;
  /** Children render prop or React nodes */
  children?: React.ReactNode | ((state: TabRouterState) => React.ReactNode);
  /** CSS class name */
  className?: string;
}
