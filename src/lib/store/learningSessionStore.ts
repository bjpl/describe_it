/**
 * Learning Session Store with Enhanced Persistence
 * Manages active learning sessions, user preferences, and progress tracking
 */

import * as React from "react";
import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { supabaseService } from "../api/supabase";
import {
  Session,
  SessionInsert,
  DescriptionStyle,
  DifficultyLevel,
} from "../../types/database";
import { UserPreferences } from "../../types";
import { useStableCallback, useCleanupManager, createShallowSelector } from "../utils/storeUtils";

// Add missing types for this store
export type LearningLevel = DifficultyLevel;
export type SessionType = 'practice' | 'flashcards' | 'quiz' | 'matching' | 'writing';
export type SessionStatus = 'active' | 'completed' | 'abandoned';

// =============================================================================
// TYPES
// =============================================================================

export interface LearningSessionState {
  // Current session
  currentSession: Session | null;
  sessionStartTime: Date | null;
  isSessionActive: boolean;

  // Session statistics (current session)
  currentStats: {
    images_viewed: number;
    descriptions_completed: number;
    questions_answered: number;
    questions_correct: number;
    phrases_selected: number;
    points_earned: number;
    time_spent_minutes: number;
  };

  // User preferences
  preferences: UserPreferences;

  // Learning settings
  learningSettings: {
    daily_goal: number;
    session_length_minutes: number;
    difficulty_preference: LearningLevel;
    auto_advance: boolean;
    show_hints: boolean;
    play_audio: boolean;
    dark_mode: boolean;
  };

  // Session history (limited recent sessions)
  recentSessions: Session[];

  // Progress tracking
  dailyProgress: {
    sessions_today: number;
    points_today: number;
    goal_progress: number; // percentage of daily goal completed
    streak_days: number;
  };

  // UI state
  ui: {
    sidebar_open: boolean;
    active_tab: string;
    selected_phrases: string[];
    current_image_id: string | null;
    fullscreen_mode: boolean;
  };
}

export interface LearningSessionActions {
  // Session management
  startSession: (sessionType?: SessionType, userId?: string) => Promise<void>;
  endSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  updateSessionStats: (
    updates: Partial<LearningSessionState["currentStats"]>,
  ) => void;

  // Preferences
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  updateLearningSettings: (
    updates: Partial<LearningSessionState["learningSettings"]>,
  ) => void;

  // Progress tracking
  addPoints: (points: number) => void;
  recordActivity: (activity: {
    type:
      | "image_viewed"
      | "description_completed"
      | "question_answered"
      | "phrase_selected";
    correct?: boolean;
    points?: number;
  }) => void;

  // UI actions
  setCurrentImage: (imageId: string | null) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  togglePhraseSelection: (phraseId: string) => void;
  clearSelectedPhrases: () => void;
  setFullscreenMode: (enabled: boolean) => void;

  // Persistence
  saveSession: () => Promise<void>;
  loadRecentSessions: (userId: string) => Promise<void>;
  exportSessionData: () => string;
  importSessionData: (data: string) => boolean;

  // Reset/Clear
  resetCurrentSession: () => void;
  clearAllData: () => void;
}

type LearningSessionStore = LearningSessionState & LearningSessionActions;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultPreferences: UserPreferences = {
  theme: "auto",
  language: "en",
  defaultDescriptionStyle: "conversacional" as DescriptionStyle,
  autoSaveDescriptions: true,
  maxHistoryItems: 50,
  exportFormat: "json",
};

const defaultLearningSettings: LearningSessionState["learningSettings"] = {
  daily_goal: 10,
  session_length_minutes: 20,
  difficulty_preference: "beginner" as DifficultyLevel,
  auto_advance: true,
  show_hints: true,
  play_audio: false,
  dark_mode: false,
};

