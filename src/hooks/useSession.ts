import { useState, useCallback, useEffect } from 'react';
import { UserSession, UserPreferences, SearchHistoryItem } from '@/types';

const defaultPreferences: UserPreferences = {
  theme: 'light',
  language: 'en',
  defaultDescriptionStyle: 'detailed',
  autoSaveDescriptions: true,
  maxHistoryItems: 50,
  exportFormat: 'json'
};

export function useSession() {
  const [session, setSession] = useState<UserSession>({
    id: '', // Initialize empty, will be set in useEffect
    startTime: new Date(0), // Initialize with epoch, will be set in useEffect
    lastActivity: new Date(0), // Initialize with epoch, will be set in useEffect
    searchHistory: [],
    preferences: defaultPreferences,
    isAuthenticated: false
  });

  // Initialize session data only on client side to prevent hydration mismatch
  useEffect(() => {
    if (session.id === '' && typeof window !== 'undefined') {
      const now = new Date();
      setSession(prev => ({
        ...prev,
        id: crypto.randomUUID(),
        startTime: now,
        lastActivity: now
      }));
    }
  }, [session.id]);

  const updatePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    setSession(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...newPreferences },
      lastActivity: new Date()
    }));
  }, []);

  const addToHistory = useCallback((item: Omit<SearchHistoryItem, 'id'>) => {
    setSession(prev => {
      const newItem: SearchHistoryItem = { 
        ...item, 
        id: typeof window !== 'undefined' ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`
      };
      const newHistory = [newItem, ...prev.searchHistory].slice(0, prev.preferences.maxHistoryItems);
      
      return {
        ...prev,
        searchHistory: newHistory,
        lastActivity: new Date()
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSession(prev => ({
      ...prev,
      searchHistory: [],
      lastActivity: new Date()
    }));
  }, []);

  const exportSession = useCallback(async (): Promise<Blob> => {
    const sessionData = {
      ...session,
      exportedAt: new Date()
    };

    return new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json'
    });
  }, [session]);

  return {
    session,
    updatePreferences,
    addToHistory,
    clearHistory,
    exportSession
  };
}