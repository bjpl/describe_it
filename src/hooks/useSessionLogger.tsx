// React Hook for Session Logging Integration
'use client';
import React, { useEffect, useCallback, useRef } from 'react';
import { SessionLogger, getSessionLogger } from '@/lib/logging/sessionLogger';
import { SessionReportGenerator } from '@/lib/logging/sessionReportGenerator';
import { SessionPersistence } from '@/lib/logging/sessionPersistence';
import { 
  InteractionType, 
  InteractionData, 
  SessionLoggerSettings, 
  SessionSummary,
  SessionReport 
} from '@/types/session';

interface UseSessionLoggerOptions {
  autoStart?: boolean;
  persistToStorage?: boolean;
  settings?: Partial<SessionLoggerSettings>;
}

interface UseSessionLoggerReturn {
  // Core logging methods
  logInteraction: (type: InteractionType, data?: InteractionData) => void;
  logSearch: (query: string, resultCount: number, duration: number) => void;
  logImageSelection: (imageId: string, imageUrl: string, selectionTime: number) => void;
  logDescriptionGeneration: (style: string, language: string, wordCount: number, generationTime: number, text?: string) => void;
  logQAGeneration: (question: string, answer: string, difficulty: string, category: string, generationTime: number) => void;
  logVocabularySelection: (words: string[], category: string) => void;
  logPhraseExtraction: (phrases: string[], categories: Record<string, string[]>) => void;
  logError: (message: string, stack?: string, code?: string) => void;
  logSettingsChange: (settingName: string, oldValue: any, newValue: any) => void;
  
  // Session management
  sessionId: string;
  startTime: number;
  interactionCount: number;
  
  // Reports and analytics
  generateSummary: () => SessionSummary;
  generateReport: () => SessionReport;
  exportSession: (format?: 'json' | 'text' | 'csv') => string;
  
  // Storage management
  saveSession: () => void;
  loadSession: (sessionId: string) => void;
  clearSession: () => void;
  
  // Settings
  updateSettings: (newSettings: Partial<SessionLoggerSettings>) => void;
  settings: SessionLoggerSettings;
}