const defaultStats: LearningSessionState["currentStats"] = {
  images_viewed: 0,
  descriptions_completed: 0,
  questions_answered: 0,
  questions_correct: 0,
  phrases_selected: 0,
  points_earned: 0,
  time_spent_minutes: 0,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useLearningSessionStore = create<LearningSessionStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial state
          currentSession: null,
          sessionStartTime: null,
          isSessionActive: false,
          currentStats: { ...defaultStats },
          preferences: { ...defaultPreferences },
          learningSettings: { ...defaultLearningSettings },
          recentSessions: [],
          dailyProgress: {
            sessions_today: 0,
            points_today: 0,
            goal_progress: 0,
            streak_days: 0,
          },
          ui: {
            sidebar_open: false,
            active_tab: "search",
            selected_phrases: [],
            current_image_id: null,
            fullscreen_mode: false,
          },

          // Session management
          startSession: async (sessionType = "practice", userId) => {
            const state = get();

            if (state.isSessionActive) {
              await state.endSession();
            }

            set((state) => {
              const now = new Date();

              // Create new session data
              const sessionData: Partial<Session> = {
                id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                user_id: userId || "anonymous",
                session_type: sessionType,
                status: "active",
                started_at: now.toISOString(),
                session_data: {
                  preferences: state.preferences,
                  settings: state.learningSettings,
                },
              };

              state.currentSession = sessionData as Session;
              state.sessionStartTime = now;
              state.isSessionActive = true;
              state.currentStats = { ...defaultStats };
            });

            // Save to database if user is authenticated
            if (userId && userId !== "anonymous") {
              try {
                const sessionInsert: SessionInsert = {
                  user_id: userId,
                  session_type: sessionType,
                  status: "active",
                  started_at: new Date().toISOString(),
                  session_data: {
                    preferences: state.preferences,
                    settings: state.learningSettings,
                  },
                };

                const savedSession =
                  await supabaseService.createSession(sessionInsert);

                set((state) => {
                  state.currentSession = savedSession;
                });
              } catch (error) {
                console.error("Failed to save session to database:", error);
              }
            }
          },

          endSession: async () => {
            const state = get();

            if (!state.isSessionActive || !state.currentSession) return;

            const endTime = new Date();
            const duration = state.sessionStartTime
              ? Math.floor(
                  (endTime.getTime() - state.sessionStartTime.getTime()) /
                    1000 /
                    60,
                )
              : state.currentStats.time_spent_minutes;

            // Update session with final stats
            const updatedSession: Partial<Session> = {
              ...state.currentSession,
              status: "completed",
              completed_at: endTime.toISOString(),
              // duration_minutes not in Session interface - would be calculated or stored in session_data
              ...state.currentStats,
              // accuracy_percentage field doesn't exist in Session interface
              // This would be calculated from questions_correct/questions_answered
            };

            set((state) => {
              state.currentSession = updatedSession as Session;
              state.isSessionActive = false;
              state.sessionStartTime = null;

              // Update daily progress
              state.dailyProgress.sessions_today += 1;
              state.dailyProgress.points_today +=
                state.currentStats.points_earned;
              state.dailyProgress.goal_progress = Math.min(
                100,
                (state.dailyProgress.points_today /
                  state.learningSettings.daily_goal) *
                  100,
              );

              // Add to recent sessions (keep last 10)
              state.recentSessions = [
                updatedSession as Session,
                ...state.recentSessions.slice(0, 9),
              ];
            });

            // Save to database
            if (
              state.currentSession?.user_id &&
              state.currentSession.user_id !== "anonymous"
            ) {
              try {
                await supabaseService.updateSession(
                  state.currentSession.id,
                  updatedSession,
                );
              } catch (error) {
                console.error("Failed to update session in database:", error);
              }
            }
          },

          pauseSession: async () => {
            const state = get();
            if (!state.isSessionActive || !state.currentSession) return;

            set((state) => {
              if (state.currentSession) {
                state.currentSession.status = "abandoned"; // 'paused' not supported in schema
              }
            });

            // Update in database
            if (state.currentSession?.user_id !== "anonymous") {
              try {
                await supabaseService.updateSession(state.currentSession!.id, {
                  status: "abandoned", // 'paused' not supported in schema
                });
              } catch (error) {
                console.error("Failed to pause session in database:", error);
              }
            }
          },

          resumeSession: async () => {
            const state = get();
            if (state.isSessionActive || !state.currentSession) return;

            set((state) => {
              if (state.currentSession) {
                state.currentSession.status = "active";
                state.isSessionActive = true;
              }
            });

            // Update in database
            if (state.currentSession?.user_id !== "anonymous") {
              try {
                await supabaseService.updateSession(state.currentSession!.id, {
                  status: "active",
                });
              } catch (error) {
                console.error("Failed to resume session in database:", error);
              }
            }
          },

          updateSessionStats: (updates) => {
            set((state) => {
              Object.assign(state.currentStats, updates);

              // Update current session if active
              if (state.currentSession && state.isSessionActive) {
                Object.assign(state.currentSession, updates);
              }
            });
          },

          // Preferences
          updatePreferences: (updates) => {
            set((state) => {
              Object.assign(state.preferences, updates);
            });
          },

          updateLearningSettings: (updates) => {
            set((state) => {
              Object.assign(state.learningSettings, updates);
            });
          },

          // Progress tracking
          addPoints: (points) => {
            set((state) => {
              state.currentStats.points_earned += points;

              // points_earned not in Session interface - would be stored in session_data JSON field
            });
          },

          recordActivity: (activity) => {
            set((state) => {
              switch (activity.type) {
                case "image_viewed":
                  state.currentStats.images_viewed += 1;
                  break;
                case "description_completed":
                  state.currentStats.descriptions_completed += 1;
                  if (activity.points)
                    state.currentStats.points_earned += activity.points;
                  break;
                case "question_answered":
                  state.currentStats.questions_answered += 1;
                  if (activity.correct)
                    state.currentStats.questions_correct += 1;
                  if (activity.points)
                    state.currentStats.points_earned += activity.points;
                  break;
                case "phrase_selected":
                  state.currentStats.phrases_selected += 1;
                  break;
              }

              // Update current session
              if (state.currentSession && state.isSessionActive) {
                Object.assign(state.currentSession, state.currentStats);
              }
            });
          },

          // UI actions
          setCurrentImage: (imageId) => {
            set((state) => {
              state.ui.current_image_id = imageId;
            });
          },

          toggleSidebar: () => {
            set((state) => {
              state.ui.sidebar_open = !state.ui.sidebar_open;
            });
          },

          setActiveTab: (tab) => {
            set((state) => {
              state.ui.active_tab = tab;
            });
          },

          togglePhraseSelection: (phraseId) => {
            set((state) => {
              const index = state.ui.selected_phrases.indexOf(phraseId);
              if (index > -1) {
                state.ui.selected_phrases.splice(index, 1);
              } else {
                state.ui.selected_phrases.push(phraseId);
              }
            });
          },

          clearSelectedPhrases: () => {
            set((state) => {
              state.ui.selected_phrases = [];
            });
          },

          setFullscreenMode: (enabled) => {
            set((state) => {
              state.ui.fullscreen_mode = enabled;
            });
          },

          // Persistence
          saveSession: async () => {
            const state = get();
            if (
              !state.currentSession ||
              state.currentSession.user_id === "anonymous"
            )
              return;

            try {
              await supabaseService.updateSession(state.currentSession.id, {
                ...state.currentStats,
                session_data: {
                  preferences: state.preferences,
                  settings: state.learningSettings,
                  ui_state: state.ui,
                },
                updated_at: new Date().toISOString(),
              });
            } catch (error) {
              console.error("Failed to save session:", error);
            }
          },

          loadRecentSessions: async (userId) => {
            try {
              const sessions = await supabaseService.getUserSessions(
                userId,
                10,
              );
              set((state) => {
                state.recentSessions = sessions;
              });
            } catch (error) {
              console.error("Failed to load recent sessions:", error);
            }
          },

          exportSessionData: () => {
            const state = get();
            const exportData = {
              preferences: state.preferences,
              learningSettings: state.learningSettings,
              recentSessions: state.recentSessions.slice(0, 5), // Last 5 sessions
              dailyProgress: state.dailyProgress,
              exportedAt: new Date().toISOString(),
              version: "1.0",
            };

            return JSON.stringify(exportData, null, 2);
          },

          importSessionData: (data) => {
            try {
              const importData = JSON.parse(data);

              if (!importData.version || !importData.preferences) {
                throw new Error("Invalid export data format");
              }

              set((state) => {
                if (importData.preferences) {
                  state.preferences = {
                    ...defaultPreferences,
                    ...importData.preferences,
                  };
                }

                if (importData.learningSettings) {
                  state.learningSettings = {
                    ...defaultLearningSettings,
                    ...importData.learningSettings,
                  };
                }

                if (importData.recentSessions) {
                  state.recentSessions = importData.recentSessions;
                }

                if (importData.dailyProgress) {
                  state.dailyProgress = {
                    ...state.dailyProgress,
                    ...importData.dailyProgress,
                  };
                }
              });

              return true;
            } catch (error) {
              console.error("Failed to import session data:", error);
              return false;
            }
          },

          // Reset/Clear
          resetCurrentSession: () => {
            set((state) => {
              state.currentSession = null;
              state.sessionStartTime = null;
              state.isSessionActive = false;
              state.currentStats = { ...defaultStats };
              state.ui.selected_phrases = [];
              state.ui.current_image_id = null;
            });
          },

          clearAllData: () => {
            set((state) => {
              state.currentSession = null;
              state.sessionStartTime = null;
              state.isSessionActive = false;
              state.currentStats = { ...defaultStats };
              state.preferences = { ...defaultPreferences };
              state.learningSettings = { ...defaultLearningSettings };
              state.recentSessions = [];
              state.dailyProgress = {
                sessions_today: 0,
                points_today: 0,
                goal_progress: 0,
                streak_days: 0,
              };
              state.ui = {
                sidebar_open: false,
                active_tab: "search",
                selected_phrases: [],
                current_image_id: null,
                fullscreen_mode: false,
              };
            });
          },
        })),
        {
          name: "learning-session-store",
          partialize: (state) => ({
            preferences: state.preferences,
            learningSettings: state.learningSettings,
            recentSessions: state.recentSessions.slice(0, 5),
            dailyProgress: state.dailyProgress,
            ui: {
              sidebar_open: state.ui.sidebar_open,
              active_tab: state.ui.active_tab,
            },
          }),
        },
      ),
    ),
    { name: "LearningSessionStore" },
  ),
);

