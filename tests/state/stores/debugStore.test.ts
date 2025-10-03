import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebugStore } from '@/lib/store/debugStore';

describe('DebugStore', () => {
  beforeEach(() => {
    useDebugStore.setState({
      isEnabled: true,
      monitoredStores: new Set(),
      actionLogs: [],
      maxLogSize: 1000,
      performanceMetrics: new Map(),
      isPerformanceMonitoringEnabled: true,
      registeredStores: new Map(),
      isReplaying: false,
      replaySpeed: 1,
      currentReplayIndex: 0,
      snapshots: new Map(),
    });
  });

  describe('Debug State Management', () => {
    it('should enable debug mode', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current.disable();
        result.current.enable();
      });

      expect(result.current.isEnabled).toBe(true);
    });

    it('should disable debug mode', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current.disable();
      });

      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('Store Registration', () => {
    it('should register a store', () => {
      const { result } = renderHook(() => useDebugStore());

      const mockStore = {
        getState: vi.fn(() => ({ count: 0 })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      };

      act(() => {
        result.current.registerStore('testStore', mockStore, {
          name: 'Test Store',
          version: '1.0.0',
        });
      });

      expect(result.current.registeredStores.has('testStore')).toBe(true);
    });

    it('should unregister a store', () => {
      const { result } = renderHook(() => useDebugStore());

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

  describe('Store Monitoring', () => {
    it('should start monitoring a store', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current.startMonitoring('testStore');
      });

      expect(result.current.monitoredStores.has('testStore')).toBe(true);
    });

    it('should stop monitoring a store', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current.startMonitoring('testStore');
        result.current.stopMonitoring('testStore');
      });

      expect(result.current.monitoredStores.has('testStore')).toBe(false);
    });
  });

  describe('Action Logging', () => {
    it('should log actions', () => {
      const { result } = renderHook(() => useDebugStore());

      const mockLog = {
        id: 'test-1',
        timestamp: new Date(),
        storeKey: 'testStore',
        actionName: 'increment',
        previousState: { count: 0 },
        nextState: { count: 1 },
        duration: 5,
      };

      act(() => {
        result.current._logAction(mockLog);
      });

      expect(result.current.actionLogs).toHaveLength(1);
      expect(result.current.actionLogs[0].actionName).toBe('increment');
    });

    it('should maintain max log size', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        useDebugStore.setState({ maxLogSize: 5 });

        for (let i = 0; i < 10; i++) {
          result.current._logAction({
            id: `log-${i}`,
            timestamp: new Date(),
            storeKey: 'testStore',
            actionName: `action-${i}`,
            previousState: {},
            nextState: {},
            duration: 1,
          });
        }
      });

      expect(result.current.actionLogs.length).toBeLessThanOrEqual(5);
    });

    it('should clear all logs', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current._logAction({
          id: 'test-1',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'test',
          previousState: {},
          nextState: {},
          duration: 1,
        });

        result.current.clearLogs();
      });

      expect(result.current.actionLogs).toHaveLength(0);
    });

    it('should clear logs for specific store', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current._logAction({
          id: 'test-1',
          timestamp: new Date(),
          storeKey: 'store1',
          actionName: 'action1',
          previousState: {},
          nextState: {},
          duration: 1,
        });

        result.current._logAction({
          id: 'test-2',
          timestamp: new Date(),
          storeKey: 'store2',
          actionName: 'action2',
          previousState: {},
          nextState: {},
          duration: 1,
        });

        result.current.clearLogs('store1');
      });

      expect(result.current.actionLogs).toHaveLength(1);
      expect(result.current.actionLogs[0].storeKey).toBe('store2');
    });
  });

  describe('Performance Metrics', () => {
    it('should update performance metrics', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        // Initialize metrics for store
        const performanceMetrics = new Map();
        performanceMetrics.set('testStore', {
          storeKey: 'testStore',
          actionCounts: {},
          averageDurations: {},
          maxDurations: {},
          memoryUsage: 0,
          lastUpdated: new Date(),
          subscriptionCount: 0,
          rerenderCount: 0,
        });

        useDebugStore.setState({ performanceMetrics });

        result.current._updatePerformanceMetrics('testStore', 'increment', 10);
        result.current._updatePerformanceMetrics('testStore', 'increment', 20);
      });

      const metrics = result.current.performanceMetrics.get('testStore');
      expect(metrics?.actionCounts.increment).toBe(2);
      expect(metrics?.averageDurations.increment).toBe(15);
      expect(metrics?.maxDurations.increment).toBe(20);
    });

    it('should find slow actions', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current._logAction({
          id: 'fast',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'fast',
          previousState: {},
          nextState: {},
          duration: 5,
        });

        result.current._logAction({
          id: 'slow',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'slow',
          previousState: {},
          nextState: {},
          duration: 150,
        });
      });

      const slowActions = result.current.findSlowActions(100);

      expect(slowActions).toHaveLength(1);
      expect(slowActions[0].actionName).toBe('slow');
    });
  });

  describe('State Snapshots', () => {
    it('should create state snapshot', () => {
      const { result } = renderHook(() => useDebugStore());

      const testState = { count: 5, user: 'John' };

      act(() => {
        result.current._createSnapshot('testStore', testState);
      });

      const snapshots = result.current.snapshots.get('testStore');
      expect(snapshots).toBeDefined();
      expect(snapshots!.length).toBeGreaterThan(0);
    });

    it('should limit snapshots per store', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current._createSnapshot('testStore', { count: i });
        }
      });

      const snapshots = result.current.snapshots.get('testStore');
      expect(snapshots!.length).toBeLessThanOrEqual(50);
    });

    it('should get state history', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current._createSnapshot('testStore', { count: i });
        }
      });

      const history = result.current.getStateHistory('testStore', 3);

      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Search Functionality', () => {
    it('should search logs by action name', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current._logAction({
          id: '1',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'incrementCounter',
          previousState: {},
          nextState: {},
          duration: 1,
        });

        result.current._logAction({
          id: '2',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'decrementCounter',
          previousState: {},
          nextState: {},
          duration: 1,
        });
      });

      const results = result.current.searchLogs('increment');

      expect(results).toHaveLength(1);
      expect(results[0].actionName).toBe('incrementCounter');
    });

    it('should filter search by store', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current._logAction({
          id: '1',
          timestamp: new Date(),
          storeKey: 'store1',
          actionName: 'test',
          previousState: {},
          nextState: {},
          duration: 1,
        });

        result.current._logAction({
          id: '2',
          timestamp: new Date(),
          storeKey: 'store2',
          actionName: 'test',
          previousState: {},
          nextState: {},
          duration: 1,
        });
      });

      const results = result.current.searchLogs('test', 'store1');

      expect(results).toHaveLength(1);
      expect(results[0].storeKey).toBe('store1');
    });
  });

  describe('Export/Import', () => {
    it('should export debug data', () => {
      const { result } = renderHook(() => useDebugStore());

      act(() => {
        result.current._logAction({
          id: 'test-1',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'test',
          previousState: {},
          nextState: {},
          duration: 1,
        });
      });

      const exportData = result.current.exportDebugData();

      expect(exportData).toBeTruthy();
      const parsed = JSON.parse(exportData);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.logs).toBeDefined();
    });

    it('should import debug data', () => {
      const { result } = renderHook(() => useDebugStore());

      const mockData = JSON.stringify({
        metadata: {
          version: '1.0.0',
          stores: ['testStore'],
        },
        logs: [
          {
            id: 'imported-1',
            timestamp: new Date().toISOString(),
            storeKey: 'testStore',
            actionName: 'imported',
            duration: 1,
          },
        ],
        performanceMetrics: {},
        snapshots: {},
      });

      act(() => {
        result.current.importDebugData(mockData);
      });

      expect(result.current.actionLogs.length).toBeGreaterThan(0);
    });
  });

  describe('State Diff Calculation', () => {
    it('should calculate state changes', () => {
      const { result } = renderHook(() => useDebugStore());

      const oldState = { count: 0, name: 'John' };
      const newState = { count: 5, name: 'John', age: 30 };

      const diffs = result.current._calculateStateDiff(oldState, newState);

      expect(diffs.length).toBeGreaterThan(0);
      const countDiff = diffs.find(d => d.path[0] === 'count');
      const ageDiff = diffs.find(d => d.path[0] === 'age');

      expect(countDiff?.type).toBe('changed');
      expect(ageDiff?.type).toBe('added');
    });

    it('should detect removed properties', () => {
      const { result } = renderHook(() => useDebugStore());

      const oldState = { count: 0, name: 'John', age: 30 };
      const newState = { count: 0, name: 'John' };

      const diffs = result.current._calculateStateDiff(oldState, newState);

      const ageDiff = diffs.find(d => d.path[0] === 'age');
      expect(ageDiff?.type).toBe('removed');
    });
  });

  describe('Replay Functionality', () => {
    it('should start replay', async () => {
      const { result } = renderHook(() => useDebugStore());

      const mockLogs = [
        {
          id: '1',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'action1',
          previousState: { count: 0 },
          nextState: { count: 1 },
          duration: 1,
        },
      ];

      await act(async () => {
        await result.current.startReplay(mockLogs, 10); // Fast replay
      });

      expect(result.current.isReplaying).toBe(true);
    });

    it('should stop replay', async () => {
      const { result } = renderHook(() => useDebugStore());

      const mockLogs = [
        {
          id: '1',
          timestamp: new Date(),
          storeKey: 'testStore',
          actionName: 'action1',
          previousState: {},
          nextState: {},
          duration: 1,
        },
      ];

      await act(async () => {
        await result.current.startReplay(mockLogs);
        result.current.stopReplay();
      });

      expect(result.current.isReplaying).toBe(false);
    });
  });
});
