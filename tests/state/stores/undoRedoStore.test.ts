import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedoStore } from '@/lib/store/undoRedoStore';

describe('UndoRedoStore', () => {
  beforeEach(() => {
    useUndoRedoStore.setState({
      branches: new Map([
        [
          'main',
          {
            id: 'main',
            name: 'Main',
            entries: [],
            createdAt: new Date(),
          },
        ],
      ]),
      currentBranchId: 'main',
      currentIndex: -1,
      config: {
        maxHistorySize: 100,
        compressionThreshold: 1024 * 10,
        autoCleanupMs: 1000 * 60 * 60 * 24,
        trackingStrategies: {},
        selectiveProps: {},
        groupingEnabled: true,
        groupingTimeoutMs: 500,
      },
      registeredStores: new Map(),
      currentGroup: null,
    });
  });

  describe('Store Registration', () => {
    it('should register a store', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const mockStore = {
        getState: vi.fn(() => ({ count: 0 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      act(() => {
        result.current.registerStore('testStore', mockStore, 'full');
      });

      expect(result.current.registeredStores.has('testStore')).toBe(true);
      expect(result.current.config.trackingStrategies.testStore).toBe('full');
    });

    it('should unregister a store', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const mockStore = {
        getState: vi.fn(() => ({ count: 0 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      act(() => {
        result.current.registerStore('testStore', mockStore);
        result.current.unregisterStore('testStore');
      });

      expect(result.current.registeredStores.has('testStore')).toBe(false);
    });
  });

  describe('History Management', () => {
    it('should record state change', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current._recordEntry(
          'testStore',
          'increment',
          { count: 0 },
          { count: 1 }
        );
      });

      const branch = result.current.branches.get('main');
      expect(branch?.entries).toHaveLength(1);
      expect(branch?.entries[0].actionName).toBe('increment');
    });

    it('should check if can undo', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      expect(result.current.canUndo()).toBe(false);

      act(() => {
        result.current._recordEntry(
          'testStore',
          'increment',
          { count: 0 },
          { count: 1 }
        );
      });

      expect(result.current.canUndo()).toBe(true);
    });

    it('should check if can redo', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current._recordEntry(
          'testStore',
          'increment',
          { count: 0 },
          { count: 1 }
        );
      });

      expect(result.current.canRedo()).toBe(false);
    });

    it('should get history size', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current._recordEntry('testStore', 'action1', {}, {});
        result.current._recordEntry('testStore', 'action2', {}, {});
        result.current._recordEntry('testStore', 'action3', {}, {});
      });

      expect(result.current.getHistorySize()).toBe(3);
    });

    it('should filter history by store', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current._recordEntry('store1', 'action1', {}, {});
        result.current._recordEntry('store2', 'action2', {}, {});
        result.current._recordEntry('store1', 'action3', {}, {});
      });

      const store1History = result.current.getHistory('store1');
      expect(store1History).toHaveLength(2);
    });

    it('should limit history size', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        useUndoRedoStore.setState({
          config: {
            ...result.current.config,
            maxHistorySize: 5,
          },
        });

        for (let i = 0; i < 10; i++) {
          result.current._recordEntry('testStore', `action-${i}`, {}, {});
        }
      });

      expect(result.current.getHistorySize()).toBeLessThanOrEqual(5);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current._recordEntry('testStore', 'action1', {}, {});
        result.current._recordEntry('testStore', 'action2', {}, {});
        result.current.clearHistory();
      });

      expect(result.current.getHistorySize()).toBe(0);
    });

    it('should clear history for specific store', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current._recordEntry('store1', 'action1', {}, {});
        result.current._recordEntry('store2', 'action2', {}, {});
        result.current.clearHistory('store1');
      });

      expect(result.current.getHistory('store1')).toHaveLength(0);
      expect(result.current.getHistory('store2')).toHaveLength(1);
    });
  });

  describe('Undo/Redo Operations', () => {
    it('should undo action', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const mockStore = {
        getState: vi.fn(() => ({ count: 1 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      act(() => {
        result.current.registerStore('testStore', mockStore);
        result.current._recordEntry(
          'testStore',
          'increment',
          { count: 0 },
          { count: 1 }
        );

        const success = result.current.undo();
        expect(success).toBe(true);
      });

      expect(mockStore.setState).toHaveBeenCalledWith(
        { count: 0 },
        'undo:increment'
      );
    });

    it('should redo action', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const mockStore = {
        getState: vi.fn(() => ({ count: 0 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      act(() => {
        result.current.registerStore('testStore', mockStore);
        result.current._recordEntry(
          'testStore',
          'increment',
          { count: 0 },
          { count: 1 }
        );

        result.current.undo();
        const success = result.current.redo();
        expect(success).toBe(true);
      });

      expect(mockStore.setState).toHaveBeenCalledWith(
        { count: 1 },
        'redo:increment'
      );
    });

    it('should undo for specific store', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const mockStore1 = {
        getState: vi.fn(() => ({ value: 1 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      const mockStore2 = {
        getState: vi.fn(() => ({ value: 2 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      act(() => {
        result.current.registerStore('store1', mockStore1);
        result.current.registerStore('store2', mockStore2);

        result.current._recordEntry('store1', 'action', { value: 0 }, { value: 1 });
        result.current._recordEntry('store2', 'action', { value: 0 }, { value: 2 });

        result.current.undo('store1');
      });

      expect(mockStore1.setState).toHaveBeenCalled();
      expect(mockStore2.setState).not.toHaveBeenCalled();
    });
  });

  describe('Branch Management', () => {
    it('should create new branch', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      let branchId: string;

      act(() => {
        branchId = result.current.createBranch('feature-branch');
      });

      expect(result.current.branches.has(branchId!)).toBe(true);
    });

    it('should switch to different branch', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      let branchId: string;

      act(() => {
        branchId = result.current.createBranch('test-branch');
        const success = result.current.switchBranch(branchId);
        expect(success).toBe(true);
      });

      expect(result.current.currentBranchId).toBe(branchId!);
    });

    it('should delete branch', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      let branchId: string;

      act(() => {
        branchId = result.current.createBranch('temp-branch');
        result.current.deleteBranch(branchId);
      });

      expect(result.current.branches.has(branchId!)).toBe(false);
    });

    it('should not delete main branch', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current.deleteBranch('main');
      });

      expect(result.current.branches.has('main')).toBe(true);
    });

    it('should merge branches', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      let sourceBranchId: string;

      act(() => {
        sourceBranchId = result.current.createBranch('source');
        result.current.switchBranch(sourceBranchId);
        result.current._recordEntry('testStore', 'action', {}, {});

        result.current.switchBranch('main');
        const success = result.current.mergeBranch(sourceBranchId, 'main');
        expect(success).toBe(true);
      });

      const mainBranch = result.current.branches.get('main');
      expect(mainBranch!.entries.length).toBeGreaterThan(0);
    });
  });

  describe('Tracking Strategies', () => {
    it('should track full state', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const fullState = { count: 5, name: 'Test', items: [1, 2, 3] };

      const tracked = result.current._extractTrackedState('testStore', fullState);

      expect(tracked).toEqual(fullState);
    });

    it('should track selective properties', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        useUndoRedoStore.setState({
          config: {
            ...result.current.config,
            trackingStrategies: { testStore: 'selective' },
            selectiveProps: { testStore: ['count', 'name'] },
          },
        });
      });

      const fullState = { count: 5, name: 'Test', items: [1, 2, 3] };

      const tracked = result.current._extractTrackedState('testStore', fullState);

      expect(tracked).toEqual({ count: 5, name: 'Test' });
      expect(tracked.items).toBeUndefined();
    });

    it('should not track when strategy is none', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        useUndoRedoStore.setState({
          config: {
            ...result.current.config,
            trackingStrategies: { testStore: 'none' },
          },
        });
      });

      const shouldTrack = result.current._shouldTrack('testStore');

      expect(shouldTrack).toBe(false);
    });
  });

  describe('Jump to Entry', () => {
    it('should jump to specific history entry', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const mockStore = {
        getState: vi.fn(() => ({ count: 0 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      let targetEntryId: string;

      act(() => {
        result.current.registerStore('testStore', mockStore);

        result.current._recordEntry('testStore', 'action1', { count: 0 }, { count: 1 });
        result.current._recordEntry('testStore', 'action2', { count: 1 }, { count: 2 });
        result.current._recordEntry('testStore', 'action3', { count: 2 }, { count: 3 });

        const branch = result.current.branches.get('main');
        targetEntryId = branch!.entries[1].id; // Second entry

        const success = result.current.jumpToEntry(targetEntryId);
        expect(success).toBe(true);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it('should get state at timestamp', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const now = new Date();
      const later = new Date(now.getTime() + 10000);

      act(() => {
        result.current._recordEntry(
          'testStore',
          'action1',
          { count: 0 },
          { count: 1 }
        );

        // Manually set timestamp for second entry
        const branch = result.current.branches.get('main')!;
        branch.entries[0].timestamp = later;
      });

      const state = result.current.getStateAt(later, 'testStore');

      expect(state).toEqual({ count: 1 });
    });
  });

  describe('Action Grouping', () => {
    it('should start action group', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current.startGroup('Batch Edit');
      });

      expect(result.current.currentGroup).not.toBeNull();
    });

    it('should end action group', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      act(() => {
        result.current.startGroup('Batch Edit');
        result.current.endGroup();
      });

      expect(result.current.currentGroup).toBeNull();
    });
  });

  describe('State Compression', () => {
    it('should compress large entries', () => {
      const { result } = renderHook(() => useUndoRedoStore());

      const largeState = {
        data: 'x'.repeat(20000), // Large data
      };

      const entry = {
        id: 'test',
        timestamp: new Date(),
        storeKey: 'testStore',
        actionName: 'test',
        previousState: {},
        nextState: largeState,
        duration: 1,
      };

      const compressed = result.current._compressEntry(entry);

      expect(compressed.compressed).toBe(true);
      expect(typeof compressed.nextState).toBe('string'); // Compressed to string
    });
  });
});