// =============================================================================
// SELECTORS
// =============================================================================

export const useCurrentSession = () =>
  useLearningSessionStore((state) => state.currentSession);
export const useSessionActive = () =>
  useLearningSessionStore((state) => state.isSessionActive);
export const useCurrentStats = () =>
  useLearningSessionStore((state) => state.currentStats);
export const useUserPreferences = () =>
  useLearningSessionStore((state) => state.preferences);
export const useLearningSettings = () =>
  useLearningSessionStore((state) => state.learningSettings);
export const useDailyProgress = () =>
  useLearningSessionStore((state) => state.dailyProgress);
export const useUIState = () => useLearningSessionStore((state) => state.ui);

// Optimized selectors using shallow comparison
const sessionActionsSelector = createShallowSelector((state: LearningSessionStore) => ({
  startSession: state.startSession,
  endSession: state.endSession,
  pauseSession: state.pauseSession,
  resumeSession: state.resumeSession,
  updateSessionStats: state.updateSessionStats,
  recordActivity: state.recordActivity,
  addPoints: state.addPoints,
  saveSession: state.saveSession,
  resetCurrentSession: state.resetCurrentSession,
}));

const preferencesActionsSelector = createShallowSelector((state: LearningSessionStore) => ({
  updatePreferences: state.updatePreferences,
  updateLearningSettings: state.updateLearningSettings,
}));

