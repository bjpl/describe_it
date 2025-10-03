import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/lib/store/appStore';
import type { Image, UserPreferences, SearchHistoryItem } from '@/types';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAppStore.setState({
      currentImage: null,
      sidebarOpen: false,
      activeTab: 'search',
      isFullscreen: false,
      preferences: {
        theme: 'auto',
        language: 'en',
        defaultDescriptionStyle: 'conversacional',
        autoSaveDescriptions: true,
        maxHistoryItems: 50,
        exportFormat: 'json',
      },
      searchHistory: [],
      isLoading: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.currentImage).toBeNull();
      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.activeTab).toBe('search');
      expect(result.current.isFullscreen).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchHistory).toEqual([]);
    });

    it('should have default preferences', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.preferences).toEqual({
        theme: 'auto',
        language: 'en',
        defaultDescriptionStyle: 'conversacional',
        autoSaveDescriptions: true,
        maxHistoryItems: 50,
        exportFormat: 'json',
      });
    });
  });

  describe('Current Image Management', () => {
    it('should set current image', () => {
      const { result } = renderHook(() => useAppStore());
      const mockImage: Image = {
        id: 'test-1',
        url: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        altText: 'Test image',
        width: 800,
        height: 600,
      };

      act(() => {
        result.current.setCurrentImage(mockImage);
      });

      expect(result.current.currentImage).toEqual(mockImage);
    });

    it('should clear current image', () => {
      const { result } = renderHook(() => useAppStore());
      const mockImage: Image = {
        id: 'test-1',
        url: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        altText: 'Test image',
        width: 800,
        height: 600,
      };

      act(() => {
        result.current.setCurrentImage(mockImage);
        result.current.setCurrentImage(null);
      });

      expect(result.current.currentImage).toBeNull();
    });
  });

  describe('Sidebar State', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should set sidebar open state directly', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);
    });
  });

  describe('Active Tab Management', () => {
    it('should set active tab', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setActiveTab('history');
      });

      expect(result.current.activeTab).toBe('history');

      act(() => {
        result.current.setActiveTab('settings');
      });

      expect(result.current.activeTab).toBe('settings');
    });
  });

  describe('Fullscreen Mode', () => {
    it('should toggle fullscreen', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleFullscreen();
      });

      expect(result.current.isFullscreen).toBe(true);

      act(() => {
        result.current.toggleFullscreen();
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it('should set fullscreen directly', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setFullscreen(true);
      });

      expect(result.current.isFullscreen).toBe(true);

      act(() => {
        result.current.setFullscreen(false);
      });

      expect(result.current.isFullscreen).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should update preferences partially', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePreferences({ theme: 'dark' });
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.language).toBe('en'); // Other props unchanged
    });

    it('should update multiple preference fields', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePreferences({
          theme: 'light',
          language: 'es',
          maxHistoryItems: 100,
        });
      });

      expect(result.current.preferences.theme).toBe('light');
      expect(result.current.preferences.language).toBe('es');
      expect(result.current.preferences.maxHistoryItems).toBe(100);
    });
  });

  describe('Search History', () => {
    it('should add item to history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory({
          query: 'sunset',
          timestamp: new Date(),
          resultCount: 10,
        });
      });

      expect(result.current.searchHistory).toHaveLength(1);
      expect(result.current.searchHistory[0].query).toBe('sunset');
      expect(result.current.searchHistory[0]).toHaveProperty('id');
    });

    it('should prevent duplicate search queries', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory({
          query: 'sunset',
          timestamp: new Date(),
          resultCount: 10,
        });
        result.current.addToHistory({
          query: 'sunset',
          timestamp: new Date(),
          resultCount: 5,
        });
      });

      expect(result.current.searchHistory).toHaveLength(1);
      expect(result.current.searchHistory[0].resultCount).toBe(5); // Latest one
    });

    it('should maintain max history items limit', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePreferences({ maxHistoryItems: 3 });

        for (let i = 0; i < 5; i++) {
          result.current.addToHistory({
            query: `search-${i}`,
            timestamp: new Date(),
            resultCount: i,
          });
        }
      });

      expect(result.current.searchHistory.length).toBeLessThanOrEqual(3);
    });

    it('should clear all history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory({
          query: 'sunset',
          timestamp: new Date(),
          resultCount: 10,
        });
        result.current.addToHistory({
          query: 'ocean',
          timestamp: new Date(),
          resultCount: 5,
        });
        result.current.clearHistory();
      });

      expect(result.current.searchHistory).toHaveLength(0);
    });

    it('should remove specific history item', () => {
      const { result } = renderHook(() => useAppStore());

      let itemId: string;

      act(() => {
        result.current.addToHistory({
          query: 'sunset',
          timestamp: new Date(),
          resultCount: 10,
        });
        result.current.addToHistory({
          query: 'ocean',
          timestamp: new Date(),
          resultCount: 5,
        });

        itemId = result.current.searchHistory[0].id;
      });

      act(() => {
        result.current.removeFromHistory(itemId!);
      });

      expect(result.current.searchHistory).toHaveLength(1);
      expect(result.current.searchHistory.find(item => item.id === itemId)).toBeUndefined();
    });
  });

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Test error');
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should select current image', () => {
      const mockImage: Image = {
        id: 'test-1',
        url: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        altText: 'Test image',
        width: 800,
        height: 600,
      };

      act(() => {
        useAppStore.setState({ currentImage: mockImage });
      });

      const currentImage = useAppStore.getState().currentImage;
      expect(currentImage).toEqual(mockImage);
    });

    it('should select preferences', () => {
      act(() => {
        useAppStore.setState({
          preferences: {
            theme: 'dark',
            language: 'es',
            defaultDescriptionStyle: 'formal',
            autoSaveDescriptions: false,
            maxHistoryItems: 25,
            exportFormat: 'csv',
          },
        });
      });

      const preferences = useAppStore.getState().preferences;
      expect(preferences.theme).toBe('dark');
      expect(preferences.language).toBe('es');
    });
  });
});
