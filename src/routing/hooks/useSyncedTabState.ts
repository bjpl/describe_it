/**
 * Hook for bi-directional sync between local state and URL
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useTabRouter } from './useTabRouter';
import { TabRouteConfig } from '../types';

interface UseSyncedTabStateOptions extends TabRouteConfig {
  /** Initial tab value (used only on mount) */
  initialTab?: string;
  /** Callback when tab changes from URL */
  onUrlChange?: (tab: string) => void;
  /** Whether to sync immediately on mount (default: true) */
  syncOnMount?: boolean;
}

/**
 * Hook that maintains both local state and URL state
 * Useful for components that need controlled tab state with URL sync
 */
export function useSyncedTabState(options: UseSyncedTabStateOptions = {}) {
  const {
    initialTab,
    onUrlChange,
    syncOnMount = true,
    ...routerConfig
  } = options;

  const tabRouter = useTabRouter(routerConfig);
  const [localTab, setLocalTab] = useState(() =>
    initialTab ?? tabRouter.activeTab
  );
  const isInitialMount = useRef(true);

  // Sync URL to local state
  useEffect(() => {
    if (isInitialMount.current && !syncOnMount) {
      isInitialMount.current = false;
      return;
    }

    if (tabRouter.activeTab !== localTab) {
      setLocalTab(tabRouter.activeTab);
      onUrlChange?.(tabRouter.activeTab);
    }

    isInitialMount.current = false;
  }, [tabRouter.activeTab, syncOnMount, onUrlChange, localTab]);

  // Handle local tab change (syncs to URL)
  const handleTabChange = useCallback((tab: string) => {
    setLocalTab(tab);
    tabRouter.setTab(tab);
  }, [tabRouter]);

  // Force sync local state to URL
  const syncToUrl = useCallback(() => {
    if (localTab !== tabRouter.activeTab) {
      tabRouter.setTab(localTab);
    }
  }, [localTab, tabRouter]);

  // Force sync URL to local state
  const syncFromUrl = useCallback(() => {
    if (tabRouter.activeTab !== localTab) {
      setLocalTab(tabRouter.activeTab);
    }
  }, [tabRouter.activeTab, localTab]);

  return {
    /** Current tab value (from local state) */
    tab: localTab,
    /** Update tab (syncs to URL) */
    setTab: handleTabChange,
    /** Check if tab is active */
    isActive: tabRouter.isActive,
    /** Get URL for a tab */
    getTabUrl: tabRouter.getTabUrl,
    /** Force sync local state to URL */
    syncToUrl,
    /** Force sync URL to local state */
    syncFromUrl,
    /** Whether local state matches URL */
    isSynced: localTab === tabRouter.activeTab,
  };
}