export function useSessionLogger(options: UseSessionLoggerOptions = {}): UseSessionLoggerReturn {
  const {
    autoStart = true,
    persistToStorage = true,
    settings = {}
  } = options;

  const sessionLoggerRef = useRef<SessionLogger | null>(null);
  const reportGeneratorRef = useRef<SessionReportGenerator | null>(null);
  const persistenceRef = useRef<SessionPersistence | null>(null);
  
  // Initialize session logger (client-side only)
  useEffect(() => {
    // Only initialize on client-side
    if (typeof window === 'undefined') return;
    
    if (!sessionLoggerRef.current && autoStart) {
      const loggerSettings: Partial<SessionLoggerSettings> = {
        persistToStorage,
        enabled: true,
        maxInteractions: 1000,
        trackUserAgent: true,
        trackLocation: false,
        anonymizeData: false,
        autoExport: persistToStorage,
        exportInterval: 30,
        ...settings
      };

      sessionLoggerRef.current = getSessionLogger();
      reportGeneratorRef.current = new SessionReportGenerator(sessionLoggerRef.current);
      persistenceRef.current = new SessionPersistence(!persistToStorage); // false = localStorage, true = sessionStorage
      
      // Log page view
      sessionLoggerRef.current.logInteraction('page_view', {
        url: window.location.href,
        componentName: 'useSessionLogger'
      });
    }
  }, [autoStart, persistToStorage, settings]);

  // Page visibility tracking (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!sessionLoggerRef.current) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sessionLoggerRef.current?.logInteraction('session_ended', {
          duration: Date.now() - sessionLoggerRef.current.getSessionMetadata().startTime
        });
      } else {
        sessionLoggerRef.current?.logInteraction('session_started', {
          url: window.location.href
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      if (sessionLoggerRef.current) {
        sessionLoggerRef.current.logInteraction('session_ended', {
          duration: Date.now() - sessionLoggerRef.current.getSessionMetadata().startTime,
          componentName: 'useSessionLogger'
        });
      }
    };
  }, []);

  // Core logging methods
  const logInteraction = useCallback((type: InteractionType, data: InteractionData = {}) => {
    sessionLoggerRef.current?.logInteraction(type, data);
  }, []);

  const logSearch = useCallback((query: string, resultCount: number, duration: number) => {
    sessionLoggerRef.current?.logSearch(query, resultCount, duration);
  }, []);

  const logImageSelection = useCallback((imageId: string, imageUrl: string, selectionTime: number) => {
    sessionLoggerRef.current?.logImageSelection(imageId, imageUrl, selectionTime);
  }, []);

  const logDescriptionGeneration = useCallback((
    style: string,
    language: string,
    wordCount: number,
    generationTime: number,
    text?: string
  ) => {
    sessionLoggerRef.current?.logDescriptionGeneration(style, language, wordCount, generationTime, text);
  }, []);

  const logQAGeneration = useCallback((
    question: string,
    answer: string,
    difficulty: string,
    category: string,
    generationTime: number
  ) => {
    sessionLoggerRef.current?.logQAGeneration(question, answer, difficulty, category, generationTime);
  }, []);

  const logVocabularySelection = useCallback((words: string[], category: string) => {
    sessionLoggerRef.current?.logVocabularySelection(words, category);
  }, []);

  const logPhraseExtraction = useCallback((phrases: string[], categories: Record<string, string[]>) => {
    sessionLoggerRef.current?.logPhraseExtraction(phrases, categories);
  }, []);

  const logError = useCallback((message: string, stack?: string, code?: string) => {
    sessionLoggerRef.current?.logError(message, stack, code);
  }, []);

  const logSettingsChange = useCallback((settingName: string, oldValue: unknown, newValue: unknown) => {
    sessionLoggerRef.current?.logSettingsChange(settingName, oldValue, newValue);
  }, []);

  // Session management
  const generateSummary = useCallback((): SessionSummary => {
    if (!sessionLoggerRef.current) {
      throw new Error('Session logger not initialized');
    }
    return sessionLoggerRef.current.generateSummary();
  }, []);

  const generateReport = useCallback((): SessionReport => {
    if (!reportGeneratorRef.current) {
      throw new Error('Report generator not initialized');
    }
    return reportGeneratorRef.current.generateDetailedReport();
  }, []);

  const exportSession = useCallback((format: 'json' | 'text' | 'csv' = 'json'): string => {
    if (!sessionLoggerRef.current) {
      throw new Error('Session logger not initialized');
    }
    return sessionLoggerRef.current.exportSession(format);
  }, []);

  // Storage methods
  const saveSession = useCallback(async () => {
    if (!sessionLoggerRef.current || !persistenceRef.current) return;

    const sessionData = {
      currentSession: sessionLoggerRef.current.getSessionMetadata(),
      interactions: sessionLoggerRef.current.getInteractions(),
      settings: sessionLoggerRef.current.getSettings()
    };

    const summary = sessionLoggerRef.current.generateSummary();
    
    await persistenceRef.current.save(sessionLoggerRef.current.getSessionId(), sessionData);
    await persistenceRef.current.saveSummary(sessionLoggerRef.current.getSessionId(), summary);
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!persistenceRef.current) return;

    const sessionData = await persistenceRef.current.load(sessionId);
    if (sessionData) {
      // Create new session logger with loaded data
      sessionLoggerRef.current = new SessionLogger(sessionData.settings);
      reportGeneratorRef.current = new SessionReportGenerator(sessionLoggerRef.current);
      
      console.log('Session loaded:', sessionId);
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionLoggerRef.current?.clearSession();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SessionLoggerSettings>) => {
    if (!sessionLoggerRef.current) return;
    
    const currentSettings = sessionLoggerRef.current.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    // Log settings change
    Object.keys(newSettings).forEach(key => {
      logSettingsChange(
        key, 
        currentSettings[key as keyof SessionLoggerSettings], 
        newSettings[key as keyof SessionLoggerSettings]
      );
    });
    
    // Recreate session logger with new settings
    sessionLoggerRef.current = new SessionLogger(updatedSettings);
    reportGeneratorRef.current = new SessionReportGenerator(sessionLoggerRef.current);
  }, [logSettingsChange]);

  // Get current values
  const sessionId = sessionLoggerRef.current?.getSessionId() || '';
  const startTime = sessionLoggerRef.current?.getSessionMetadata()?.startTime || Date.now();
  const interactionCount = sessionLoggerRef.current?.getInteractions()?.length || 0;
  const currentSettings = sessionLoggerRef.current?.getSettings() || {} as SessionLoggerSettings;

  return {
    // Core logging methods
    logInteraction,
    logSearch,
    logImageSelection,
    logDescriptionGeneration,
    logQAGeneration,
    logVocabularySelection,
    logPhraseExtraction,
    logError,
    logSettingsChange,
    
    // Session info
    sessionId,
    startTime,
    interactionCount,
    
    // Reports
    generateSummary,
    generateReport,
    exportSession,
    
    // Storage
    saveSession,
    loadSession,
    clearSession,
    
    // Settings
    updateSettings,
    settings: currentSettings
  };
}

