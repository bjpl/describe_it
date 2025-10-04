# State Management Architecture

This document outlines the state management patterns and architecture used in the Describe It application.

## 📋 Overview

The application uses a multi-layered state management approach that combines:

1. **Zustand**: Lightweight client-side state management
2. **React Query (TanStack Query)**: Server state management and caching
3. **React Context**: Component-level state sharing
4. **Local Storage**: Persistent client-side storage
5. **Session Storage**: Temporary session data
6. **URL State**: Shareable application state

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │────│  React Context   │    │  Local Storage  │
│                 │    │  - Theme         │    │  - Preferences  │
│                 │    │  - Modal State   │    │  - Cache        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Zustand     │────│   React Query    │────│  Session Data   │
│  - App State    │    │  - Server State  │    │  - Temp Cache   │
│  - UI State     │    │  - API Caching   │    │  - Form Data    │
│  - User Prefs   │    │  - Sync/Async    │    │  - Session ID   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 ▼
                    ┌──────────────────┐
                    │   Supabase DB    │
                    │  - User Data     │
                    │  - Sessions      │
                    │  - Content       │
                    └──────────────────┘
```

## 🎯 State Categories

### 1. Application State (Zustand)

Global application state that needs to be shared across multiple components.

```typescript
// src/lib/store/appStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // UI State
  isLoading: boolean;
  currentTab: string;
  sidebarOpen: boolean;
  
  // User Preferences
  language: 'es' | 'en';
  theme: 'light' | 'dark' | 'system';
  autoTranslate: boolean;
  showHints: boolean;
  
  // Active Session
  currentSessionId: string | null;
  sessionTitle: string;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setCurrentTab: (tab: string) => void;
  toggleSidebar: () => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  setCurrentSession: (sessionId: string, title: string) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isLoading: false,
        currentTab: 'search',
        sidebarOpen: false,
        language: 'es',
        theme: 'system',
        autoTranslate: true,
        showHints: true,
        currentSessionId: null,
        sessionTitle: '',
        
        // Actions
        setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
        
        setCurrentTab: (tab) => set({ currentTab: tab }, false, 'setCurrentTab'),
        
        toggleSidebar: () => set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar'
        ),
        
        updatePreferences: (prefs) => set(
          (state) => ({ ...state, ...prefs }),
          false,
          'updatePreferences'
        ),
        
        setCurrentSession: (sessionId, title) => set({
          currentSessionId: sessionId,
          sessionTitle: title
        }, false, 'setCurrentSession'),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          language: state.language,
          theme: state.theme,
          autoTranslate: state.autoTranslate,
          showHints: state.showHints,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'App Store' }
  )
);
```

### 2. Image Search State

Specialized store for image search functionality:

```typescript
// src/lib/store/imageStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ImageState {
  // Search state
  query: string;
  searchResults: ImageResult[];
  isSearching: boolean;
  searchError: string | null;
  currentPage: number;
  hasNextPage: boolean;
  
  // Selected image
  selectedImage: ImageResult | null;
  
  // Search history
  recentSearches: string[];
  
  // Actions
  setQuery: (query: string) => void;
  setSearchResults: (results: ImageResult[], page: number, hasNext: boolean) => void;
  setSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  selectImage: (image: ImageResult) => void;
  clearSelection: () => void;
  addToRecentSearches: (query: string) => void;
  loadNextPage: () => void;
  resetSearch: () => void;
}

