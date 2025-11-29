import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVocabulary } from '@/hooks/useVocabulary';
import { ReactNode } from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const QueryWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  QueryWrapper.displayName = 'QueryWrapper';
  return QueryWrapper;
};

describe('useVocabulary - Data Fetching', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should load vocabulary on mount when autoLoad is true', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('should not auto-load when autoLoad is false', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('should manually load vocabulary', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.items).toEqual([]);

    await act(async () => {
      await result.current.loadVocabulary();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('should update connection status during load', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    // Initial state may be 'connecting' or 'disconnected' depending on timing
    expect(['connecting', 'disconnected']).toContain(result.current.connectionStatus);

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected');
    }, { timeout: 2000 });

    expect(result.current.isConnected).toBe(true);
  });
});

describe('useVocabulary - Filtering', () => {
  it('should filter by search term', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.items.length;

    act(() => {
      result.current.search('casa');
    });

    await waitFor(() => {
      expect(result.current.items.length).toBeLessThanOrEqual(initialCount);
    });

    // Verify filtered results contain search term
    result.current.items.forEach(item => {
      const matchesSearch =
        item.spanish_text.toLowerCase().includes('casa') ||
        item.english_translation.toLowerCase().includes('casa');
      expect(matchesSearch).toBe(true);
    });
  });

  it('should filter by category', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('category', 'home');
    });

    await waitFor(() => {
      expect(result.current.items.every(item => item.category === 'home')).toBe(true);
    });
  });

  it('should filter by difficulty level', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('difficulty', 'beginner');
    });

    await waitFor(() => {
      const allBeginner = result.current.items.every(
        item => item.difficulty_level <= 3
      );
      expect(allBeginner).toBe(true);
    });
  });

  it('should filter by part of speech', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('partOfSpeech', 'noun');
    });

    await waitFor(() => {
      expect(result.current.items.every(item => item.part_of_speech === 'noun')).toBe(true);
    });
  });

  it('should clear all filters', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const allItemsCount = result.current.allItems.length;

    act(() => {
      result.current.setFilter('category', 'home');
      result.current.setFilter('difficulty', 'beginner');
    });

    await waitFor(() => {
      expect(result.current.items.length).toBeLessThan(allItemsCount);
    });

    act(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(allItemsCount);
    });
  });

  it('should track filter state', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasFilters).toBe(false);

    act(() => {
      result.current.setFilter('category', 'home');
    });

    await waitFor(() => {
      expect(result.current.hasFilters).toBe(true);
    });

    act(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(result.current.hasFilters).toBe(false);
    });
  });
});

describe('useVocabulary - Statistics', () => {
  it('should calculate total vocabulary count', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.total).toBeGreaterThan(0);
  });

  it('should calculate category distribution', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.byCategory).toBeDefined();
    expect(Object.keys(result.current.stats.byCategory).length).toBeGreaterThan(0);
  });

  it('should calculate difficulty distribution', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.byDifficulty).toBeDefined();
    expect(result.current.stats.byDifficulty.beginner).toBeGreaterThanOrEqual(0);
    expect(result.current.stats.byDifficulty.intermediate).toBeGreaterThanOrEqual(0);
    expect(result.current.stats.byDifficulty.advanced).toBeGreaterThanOrEqual(0);
  });

  it('should calculate average difficulty', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.averageDifficulty).toBeGreaterThan(0);
    expect(result.current.stats.averageDifficulty).toBeLessThanOrEqual(10);
  });
});

describe('useVocabulary - CRUD Operations', () => {
  it('should add new vocabulary item', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.items.length;

    await act(async () => {
      await result.current.addItem({
        spanish_text: 'nuevo',
        english_translation: 'new',
        category: 'adjectives',
        difficulty_level: 2,
        part_of_speech: 'adjective',
        frequency_score: 85,
      });
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(initialCount + 1);
    });
  });

  it('should update vocabulary item', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const itemToUpdate = result.current.items[0];
    const newTranslation = 'updated translation';

    await act(async () => {
      await result.current.updateItem(itemToUpdate.id, {
        english_translation: newTranslation,
      });
    });

    await waitFor(() => {
      const updatedItem = result.current.items.find(i => i.id === itemToUpdate.id);
      expect(updatedItem?.english_translation).toBe(newTranslation);
    });
  });

  it('should remove vocabulary item', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.items.length;
    const itemToRemove = result.current.items[0];

    await act(async () => {
      await result.current.removeItem(itemToRemove.id);
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(initialCount - 1);
      expect(result.current.items.find(i => i.id === itemToRemove.id)).toBeUndefined();
    });
  });

  it('should add bulk items', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.items.length;
    const bulkItems = [
      {
        spanish_text: 'uno',
        english_translation: 'one',
        category: 'numbers',
        difficulty_level: 1,
        part_of_speech: 'noun' as const,
        frequency_score: 100,
      },
      {
        spanish_text: 'dos',
        english_translation: 'two',
        category: 'numbers',
        difficulty_level: 1,
        part_of_speech: 'noun' as const,
        frequency_score: 100,
      },
    ];

    await act(async () => {
      await result.current.addBulkItems(bulkItems);
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(initialCount + 2);
    });
  });

  it('should remove bulk items', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const idsToRemove = result.current.items.slice(0, 2).map(i => i.id);
    const initialCount = result.current.items.length;

    await act(async () => {
      await result.current.removeBulkItems(idsToRemove);
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(initialCount - 2);
    });
  });
});

describe('useVocabulary - Utility Functions', () => {
  it('should get unique categories', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const categories = result.current.getUniqueCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it('should get unique difficulties', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const difficulties = result.current.getUniqueDifficulties();
    expect(Array.isArray(difficulties)).toBe(true);
    expect(difficulties).toEqual([...difficulties].sort((a, b) => a - b));
  });

  it('should get unique parts of speech', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const partsOfSpeech = result.current.getUniquePartsOfSpeech();
    expect(Array.isArray(partsOfSpeech)).toBe(true);
    expect(partsOfSpeech.length).toBeGreaterThan(0);
  });
});

describe('useVocabulary - Export Functionality', () => {
  it('should export vocabulary to CSV', async () => {
    const { result } = renderHook(
      () => useVocabulary({ autoLoad: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock URL.createObjectURL, URL.revokeObjectURL and document.createElement
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag: string) => {
      const element = originalCreateElement.call(document, tag);
      if (tag === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    act(() => {
      result.current.exportToCSV();
    });

    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
});
