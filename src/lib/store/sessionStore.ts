import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { UserSession, SearchHistoryItem, UserPreferences, DescriptionStyle } from "../../types";
import { createShallowSelector } from "../utils/storeUtils";

interface SessionStore {
  session: UserSession | null;
  isInitialized: boolean;

  // Session management
  initializeSession: (userId?: string) => void;
  updateLastActivity: () => void;
  endSession: () => void;

  // Authentication
  setAuthenticated: (authenticated: boolean, userId?: string) => void;

  // Activity tracking
  trackSearch: (query: string, resultCount: number) => void;

  // Session data
  getSessionDuration: () => number;
  getActivitySummary: () => {
    totalSearches: number;
    uniqueQueries: number;
    sessionDuration: number;
    lastActivity: Date;
  };
}

const createInitialSession = (userId?: string): UserSession => ({
  id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  userId,
  startTime: new Date(),
  lastActivity: new Date(),
  searchHistory: [],
  preferences: {
    theme: "auto",
    language: "en",
    defaultDescriptionStyle: "conversacional" as DescriptionStyle,
    autoSaveDescriptions: true,
    maxHistoryItems: 50,
    exportFormat: "json",
  },
  isAuthenticated: !!userId,
});

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      session: null,
      isInitialized: false,

      initializeSession: (userId) => {
        const session = createInitialSession(userId);
        set({ session, isInitialized: true }, false, "initializeSession");
      },

      updateLastActivity: () => {
        const { session } = get();
        if (session) {
          set(
            {
              session: {
                ...session,
                lastActivity: new Date(),
              },
            },
            false,
            "updateLastActivity",
          );
        }
      },

      endSession: () => {
        set({ session: null, isInitialized: false }, false, "endSession");
      },

      setAuthenticated: (authenticated, userId) => {
        const { session } = get();
        if (session) {
          set(
            {
              session: {
                ...session,
                isAuthenticated: authenticated,
                userId: authenticated ? userId : undefined,
                lastActivity: new Date(),
              },
            },
            false,
            "setAuthenticated",
          );
        } else if (authenticated && userId) {
          // Initialize session if authenticated
          get().initializeSession(userId);
        }
      },

      trackSearch: (query, resultCount) => {
        const { session } = get();
        if (session) {
          const searchItem: SearchHistoryItem = {
            id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            query,
            timestamp: new Date(),
            resultCount,
          };

          // Keep only the most recent searches within the limit
          const maxItems = session.preferences.maxHistoryItems;
          const updatedHistory = [searchItem, ...session.searchHistory].slice(
            0,
            maxItems,
          );

          set(
            {
              session: {
                ...session,
                searchHistory: updatedHistory,
                lastActivity: new Date(),
              },
            },
            false,
            "trackSearch",
          );
        }
      },

      getSessionDuration: () => {
        const { session } = get();
        if (!session) return 0;
        return Date.now() - session.startTime.getTime();
      },

      getActivitySummary: () => {
        const { session } = get();
        if (!session) {
          return {
            totalSearches: 0,
            uniqueQueries: 0,
            sessionDuration: 0,
            lastActivity: new Date(),
          };
        }

        const uniqueQueries = new Set(
          session.searchHistory.map((item) => item.query.toLowerCase()),
        ).size;

        return {
          totalSearches: session.searchHistory.length,
          uniqueQueries,
          sessionDuration: get().getSessionDuration(),
          lastActivity: session.lastActivity,
        };
      },
    }),
    { name: "SessionStore" },
  ),
);

// Optimized selectors with shallow comparison
const sessionStatusSelector = createShallowSelector((state: SessionStore) => ({
  session: state.session,
  isInitialized: state.isInitialized,
  isAuthenticated: state.session?.isAuthenticated ?? false,
}));

const sessionActionsSelector = createShallowSelector((state: SessionStore) => ({
  initializeSession: state.initializeSession,
  updateLastActivity: state.updateLastActivity,
  endSession: state.endSession,
  setAuthenticated: state.setAuthenticated,
  trackSearch: state.trackSearch,
}));

// Selectors
export const useSession = () => useSessionStore((state) => state.session);
export const useSessionStatus = () => sessionStatusSelector(useSessionStore);
export const useSessionActions = () => sessionActionsSelector(useSessionStore);
export const useActivitySummary = () =>
  useSessionStore((state) => state.getActivitySummary());
