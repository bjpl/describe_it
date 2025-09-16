import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  AppState,
  Image,
  UserPreferences,
  SearchHistoryItem,
  DescriptionStyle,
} from "../../types";
import { createShallowSelector, OptimizedMap } from "../utils/storeUtils";

interface AppStore extends AppState {
  // App state actions
  setCurrentImage: (image: Image | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: AppState["activeTab"]) => void;
  toggleFullscreen: () => void;
  setFullscreen: (fullscreen: boolean) => void;

  // Preferences
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  // Search history
  searchHistory: SearchHistoryItem[];
  addToHistory: (item: Omit<SearchHistoryItem, "id">) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;

  // UI state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: "auto",
  language: "en",
  defaultDescriptionStyle: "conversacional" as DescriptionStyle,
  autoSaveDescriptions: true,
  maxHistoryItems: 50,
  exportFormat: "json",
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentImage: null,
        sidebarOpen: false,
        activeTab: "search",
        isFullscreen: false,
        preferences: defaultPreferences,
        searchHistory: [],
        isLoading: false,
        error: null,

        // App state actions
        setCurrentImage: (image) =>
          set({ currentImage: image }, false, "setCurrentImage"),

        toggleSidebar: () =>
          set(
            (state) => ({ sidebarOpen: !state.sidebarOpen }),
            false,
            "toggleSidebar",
          ),

        setSidebarOpen: (open) =>
          set({ sidebarOpen: open }, false, "setSidebarOpen"),

        setActiveTab: (tab) => set({ activeTab: tab }, false, "setActiveTab"),

        toggleFullscreen: () =>
          set(
            (state) => ({ isFullscreen: !state.isFullscreen }),
            false,
            "toggleFullscreen",
          ),

        setFullscreen: (fullscreen) =>
          set({ isFullscreen: fullscreen }, false, "setFullscreen"),

        // Preferences
        updatePreferences: (updates) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, ...updates },
            }),
            false,
            "updatePreferences",
          ),

        // Search history with optimized operations
        addToHistory: (item) =>
          set(
            (state) => {
              const newItem: SearchHistoryItem = {
                ...item,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              };

              // Use Map for O(1) duplicate detection and removal
              const historyMap = new OptimizedMap<string, SearchHistoryItem>();
              
              // Add new item first
              historyMap.set(newItem.query, newItem);
              
              // Add existing items, skipping duplicates
              for (const existingItem of state.searchHistory) {
                if (!historyMap.has(existingItem.query) && historyMap.size < state.preferences.maxHistoryItems) {
                  historyMap.set(existingItem.query, existingItem);
                }
              }

              return { searchHistory: historyMap.getValues() };
            },
            false,
            "addToHistory",
          ),

        clearHistory: () => set({ searchHistory: [] }, false, "clearHistory"),

        removeFromHistory: (id) =>
          set(
            (state) => ({
              searchHistory: state.searchHistory.filter(
                (item) => item.id !== id,
              ),
            }),
            false,
            "removeFromHistory",
          ),

        // UI state
        setLoading: (loading) =>
          set({ isLoading: loading }, false, "setLoading"),

        // Error handling
        setError: (error) => set({ error }, false, "setError"),

        clearError: () => set({ error: null }, false, "clearError"),
      }),
      {
        name: "describe-it-app-store",
        partialize: (state) => ({
          preferences: state.preferences,
          searchHistory: state.searchHistory,
          sidebarOpen: state.sidebarOpen,
          activeTab: state.activeTab,
        }),
      },
    ),
    { name: "AppStore" },
  ),
);

// Optimized selectors with shallow comparison to prevent unnecessary re-renders
const sidebarStateSelector = createShallowSelector((state: AppStore) => ({
  isOpen: state.sidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen,
}));

const activeTabSelector = createShallowSelector((state: AppStore) => ({
  activeTab: state.activeTab,
  setActiveTab: state.setActiveTab,
}));

const preferencesSelector = createShallowSelector((state: AppStore) => ({
  preferences: state.preferences,
  updatePreferences: state.updatePreferences,
}));

const searchHistorySelector = createShallowSelector((state: AppStore) => ({
  history: state.searchHistory,
  addToHistory: state.addToHistory,
  clearHistory: state.clearHistory,
  removeFromHistory: state.removeFromHistory,
}));

const appErrorSelector = createShallowSelector((state: AppStore) => ({
  error: state.error,
  setError: state.setError,
  clearError: state.clearError,
}));

// Selectors for optimized component updates
export const useCurrentImage = () => useAppStore((state) => state.currentImage);
export const useSidebarState = () => sidebarStateSelector(useAppStore);
export const useActiveTab = () => activeTabSelector(useAppStore);
export const usePreferences = () => preferencesSelector(useAppStore);
export const useSearchHistory = () => searchHistorySelector(useAppStore);
export const useAppError = () => appErrorSelector(useAppStore);