export const useImageStore = create<ImageState>()(
  devtools(
    (set, get) => ({
      // Initial state
      query: '',
      searchResults: [],
      isSearching: false,
      searchError: null,
      currentPage: 1,
      hasNextPage: false,
      selectedImage: null,
      recentSearches: [],
      
      // Actions
      setQuery: (query) => set({ query }, false, 'setQuery'),
      
      setSearchResults: (results, page, hasNext) => set(
        (state) => ({
          searchResults: page === 1 ? results : [...state.searchResults, ...results],
          currentPage: page,
          hasNextPage: hasNext,
          isSearching: false,
          searchError: null,
        }),
        false,
        'setSearchResults'
      ),
      
      setSearching: (searching) => set({ isSearching: searching }, false, 'setSearching'),
      
      setSearchError: (error) => set({ 
        searchError: error, 
        isSearching: false 
      }, false, 'setSearchError'),
      
      selectImage: (image) => set({ selectedImage: image }, false, 'selectImage'),
      
      clearSelection: () => set({ selectedImage: null }, false, 'clearSelection'),
      
      addToRecentSearches: (query) => set(
        (state) => {
          const trimmed = query.trim().toLowerCase();
          if (!trimmed || state.recentSearches.includes(trimmed)) return state;
          
          return {
            recentSearches: [trimmed, ...state.recentSearches.slice(0, 9)] // Keep last 10
          };
        },
        false,
        'addToRecentSearches'
      ),
      
      loadNextPage: async () => {
        const state = get();
        if (state.isSearching || !state.hasNextPage) return;
        
        set({ isSearching: true }, false, 'loadNextPage');
        
        try {
          const response = await fetch(`/api/images/search?query=${encodeURIComponent(state.query)}&page=${state.currentPage + 1}`);
          const data = await response.json();
          
          if (data.success) {
            get().setSearchResults(data.images, state.currentPage + 1, data.hasNext);
          } else {
            get().setSearchError(data.error);
          }
        } catch (error) {
          get().setSearchError('Failed to load more images');
        }
      },
      
      resetSearch: () => set({
        query: '',
        searchResults: [],
        isSearching: false,
        searchError: null,
        currentPage: 1,
        hasNextPage: false,
        selectedImage: null,
      }, false, 'resetSearch'),
    }),
    { name: 'Image Store' }
  )
);
```

### 3. Learning Session State

Session-specific state management:

```typescript
// src/lib/store/sessionStore.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

interface SessionState {
  // Session data
  sessionId: string | null;
  sessionTitle: string;
  startTime: Date | null;
  
  // Content
  descriptions: Description[];
  questions: QAGeneration[];
  vocabulary: VocabularyPhrase[];
  
  // Progress tracking
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // seconds
  
  // Current activity
  currentDescription: Description | null;
  currentQuestionIndex: number;
  isGeneratingContent: boolean;
  
  // Actions
  startSession: (title?: string) => void;
  endSession: () => void;
  addDescription: (description: Description) => void;
  addQuestions: (questions: QAGeneration[]) => void;
  addVocabulary: (phrases: VocabularyPhrase[]) => void;
  answerQuestion: (questionId: string, isCorrect: boolean, timeSpent: number) => void;
  setCurrentDescription: (description: Description) => void;
  nextQuestion: () => void;
  setGeneratingContent: (generating: boolean) => void;
  updateTimeSpent: () => void;
  exportSession: () => SessionExport;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        sessionId: null,
        sessionTitle: '',
        startTime: null,
        descriptions: [],
        questions: [],
        vocabulary: [],
        totalQuestions: 0,
        correctAnswers: 0,
        timeSpent: 0,
        currentDescription: null,
        currentQuestionIndex: 0,
        isGeneratingContent: false,
        
        // Actions
        startSession: (title = 'Nueva Sesión') => {
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          set({
            sessionId,
            sessionTitle: title,
            startTime: new Date(),
            descriptions: [],
            questions: [],
            vocabulary: [],
            totalQuestions: 0,
            correctAnswers: 0,
            timeSpent: 0,
            currentQuestionIndex: 0,
          }, false, 'startSession');
        },
        
        endSession: () => {
          // Save session data before clearing
          const state = get();
          if (state.sessionId) {
            saveSessionToStorage(state);
          }
          
          set({
            sessionId: null,
            sessionTitle: '',
            startTime: null,
            descriptions: [],
            questions: [],
            vocabulary: [],
            totalQuestions: 0,
            correctAnswers: 0,
            timeSpent: 0,
            currentDescription: null,
            currentQuestionIndex: 0,
          }, false, 'endSession');
        },
        
        addDescription: (description) => set(
          (state) => ({
            descriptions: [...state.descriptions, description],
            currentDescription: description,
          }),
          false,
          'addDescription'
        ),
        
        addQuestions: (questions) => set(
          (state) => ({
            questions: [...state.questions, ...questions],
            totalQuestions: state.totalQuestions + questions.length,
          }),
          false,
          'addQuestions'
        ),
        
