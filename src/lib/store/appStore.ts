import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  AppState,
  Image,
  UserPreferences,
  SearchHistoryItem,
} from "../../types";

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
  defaultDescriptionStyle: "detailed",
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

        // Search history
        addToHistory: (item) =>
          set(
            (state) => {
              const newItem: SearchHistoryItem = {
                ...item,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              };

              // Remove duplicates and limit history size
              const filtered = state.searchHistory.filter(
                (historyItem) => historyItem.query !== item.query,
              );

              const newHistory = [newItem, ...filtered].slice(
                0,
                state.preferences.maxHistoryItems,
              );

              return { searchHistory: newHistory };
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

// Selectors for optimized component updates
export const useCurrentImage = () => useAppStore((state) => state.currentImage);
export const useSidebarState = () =>
  useAppStore((state) => ({
    isOpen: state.sidebarOpen,
    toggle: state.toggleSidebar,
    setOpen: state.setSidebarOpen,
  }));
export const useActiveTab = () =>
  useAppStore((state) => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
  }));
export const usePreferences = () =>
  useAppStore((state) => ({
    preferences: state.preferences,
    updatePreferences: state.updatePreferences,
  }));
export const useSearchHistory = () =>
  useAppStore((state) => ({
    history: state.searchHistory,
    addToHistory: state.addToHistory,
    clearHistory: state.clearHistory,
    removeFromHistory: state.removeFromHistory,
  }));
export const useAppError = () =>
  useAppStore((state) => ({
    error: state.error,
    setError: state.setError,
    clearError: state.clearError,
  }));