// Higher-order component for automatic session logging
export function withSessionLogging<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithSessionLogging(props: P) {
    const { logInteraction } = useSessionLogger();

    useEffect(() => {
      logInteraction('page_view', { componentName });
      
      return () => {
        logInteraction('modal_closed', { componentName });
      };
    }, [logInteraction]);

    return <WrappedComponent {...props} />;
  };
}

// Custom hooks for specific logging scenarios
export function useSearchLogging() {
  const { logSearch, logError } = useSessionLogger();
  
  return useCallback(async (searchFn: (query: string) => Promise<any>, query: string) => {
    const startTime = Date.now();
    
    try {
      const result = await searchFn(query);
      const duration = Date.now() - startTime;
      const resultCount = Array.isArray(result.results) ? result.results.length : 0;
      
      logSearch(query, resultCount, duration);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const duration = Date.now() - startTime;
      logError(errorMessage, errorStack, 'search_error');
      logSearch(query, 0, duration);
      throw error;
    }
  }, [logSearch, logError]);
}

export function useImageInteractionLogging() {
  const { logImageSelection, logInteraction } = useSessionLogger();
  
  const logImageView = useCallback((imageId: string, imageUrl: string) => {
    logInteraction('image_selected', {
      imageId,
      imageUrl,
      selectionTime: Date.now()
    });
  }, [logInteraction]);
  
  const logImageClick = useCallback((imageId: string, imageUrl: string, selectionTime: number) => {
    logImageSelection(imageId, imageUrl, selectionTime);
  }, [logImageSelection]);
  
  return { logImageView, logImageClick };
}

export function useContentGenerationLogging() {
  const { 
    logDescriptionGeneration, 
    logQAGeneration, 
    logPhraseExtraction,
    logError 
  } = useSessionLogger();
  
  const logDescriptionGenerated = useCallback((
    style: string,
    language: string,
    text: string,
    generationTime: number
  ) => {
    const wordCount = text.split(/\s+/).length;
    logDescriptionGeneration(style, language, wordCount, generationTime, text);
  }, [logDescriptionGeneration]);
  
  const logQuestionGenerated = useCallback((
    question: string,
    answer: string,
    difficulty: string,
    category: string,
    generationTime: number
  ) => {
    logQAGeneration(question, answer, difficulty, category, generationTime);
  }, [logQAGeneration]);
  
  const logPhrasesGenerated = useCallback((
    phrases: string[],
    categories: Record<string, string[]>
  ) => {
    logPhraseExtraction(phrases, categories);
  }, [logPhraseExtraction]);
  
  const logGenerationError = useCallback((error: any, type: string) => {
    logError(error.message, error.stack, `${type}_generation_error`);
  }, [logError]);
  
  return {
    logDescriptionGenerated,
    logQuestionGenerated,
    logPhrasesGenerated,
    logGenerationError
  };
}

// Analytics hooks
export function useSessionAnalytics() {
  const { generateSummary, generateReport } = useSessionLogger();
  
  const getQuickStats = useCallback(() => {
    try {
      const summary = generateSummary();
      return {
        duration: Math.round(summary.totalDuration / 1000 / 60),
        interactions: summary.totalInteractions,
        learningScore: summary.learningScore,
        activities: {
          searches: summary.totalSearches,
          images: summary.imagesViewed,
          descriptions: summary.descriptionsGenerated,
          questions: summary.questionsGenerated,
          vocabulary: summary.vocabularySelected
        }
      };
    } catch {
      return null;
    }
  }, [generateSummary]);
  
  const getDetailedAnalytics = useCallback(() => {
    try {
      return generateReport();
    } catch {
      return null;
    }
  }, [generateReport]);
  
  return { getQuickStats, getDetailedAnalytics };
}