        addVocabulary: (phrases) => set(
          (state) => ({
            vocabulary: [...state.vocabulary, ...phrases],
          }),
          false,
          'addVocabulary'
        ),
        
        answerQuestion: (questionId, isCorrect, timeSpent) => set(
          (state) => ({
            correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
            timeSpent: state.timeSpent + timeSpent,
          }),
          false,
          'answerQuestion'
        ),
        
        setCurrentDescription: (description) => set({
          currentDescription: description
        }, false, 'setCurrentDescription'),
        
        nextQuestion: () => set(
          (state) => ({
            currentQuestionIndex: Math.min(
              state.currentQuestionIndex + 1,
              state.questions.length - 1
            ),
          }),
          false,
          'nextQuestion'
        ),
        
        setGeneratingContent: (generating) => set({
          isGeneratingContent: generating
        }, false, 'setGeneratingContent'),
        
        updateTimeSpent: () => {
          const state = get();
          if (state.startTime) {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - state.startTime.getTime()) / 1000);
            set({ timeSpent: elapsed }, false, 'updateTimeSpent');
          }
        },
        
        exportSession: () => {
          const state = get();
          return {
            sessionId: state.sessionId,
            sessionTitle: state.sessionTitle,
            startTime: state.startTime,
            descriptions: state.descriptions,
            questions: state.questions,
            vocabulary: state.vocabulary,
            progress: {
              totalQuestions: state.totalQuestions,
              correctAnswers: state.correctAnswers,
              accuracy: state.totalQuestions > 0 ? state.correctAnswers / state.totalQuestions : 0,
              timeSpent: state.timeSpent,
            },
          };
        },
      })
    ),
    { name: 'Session Store' }
  )
);

