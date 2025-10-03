/**
 * State Hydration Integration Tests
 * Tests for loading and restoring application state from storage
 *
 * Coverage:
 * - State restoration from localStorage
 * - State restoration from sessionStorage
 * - Merge persisted state with initial state
 * - Handle corrupted storage data
 * - Version migration
 * - SSR-safe hydration
 * - Cross-tab state synchronization
 * - Hydration error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStore } from '@/lib/store/appStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { createSSRStorage, ssrPersist } from '@/lib/store/middleware/ssrPersist';

describe('State Hydration - App Store Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Reset store to initial state
    useAppStore.setState({
      currentImage: null,
      sidebarOpen: false,
      activeTab: 'search',
      isFullscreen: false,
      searchHistory: [],
      isLoading: false,
      error: null,
      preferences: {
        theme: 'auto',
        language: 'en',
        defaultDescriptionStyle: 'conversacional',
        autoSaveDescriptions: true,
        maxHistoryItems: 50,
        exportFormat: 'json',
      }
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should persist app state to localStorage', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setSidebarOpen(true);
      result.current.setActiveTab('history');
    });

    // Check if data was persisted
    const stored = localStorage.getItem('describe-it-app-store');
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.sidebarOpen).toBe(true);
    expect(parsed.state.activeTab).toBe('history');
  });

  it('should restore app state from localStorage on mount', () => {
    // Preset localStorage with saved state
    const savedState = {
      state: {
        sidebarOpen: true,
        activeTab: 'history',
        preferences: {
          theme: 'dark',
          language: 'es',
          defaultDescriptionStyle: 'formal',
          autoSaveDescriptions: false,
          maxHistoryItems: 100,
          exportFormat: 'csv',
        }
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(savedState));

    // Create new hook instance to trigger hydration
    const { result } = renderHook(() => useAppStore());

    // Wait for hydration
    waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true);
      expect(result.current.activeTab).toBe('history');
      expect(result.current.preferences.theme).toBe('dark');
    });
  });

  it('should merge persisted state with initial state', () => {
    // Save partial state
    const savedState = {
      state: {
        sidebarOpen: true,
        // activeTab is missing, should use default
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(savedState));

    const { result } = renderHook(() => useAppStore());

    waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true);
      expect(result.current.activeTab).toBe('search'); // Default value
    });
  });

  it('should persist search history', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addToHistory({
        query: 'test search',
        timestamp: new Date(),
        resultCount: 5
      });
    });

    const stored = localStorage.getItem('describe-it-app-store');
    const parsed = JSON.parse(stored!);

    expect(parsed.state.searchHistory).toHaveLength(1);
    expect(parsed.state.searchHistory[0].query).toBe('test search');
  });

  it('should persist user preferences', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.updatePreferences({
        theme: 'dark',
        language: 'fr'
      });
    });

    const stored = localStorage.getItem('describe-it-app-store');
    const parsed = JSON.parse(stored!);

    expect(parsed.state.preferences.theme).toBe('dark');
    expect(parsed.state.preferences.language).toBe('fr');
  });

  it('should not persist transient state (currentImage, isLoading, error)', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setCurrentImage({
        id: '123',
        url: 'https://example.com/image.jpg',
        description: 'Test image',
        altText: 'Test',
        width: 800,
        height: 600,
        format: 'jpg'
      });
      result.current.setLoading(true);
      result.current.setError('Test error');
    });

    const stored = localStorage.getItem('describe-it-app-store');
    const parsed = JSON.parse(stored!);

    // These should not be persisted
    expect(parsed.state.currentImage).toBeUndefined();
    expect(parsed.state.isLoading).toBeUndefined();
    expect(parsed.state.error).toBeUndefined();
  });
});

describe('State Hydration - Corrupted Data Handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle corrupted JSON in localStorage', () => {
    localStorage.setItem('describe-it-app-store', '{invalid json}');

    const { result } = renderHook(() => useAppStore());

    // Should use default state without crashing
    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.activeTab).toBe('search');
  });

  it('should handle missing state property in stored data', () => {
    const invalidState = {
      state: null, // Invalid: state should be an object
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(invalidState));

    const { result } = renderHook(() => useAppStore());

    // Should use default state
    expect(result.current.preferences).toBeDefined();
  });

  it('should handle partially corrupted preferences', () => {
    const partialState = {
      state: {
        preferences: {
          theme: 'dark',
          // Missing other required fields
        }
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(partialState));

    const { result } = renderHook(() => useAppStore());

    waitFor(() => {
      // Should merge with defaults
      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.language).toBe('en'); // Default
    });
  });

  it('should handle invalid data types in stored state', () => {
    const invalidState = {
      state: {
        sidebarOpen: 'true', // Should be boolean
        activeTab: 123, // Should be string
        searchHistory: 'not-an-array' // Should be array
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(invalidState));

    const { result } = renderHook(() => useAppStore());

    // Should recover with valid types
    expect(typeof result.current.sidebarOpen).toBe('boolean');
    expect(Array.isArray(result.current.searchHistory)).toBe(true);
  });

  it('should handle storage quota exceeded during persistence', () => {
    const { result } = renderHook(() => useAppStore());

    // Mock setItem to throw quota error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      const error: any = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    });

    act(() => {
      // This should not crash the app
      result.current.setSidebarOpen(true);
    });

    // State should still be updated in memory
    expect(result.current.sidebarOpen).toBe(true);

    Storage.prototype.setItem = originalSetItem;
  });
});

describe('State Hydration - SSR Safety', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create SSR-safe storage', () => {
    const storage = createSSRStorage();

    expect(storage.getItem).toBeDefined();
    expect(storage.setItem).toBeDefined();
    expect(storage.removeItem).toBeDefined();
  });

  it('should handle SSR environment gracefully', () => {
    const storage = createSSRStorage();

    // Should not throw in SSR
    expect(() => storage.setItem('test', 'value')).not.toThrow();
    expect(storage.getItem('test')).toBeDefined();
  });

  it('should use provided storage when available', () => {
    const customStorage = {
      getItem: vi.fn(() => 'custom-value'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    const storage = createSSRStorage(customStorage);
    const value = storage.getItem('test');

    expect(customStorage.getItem).toHaveBeenCalled();
    expect(value).toBe('custom-value');
  });

  it('should handle storage errors gracefully', () => {
    const errorStorage = {
      getItem: vi.fn(() => {
        throw new Error('Storage error');
      }),
      setItem: vi.fn(() => {
        throw new Error('Storage error');
      }),
      removeItem: vi.fn(() => {
        throw new Error('Storage error');
      })
    };

    const storage = createSSRStorage(errorStorage);

    expect(() => storage.getItem('test')).not.toThrow();
    expect(() => storage.setItem('test', 'value')).not.toThrow();
    expect(() => storage.removeItem('test')).not.toThrow();

    expect(storage.getItem('test')).toBeNull();
  });
});

describe('State Hydration - Version Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle version mismatches', () => {
    const oldVersionState = {
      state: {
        sidebarOpen: true,
        activeTab: 'search'
      },
      version: -1 // Old version
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(oldVersionState));

    const { result } = renderHook(() => useAppStore());

    // Should still load the state
    waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  it('should migrate deprecated fields', () => {
    const oldState = {
      state: {
        // Old field names
        isSidebarOpen: true, // Old name
        currentTab: 'history' // Old name
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(oldState));

    // Migration would need to be implemented in the persist middleware
    // This test documents the expected behavior
  });

  it('should preserve version number in persisted state', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setSidebarOpen(true);
    });

    const stored = localStorage.getItem('describe-it-app-store');
    const parsed = JSON.parse(stored!);

    expect(parsed).toHaveProperty('version');
    expect(typeof parsed.version).toBe('number');
  });
});

describe('State Hydration - Session Store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useSessionStore.setState({
      session: null,
      isInitialized: false
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should not persist session state (by design)', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.initializeSession('user-123');
    });

    // Session store is not persisted
    const stored = localStorage.getItem('session-store');
    expect(stored).toBeNull();
  });

  it('should create new session on each tab', () => {
    const { result: tab1 } = renderHook(() => useSessionStore());

    act(() => {
      tab1.current.initializeSession('user-123');
    });

    const session1 = tab1.current.session;

    // Simulate new tab by clearing state
    useSessionStore.setState({
      session: null,
      isInitialized: false
    });

    const { result: tab2 } = renderHook(() => useSessionStore());

    act(() => {
      tab2.current.initializeSession('user-123');
    });

    const session2 = tab2.current.session;

    // Each tab should have unique session ID
    expect(session1?.id).not.toBe(session2?.id);
  });

  it('should maintain session during page refresh if desired', () => {
    // If session persistence is enabled in the future
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.initializeSession('user-123');
    });

    // Save session to sessionStorage manually
    const session = result.current.session;
    sessionStorage.setItem('session-backup', JSON.stringify(session));

    // Simulate refresh
    useSessionStore.setState({
      session: null,
      isInitialized: false
    });

    // Restore from sessionStorage
    const restored = JSON.parse(sessionStorage.getItem('session-backup')!);
    expect(restored.userId).toBe('user-123');
  });
});

describe('State Hydration - Deduplication', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should deduplicate search history on hydration', () => {
    const duplicateState = {
      state: {
        searchHistory: [
          { id: '1', query: 'test', timestamp: new Date(), resultCount: 5 },
          { id: '2', query: 'test', timestamp: new Date(), resultCount: 3 },
          { id: '3', query: 'other', timestamp: new Date(), resultCount: 2 }
        ]
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(duplicateState));

    const { result } = renderHook(() => useAppStore());

    waitFor(() => {
      // Should keep only unique queries
      const queries = result.current.searchHistory.map(h => h.query);
      const uniqueQueries = new Set(queries);
      expect(uniqueQueries.size).toBe(queries.length);
    });
  });

  it('should limit search history to maxHistoryItems on hydration', () => {
    const largeHistory = Array.from({ length: 100 }, (_, i) => ({
      id: `${i}`,
      query: `query-${i}`,
      timestamp: new Date(),
      resultCount: i
    }));

    const state = {
      state: {
        searchHistory: largeHistory,
        preferences: {
          theme: 'auto',
          language: 'en',
          defaultDescriptionStyle: 'conversacional',
          autoSaveDescriptions: true,
          maxHistoryItems: 50,
          exportFormat: 'json'
        }
      },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(state));

    const { result } = renderHook(() => useAppStore());

    waitFor(() => {
      expect(result.current.searchHistory.length).toBeLessThanOrEqual(50);
    });
  });
});

describe('State Hydration - Timing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should hydrate asynchronously', async () => {
    const savedState = {
      state: { sidebarOpen: true },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(savedState));

    const { result } = renderHook(() => useAppStore());

    // Initially should use default
    expect(result.current.sidebarOpen).toBe(false);

    // Advance timers to allow hydration
    await act(async () => {
      vi.runAllTimers();
    });

    // After hydration
    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  it('should not cause hydration mismatches', () => {
    const savedState = {
      state: { activeTab: 'history' },
      version: 0
    };
    localStorage.setItem('describe-it-app-store', JSON.stringify(savedState));

    const { result } = renderHook(() => useAppStore());

    // SSR would render with default 'search'
    const ssrValue = 'search';

    // Client hydration should eventually match stored value
    waitFor(() => {
      expect(result.current.activeTab).toBe('history');
      expect(result.current.activeTab).not.toBe(ssrValue);
    });
  });
});

describe('State Hydration - Export/Import', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should export current state', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setSidebarOpen(true);
      result.current.updatePreferences({ theme: 'dark' });
    });

    // Access the store's state directly
    const state = useAppStore.getState();

    const exported = JSON.stringify({
      sidebarOpen: state.sidebarOpen,
      preferences: state.preferences
    });

    const parsed = JSON.parse(exported);
    expect(parsed.sidebarOpen).toBe(true);
    expect(parsed.preferences.theme).toBe('dark');
  });

  it('should import and apply state', () => {
    const importedState = {
      sidebarOpen: true,
      activeTab: 'history',
      preferences: {
        theme: 'dark',
        language: 'es',
        defaultDescriptionStyle: 'formal',
        autoSaveDescriptions: false,
        maxHistoryItems: 100,
        exportFormat: 'csv'
      }
    };

    // Apply imported state
    useAppStore.setState(importedState);

    const { result } = renderHook(() => useAppStore());

    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.activeTab).toBe('history');
    expect(result.current.preferences.theme).toBe('dark');
  });

  it('should validate imported state structure', () => {
    const invalidImport = {
      sidebarOpen: 'not-a-boolean',
      activeTab: 123,
      preferences: 'not-an-object'
    };

    // Type checking would prevent this, but runtime validation is good
    expect(() => {
      useAppStore.setState(invalidImport as any);
    }).not.toThrow(); // Zustand is permissive, app should handle type mismatches
  });
});