const uiActionsSelector = createShallowSelector((state: LearningSessionStore) => ({
  setCurrentImage: state.setCurrentImage,
  toggleSidebar: state.toggleSidebar,
  setActiveTab: state.setActiveTab,
  togglePhraseSelection: state.togglePhraseSelection,
  clearSelectedPhrases: state.clearSelectedPhrases,
  setFullscreenMode: state.setFullscreenMode,
}));

// Session actions
export const useSessionActions = () => sessionActionsSelector(useLearningSessionStore);

// Preferences actions
export const usePreferencesActions = () => preferencesActionsSelector(useLearningSessionStore);

// UI actions
export const useUIActions = () => uiActionsSelector(useLearningSessionStore);

// =============================================================================
// PERSISTENCE HOOKS
// =============================================================================

/**
 * Auto-save session data periodically with proper cleanup and memoization
 */
export const useAutoSaveSession = (intervalMs = 30000) => {
  const cleanupManager = useCleanupManager();
  const isActive = useSessionActive();
  
  // Memoize the saveSession function to prevent unnecessary re-renders
  const saveSession = React.useMemo(
    () => useLearningSessionStore.getState().saveSession,
    []
  );

  // Stable callback that doesn't change on every render
  const stableSaveSession = useStableCallback(saveSession, []);

  React.useEffect(() => {
    if (!isActive) return;

    const intervalId = cleanupManager.addInterval(() => {
      stableSaveSession();
    }, intervalMs);

    return () => cleanupManager.clearInterval(intervalId);
  }, [isActive, intervalMs, stableSaveSession, cleanupManager]);
};

/**
 * Load user data on authentication with stable dependencies
 */
export const useLoadUserData = (userId: string | null) => {
  // Memoize the loadRecentSessions function to prevent dependency changes
  const loadRecentSessions = React.useMemo(
    () => useLearningSessionStore.getState().loadRecentSessions,
    []
  );

  // Stable callback that doesn't change on every render
  const stableLoadRecentSessions = useStableCallback(loadRecentSessions, []);

  React.useEffect(() => {
    if (userId && userId !== "anonymous") {
      stableLoadRecentSessions(userId);
    }
  }, [userId, stableLoadRecentSessions]);
};