// Auto-save session data every 30 seconds
useSessionStore.subscribe(
  (state) => state.sessionId,
  (sessionId) => {
    if (sessionId) {
      const interval = setInterval(() => {
        const currentState = useSessionStore.getState();
        saveSessionToStorage(currentState);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }
);

function saveSessionToStorage(state: SessionState) {
  if (state.sessionId) {
    const sessionData = state.exportSession();
    localStorage.setItem(`session_${state.sessionId}`, JSON.stringify(sessionData));
  }
}
```

## 🌐 Server State Management (React Query)

React Query handles all server-side state management, API caching, and synchronization.

### Configuration

```typescript
// src/lib/query/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error && 
            typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
```

### Custom Hooks

#### 1. Description Generation

```typescript
// src/hooks/useDescriptionGeneration.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/lib/store/sessionStore';

interface GenerateDescriptionParams {
  imageUrl: string;
  style: DescriptionStyle;
  maxLength?: number;
  customPrompt?: string;
}

export function useDescriptionGeneration() {
  const queryClient = useQueryClient();
  const addDescription = useSessionStore(state => state.addDescription);
  const setGeneratingContent = useSessionStore(state => state.setGeneratingContent);
  
  return useMutation({
    mutationFn: async (params: GenerateDescriptionParams) => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate description');
      }
      
      return response.json();
    },
    
    onMutate: () => {
      setGeneratingContent(true);
    },
    
    onSuccess: (data) => {
      // Add descriptions to session store
      data.data.forEach((description: Description) => {
        addDescription(description);
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['descriptions'] });
    },
    
    onError: (error) => {
      console.error('Description generation failed:', error);
    },
    
    onSettled: () => {
      setGeneratingContent(false);
    },
  });
}
```

#### 2. Q&A Generation

```typescript
// src/hooks/useQAGeneration.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/lib/store/sessionStore';

interface GenerateQAParams {
  description: string;
  language: 'es' | 'en';
  count?: number;
}

export function useQAGeneration() {
  const queryClient = useQueryClient();
  const addQuestions = useSessionStore(state => state.addQuestions);
  const setGeneratingContent = useSessionStore(state => state.setGeneratingContent);
  
  return useMutation({
    mutationFn: async (params: GenerateQAParams) => {
      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate Q&A');
      }
      
      return response.json();
    },
    
    onMutate: () => {
      setGeneratingContent(true);
    },
    
    onSuccess: (data) => {
      addQuestions(data.questions);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    
    onSettled: () => {
      setGeneratingContent(false);
    },
  });
}
```

#### 3. Session Data Queries

```typescript
// src/hooks/useSessionQueries.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

export function useUserSessions() {
  return useQuery({
    queryKey: ['sessions', 'user'],
    queryFn: async () => {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSessionDetails(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    enabled: !!sessionId,
  });
}

export function useInfiniteDescriptions(filters: DescriptionFilters) {
  return useInfiniteQuery({
    queryKey: ['descriptions', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        ...filters,
      });
      
      const response = await fetch(`/api/descriptions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch descriptions');
      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
  });
}
```

## 🎨 Context Providers

React Context is used for component-level state that doesn't need global access.

### Theme Provider

```typescript
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore(state => state.theme);
  const updatePreferences = useAppStore(state => state.updatePreferences);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setActualTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const handler = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setActualTheme(theme);
    }
  }, [theme]);
  
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);
  }, [actualTheme]);
  
  const setTheme = (newTheme: Theme) => {
    updatePreferences({ theme: newTheme });
  };
  
  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Modal Provider

```typescript
// src/contexts/ModalContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';

interface Modal {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
  options?: {
    closable?: boolean;
    overlay?: boolean;
    className?: string;
  };
}

interface ModalContextType {
  modals: Modal[];
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);
  
  const openModal = useCallback((modal: Omit<Modal, 'id'>) => {
    const id = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newModal: Modal = { ...modal, id };
    
    setModals(prev => [...prev, newModal]);
    return id;
  }, []);
  
  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);
  
  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);
  
  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, closeAllModals }}>
      {children}
      {modals.map(modal => {
        const Component = modal.component;
        return (
          <ModalWrapper key={modal.id} modal={modal} onClose={() => closeModal(modal.id)}>
            <Component {...modal.props} onClose={() => closeModal(modal.id)} />
          </ModalWrapper>
        );
      })}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}
```

## 💾 Persistence Strategies

### 1. Local Storage (Zustand Persist)

```typescript
// src/lib/store/persistConfig.ts
import { PersistOptions } from 'zustand/middleware';

export const createPersistConfig = <T>(
  name: string,
  partialize?: (state: T) => Partial<T>
): PersistOptions<T> => ({
  name,
  partialize,
  storage: {
    getItem: (name) => {
      try {
        const item = localStorage.getItem(name);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.warn(`Failed to get item "${name}" from localStorage:`, error);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to set item "${name}" in localStorage:`, error);
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn(`Failed to remove item "${name}" from localStorage:`, error);
      }
    },
  },
});
```

### 2. Session Storage Utilities

```typescript
// src/lib/storage/sessionStorage.ts
export class SessionStorageManager {
  static setItem<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to session storage: ${key}`, error);
    }
  }
  
  static getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.warn(`Failed to read from session storage: ${key}`, error);
      return defaultValue || null;
    }
  }
  
  static removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from session storage: ${key}`, error);
    }
  }
  
  static clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear session storage', error);
    }
  }
}
```

## 🔄 State Synchronization

### Real-time Updates with Supabase

```typescript
// src/hooks/useRealtimeSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSessionStore } from '@/lib/store/sessionStore';

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const sessionId = useSessionStore(state => state.sessionId);
  
  useEffect(() => {
    if (!sessionId) return;
    
    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`session_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        console.log('Session updated:', payload);
        queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'descriptions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        console.log('New description:', payload);
        queryClient.invalidateQueries({ queryKey: ['descriptions'] });
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, queryClient]);
}
```

### URL State Management

```typescript
// src/hooks/useUrlState.ts
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const getState = useCallback((): T => {
    const state = { ...defaults };
    
    Object.keys(defaults).forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null) {
        (state as any)[key] = value;
      }
    });
    
    return state;
  }, [searchParams, defaults]);
  
  const setState = useCallback((updates: Partial<T>) => {
    const current = getState();
    const newState = { ...current, ...updates };
    
    const params = new URLSearchParams();
    Object.entries(newState).forEach(([key, value]) => {
      if (value !== defaults[key as keyof T] && value) {
        params.set(key, value);
      }
    });
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.push(newUrl);
  }, [getState, router, defaults]);
  
  return [getState(), setState] as const;
}
```

## 🚀 Performance Optimization

### 1. Selector Optimization

```typescript
// ✅ Good: Specific selectors to prevent unnecessary re-renders
const currentTab = useAppStore(state => state.currentTab);
const setCurrentTab = useAppStore(state => state.setCurrentTab);

