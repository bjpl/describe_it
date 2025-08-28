import { useCallback, useEffect } from 'react';
import { useSessionStore, useSessionActions, useSession as useSessionState } from '../lib/store/sessionStore';
import { useAppStore } from '../lib/store/appStore';
import {
  UserSession,
  SearchHistoryItem,
  UserPreferences,
  UseSessionReturn
} from '../types';

export const useSession = (): UseSessionReturn => {
  const session = useSessionState();
  const { isInitialized } = useSessionStore();
  const sessionActions = useSessionActions();
  const { preferences, updatePreferences: updateAppPreferences } = useAppStore();
  
  // Initialize session on first load
  useEffect(() => {
    if (!isInitialized) {
      sessionActions.initializeSession();
    }
  }, [isInitialized, sessionActions]);
  
  // Update session activity periodically
  useEffect(() => {
    if (session && isInitialized) {
      const interval = setInterval(() => {
        sessionActions.updateLastActivity();
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [session, isInitialized, sessionActions]);
  
  // Sync preferences between stores
  useEffect(() => {
    if (session && session.preferences !== preferences) {
      updateAppPreferences(session.preferences);
    }
  }, [session?.preferences, preferences, updateAppPreferences]);
  
  const updatePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    if (session) {
      // Update both stores
      updateAppPreferences(newPreferences);
      
      // Update session store via session reconstruction
      const updatedSession: UserSession = {
        ...session,
        preferences: { ...session.preferences, ...newPreferences },
        lastActivity: new Date()
      };
      
      // Since we can't directly update session store preferences, 
      // we'll use the app store as the source of truth
      updateAppPreferences({ ...session.preferences, ...newPreferences });
    }
  }, [session, updateAppPreferences]);
  
  const addToHistory = useCallback((item: Omit<SearchHistoryItem, 'id'>) => {
    sessionActions.trackSearch(item.query, item.resultCount);
  }, [sessionActions]);
  
  const clearHistory = useCallback(() => {
    if (session) {
      // Create a new session with empty history
      const clearedSession: UserSession = {
        ...session,
        searchHistory: [],
        lastActivity: new Date()
      };
      
      // Re-initialize to clear history
      sessionActions.endSession();
      sessionActions.initializeSession(session.userId);
    }
  }, [session, sessionActions]);
  
  const exportSession = useCallback(async (): Promise<Blob> => {
    if (!session) {
      throw new Error('No active session to export');
    }
    
    const sessionData = {
      session: {
        id: session.id,
        userId: session.userId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        isAuthenticated: session.isAuthenticated
      },
      searchHistory: session.searchHistory,
      preferences: session.preferences,
      exportedAt: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(sessionData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }, [session]);
  
  // Return default session if none exists
  const defaultSession: UserSession = {
    id: 'default',
    startTime: new Date(),
    lastActivity: new Date(),
    searchHistory: [],
    preferences: {
      theme: 'auto',
      language: 'en',
      defaultDescriptionStyle: 'detailed',
      autoSaveDescriptions: true,
      maxHistoryItems: 50,
      exportFormat: 'json'
    },
    isAuthenticated: false
  };
  
  return {
    session: session || defaultSession,
    updatePreferences,
    addToHistory,
    clearHistory,
    exportSession
  };
};

// Hook for session statistics
export const useSessionStats = () => {
  const { getActivitySummary, getSessionDuration } = useSessionStore();
  
  const stats = getActivitySummary();
  const duration = getSessionDuration();
  
  const formatDuration = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);
  
  return {
    ...stats,
    sessionDuration: duration,
    formattedDuration: formatDuration(duration),
    averageSearchesPerHour: duration > 0 ? (stats.totalSearches / (duration / 3600000)) : 0
  };
};

// Hook for authentication state
export const useAuth = () => {
  const session = useSessionState();
  const { setAuthenticated } = useSessionActions();
  
  const login = useCallback(async (userId: string, userData?: any) => {
    setAuthenticated(true, userId);
    
    // Here you would typically make an API call to authenticate
    // For now, we'll just update the session state
    return { success: true, user: { id: userId, ...userData } };
  }, [setAuthenticated]);
  
  const logout = useCallback(async () => {
    setAuthenticated(false);
    
    // Here you would typically make an API call to logout
    // For now, we'll just update the session state
    return { success: true };
  }, [setAuthenticated]);
  
  const isAuthenticated = session?.isAuthenticated ?? false;
  
  return {
    isAuthenticated,
    userId: session?.userId,
    login,
    logout
  };
};

// Hook for search history management
export const useSearchHistory = () => {
  const session = useSessionState();
  const { trackSearch } = useSessionActions();
  
  const searchHistory = session?.searchHistory ?? [];
  
  const getRecentSearches = useCallback((limit: number = 10) => {
    return searchHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [searchHistory]);
  
  const getPopularSearches = useCallback((limit: number = 5) => {
    const queryCount = searchHistory.reduce((acc, item) => {
      const query = item.query.toLowerCase();
      acc[query] = (acc[query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(queryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({ 
        query, 
        count, 
        lastSearched: searchHistory
          .filter(item => item.query.toLowerCase() === query)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp
      }));
  }, [searchHistory]);
  
  const getSearchTrends = useCallback(() => {
    // Group searches by day
    const now = new Date();
    const trends = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const daySearches = searchHistory.filter(item => {
        const searchDate = new Date(item.timestamp);
        return searchDate >= date && searchDate < nextDate;
      });
      
      trends.push({
        date: date.toISOString().split('T')[0],
        count: daySearches.length,
        queries: daySearches.length
      });
    }
    
    return trends;
  }, [searchHistory]);
  
  return {
    searchHistory,
    addSearch: trackSearch,
    getRecentSearches,
    getPopularSearches,
    getSearchTrends,
    totalSearches: searchHistory.length
  };
};

// Hook for preferences management
export const usePreferences = () => {
  const session = useSessionState();
  const { updatePreferences } = useSession();
  
  const preferences = session?.preferences ?? {
    theme: 'auto' as const,
    language: 'en',
    defaultDescriptionStyle: 'detailed' as const,
    autoSaveDescriptions: true,
    maxHistoryItems: 50,
    exportFormat: 'json' as const
  };
  
  const updateTheme = useCallback((theme: UserPreferences['theme']) => {
    updatePreferences({ theme });
  }, [updatePreferences]);
  
  const updateLanguage = useCallback((language: string) => {
    updatePreferences({ language });
  }, [updatePreferences]);
  
  const updateDefaultStyle = useCallback((style: UserPreferences['defaultDescriptionStyle']) => {
    updatePreferences({ defaultDescriptionStyle: style });
  }, [updatePreferences]);
  
  const toggleAutoSave = useCallback(() => {
    updatePreferences({ autoSaveDescriptions: !preferences.autoSaveDescriptions });
  }, [updatePreferences, preferences.autoSaveDescriptions]);
  
  const updateHistoryLimit = useCallback((maxHistoryItems: number) => {
    updatePreferences({ maxHistoryItems });
  }, [updatePreferences]);
  
  const updateExportFormat = useCallback((format: UserPreferences['exportFormat']) => {
    updatePreferences({ exportFormat: format });
  }, [updatePreferences]);
  
  return {
    preferences,
    updatePreferences,
    updateTheme,
    updateLanguage,
    updateDefaultStyle,
    toggleAutoSave,
    updateHistoryLimit,
    updateExportFormat
  };
};