// ❌ Bad: Will cause re-renders on any state change
const appState = useAppStore();
```

### 2. Memoization

```typescript
// src/hooks/useMemoizedSelectors.ts
import { useMemo } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

export function useSessionProgress() {
  const totalQuestions = useSessionStore(state => state.totalQuestions);
  const correctAnswers = useSessionStore(state => state.correctAnswers);
  
  return useMemo(() => ({
    accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
    completed: totalQuestions,
    correct: correctAnswers,
    incorrect: totalQuestions - correctAnswers,
  }), [totalQuestions, correctAnswers]);
}
```

### 3. Query Optimization

```typescript
// src/hooks/useOptimizedQueries.ts
import { useQueries } from '@tanstack/react-query';

export function useSessionData(sessionId: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['sessions', sessionId],
        queryFn: () => fetchSession(sessionId),
        enabled: !!sessionId,
      },
      {
        queryKey: ['descriptions', sessionId],
        queryFn: () => fetchDescriptions(sessionId),
        enabled: !!sessionId,
      },
      {
        queryKey: ['questions', sessionId],
        queryFn: () => fetchQuestions(sessionId),
        enabled: !!sessionId,
      },
    ],
  });
  
  return {
    session: results[0],
    descriptions: results[1],
    questions: results[2],
    isLoading: results.some(result => result.isLoading),
    hasError: results.some(result => result.isError),
  };
}
```

## 🔍 Debugging and DevTools

### 1. Zustand DevTools

```typescript
// All stores include devtools middleware
export const useAppStore = create<AppState>()(
  devtools(
    persist(/* ... */),
    { name: 'App Store', serialize: true }
  )
);
```

### 2. React Query DevTools

```typescript
// src/app/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 3. State Logging

```typescript
// src/lib/store/middleware/logger.ts
import { StateCreator } from 'zustand';

export const logger = <T>(
  config: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> =>
  (set, get, api) =>
    config(
      (args) => {
        console.log('Previous state:', get());
        set(args);
        console.log('New state:', get());
      },
      get,
      api
    );

// Usage
export const useDebugStore = create<State>()(
  logger(
    devtools(
      (set) => ({
        // Store implementation
      })
    )
  )
);
```

## 📊 Best Practices Summary

### Do's ✅

1. **Use appropriate tools**: Zustand for client state, React Query for server state
2. **Optimize selectors**: Use specific selectors to prevent unnecessary re-renders
3. **Persist wisely**: Only persist necessary data (user preferences, not temporary UI state)
4. **Structure logically**: Separate stores by domain (app, session, images, etc.)
5. **Handle errors**: Implement proper error boundaries and fallbacks
6. **Implement loading states**: Show appropriate loading indicators
7. **Use TypeScript**: Strict typing prevents runtime errors
8. **Optimize performance**: Memoize expensive calculations
9. **Monitor state**: Use DevTools for debugging
10. **Document patterns**: Clear documentation for state management patterns

### Don'ts ❌

1. **Don't overuse global state**: Not everything needs to be in Zustand
2. **Don't ignore loading states**: Always handle async state properly
3. **Don't mutate state directly**: Use immutable updates
4. **Don't store server data in Zustand**: Use React Query instead
5. **Don't persist sensitive data**: Keep API keys and tokens secure
6. **Don't use too many stores**: Balance between separation and complexity
7. **Don't forget to clean up**: Remove listeners and subscriptions
8. **Don't ignore errors**: Handle and display errors appropriately
9. **Don't block rendering**: Keep state updates non-blocking
10. **Don't over-optimize**: Profile before optimizing

This comprehensive state management architecture ensures the Describe It application maintains good performance, user experience, and developer experience while handling complex learning session data and real-time updates.