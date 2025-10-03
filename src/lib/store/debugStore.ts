import React from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createShallowSelector } from '../utils/storeUtils';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

/**
 * Debug Store - Advanced debugging and monitoring for Zustand stores
 * Features:
 * - Real-time state monitoring
 * - Action tracking and replay
 * - Performance metrics
 * - State diff visualization
 * - Memory usage tracking
 * - Export/import functionality
 * - Time-travel debugging
 * - Store dependency mapping
 */

export interface ActionLog {
  id: string;
  timestamp: Date;
  storeKey: string;
  actionName: string;
  previousState: any;
  nextState: any;
  duration: number;
  stackTrace?: string;
  metadata?: {
    component?: string;
    userId?: string;
    sessionId?: string;
  };
}

export interface PerformanceMetrics {
  storeKey: string;
  actionCounts: Record<string, number>;
  averageDurations: Record<string, number>;
  maxDurations: Record<string, number>;
  memoryUsage: number;
  lastUpdated: Date;
  subscriptionCount: number;
  rerenderCount: number;
}

export interface StateDiff {
  path: string[];
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'changed';
}

interface DebugState {
  // Monitoring
  isEnabled: boolean;
  monitoredStores: Set<string>;
  actionLogs: ActionLog[];
  maxLogSize: number;

  // Performance
  performanceMetrics: Map<string, PerformanceMetrics>;
  isPerformanceMonitoringEnabled: boolean;

  // Registered stores
  registeredStores: Map<string, {
    getState: () => any;
    setState: (state: any, actionName?: string) => void;
    subscribe: (callback: (state: any, actionName?: string) => void) => () => void;
    name: string;
    version?: string;
  }>;

  // Replay functionality
  isReplaying: boolean;
  replaySpeed: number; // 1 = normal speed
  currentReplayIndex: number;

  // State snapshots for time travel
  snapshots: Map<string, { timestamp: Date; state: any }[]>;

  // Actions
  enable: () => void;
  disable: () => void;
  registerStore: (
    storeKey: string,
    storeInterface: any,
    options?: { name?: string; version?: string }
  ) => void;
  unregisterStore: (storeKey: string) => void;

  // Monitoring
  startMonitoring: (storeKey: string) => void;
  stopMonitoring: (storeKey: string) => void;
  clearLogs: (storeKey?: string) => void;

  // Replay
  startReplay: (logs: ActionLog[], speed?: number) => Promise<void>;
  stopReplay: () => void;
  pauseReplay: () => void;
  resumeReplay: () => void;

  // Analysis
  getStateDiff: (storeKey: string, fromTimestamp: Date, toTimestamp: Date) => StateDiff[];
  getPerformanceReport: (storeKey?: string) => PerformanceMetrics[];
  findSlowActions: (threshold: number, storeKey?: string) => ActionLog[];

  // Export/Import
  exportDebugData: (options?: { includeStates?: boolean; timeRange?: [Date, Date] }) => string;
  importDebugData: (data: string) => void;

  // State inspection
  getStateHistory: (storeKey: string, limit?: number) => any[];
  searchLogs: (query: string, storeKey?: string) => ActionLog[];

  // Internal methods
  _logAction: (log: ActionLog) => void;
  _updatePerformanceMetrics: (storeKey: string, actionName: string, duration: number) => void;
  _createSnapshot: (storeKey: string, state: any) => void;
  _calculateStateDiff: (oldState: any, newState: any, path?: string[]) => StateDiff[];
}

// Utility functions\nconst getStackTrace = (): string => {\n  try {\n    throw new Error();\n  } catch (e) {\n    return (e as Error).stack?.split('\\n').slice(3, 8).join('\\n') || '';\n  }\n};\n\nconst calculateObjectSize = (obj: any): number => {\n  try {\n    return safeStringify(obj).length;\n  } catch {\n    return 0;\n  }\n};\n\nconst deepEqual = (a: any, b: any): boolean => {\n  if (a === b) return true;\n  if (a == null || b == null) return false;\n  if (typeof a !== typeof b) return false;\n  \n  if (typeof a === 'object') {\n    const keysA = Object.keys(a);\n    const keysB = Object.keys(b);\n    \n    if (keysA.length !== keysB.length) return false;\n    \n    for (const key of keysA) {\n      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {\n        return false;\n      }\n    }\n  }\n  \n  return true;\n};\n\nexport const useDebugStore = create<DebugState>()(  \n  devtools(\n    subscribeWithSelector(\n      (set, get) => {\n        let replayTimeout: NodeJS.Timeout | null = null;\n        \n        return {\n          isEnabled: process.env.NODE_ENV === 'development',\n          monitoredStores: new Set(),\n          actionLogs: [],\n          maxLogSize: 1000,\n          performanceMetrics: new Map(),\n          isPerformanceMonitoringEnabled: true,\n          registeredStores: new Map(),\n          isReplaying: false,\n          replaySpeed: 1,\n          currentReplayIndex: 0,\n          snapshots: new Map(),\n          \n          enable: () => {\n            set({ isEnabled: true }, false, 'debug:enable');\n          },\n          \n          disable: () => {\n            set({ isEnabled: false }, false, 'debug:disable');\n          },\n          \n          registerStore: (storeKey, storeInterface, options = {}) => {\n            const state = get();\n            if (!state.isEnabled) return;\n            \n            const registeredStores = new Map(state.registeredStores);\n            registeredStores.set(storeKey, {\n              ...storeInterface,\n              name: options.name || storeKey,\n              version: options.version\n            });\n            \n            // Subscribe to store changes\n            let previousState = storeInterface.getState();\n            const unsubscribe = storeInterface.subscribe((newState: any, actionName?: string) => {\n              const currentState = get();\n              if (!currentState.isEnabled || !currentState.monitoredStores.has(storeKey)) {\n                previousState = newState;\n                return;\n              }\n              \n              const startTime = performance.now();\n              \n              // Create action log\n              const actionLog: ActionLog = {\n                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,\n                timestamp: new Date(),\n                storeKey,\n                actionName: actionName || 'unknown',\n                previousState: safeParse(safeStringify(previousState)),\n                nextState: safeParse(safeStringify(newState)),\n                duration: performance.now() - startTime,\n                stackTrace: getStackTrace(),\n                metadata: {\n                  // Extract component info from stack if possible\n                  component: actionName?.includes(':') ? actionName.split(':')[0] : undefined\n                }\n              };\n              \n              currentState._logAction(actionLog);\n              currentState._updatePerformanceMetrics(storeKey, actionName || 'unknown', actionLog.duration);\n              currentState._createSnapshot(storeKey, newState);\n              \n              previousState = newState;\n            });\n            \n            // Store cleanup function\n            registeredStores.set(storeKey, {\n              ...registeredStores.get(storeKey)!,\n              _unsubscribe: unsubscribe\n            });\n            \n            set({ registeredStores }, false, 'debug:registerStore');\n            \n            // Initialize performance metrics\n            if (state.isPerformanceMonitoringEnabled) {\n              const performanceMetrics = new Map(state.performanceMetrics);\n              performanceMetrics.set(storeKey, {\n                storeKey,\n                actionCounts: {},\n                averageDurations: {},\n                maxDurations: {},\n                memoryUsage: calculateObjectSize(storeInterface.getState()),\n                lastUpdated: new Date(),\n                subscriptionCount: 1,\n                rerenderCount: 0\n              });\n              \n              set({ performanceMetrics }, false, 'debug:initMetrics');\n            }\n          },\n          \n          unregisterStore: (storeKey) => {\n            const state = get();\n            const storeInterface = state.registeredStores.get(storeKey);\n            \n            if (storeInterface && (storeInterface as any)._unsubscribe) {\n              (storeInterface as any)._unsubscribe();\n            }\n            \n            const newRegisteredStores = new Map(state.registeredStores);\n            newRegisteredStores.delete(storeKey);\n            \n            const newMonitoredStores = new Set(state.monitoredStores);\n            newMonitoredStores.delete(storeKey);\n            \n            set({ \n              registeredStores: newRegisteredStores,\n              monitoredStores: newMonitoredStores\n            }, false, 'debug:unregisterStore');\n          },\n          \n          startMonitoring: (storeKey) => {\n            set((state) => ({\n              monitoredStores: new Set(state.monitoredStores).add(storeKey)\n            }), false, 'debug:startMonitoring');\n          },\n          \n          stopMonitoring: (storeKey) => {\n            set((state) => {\n              const newMonitoredStores = new Set(state.monitoredStores);\n              newMonitoredStores.delete(storeKey);\n              return { monitoredStores: newMonitoredStores };\n            }, false, 'debug:stopMonitoring');\n          },\n          \n          clearLogs: (storeKey) => {\n            set((state) => ({\n              actionLogs: storeKey \n                ? state.actionLogs.filter(log => log.storeKey !== storeKey)\n                : []\n            }), false, 'debug:clearLogs');\n          },\n          \n          startReplay: async (logs, speed = 1) => {\n            const state = get();\n            if (state.isReplaying || logs.length === 0) return;\n            \n            set({ \n              isReplaying: true, \n              replaySpeed: speed,\n              currentReplayIndex: 0\n            }, false, 'debug:startReplay');\n            \n            const replayAction = async (index: number) => {\n              const currentState = get();\n              if (!currentState.isReplaying || index >= logs.length) {\n                set({ isReplaying: false, currentReplayIndex: 0 }, false, 'debug:replayComplete');\n                return;\n              }\n              \n              const log = logs[index];\n              const storeInterface = currentState.registeredStores.get(log.storeKey);\n              \n              if (storeInterface) {\n                storeInterface.setState(log.nextState, `replay:${log.actionName}`);\n              }\n              \n              set({ currentReplayIndex: index + 1 }, false, 'debug:replayStep');\n              \n              // Calculate delay based on replay speed and original timing\n              const delay = index < logs.length - 1 \n                ? Math.max((logs[index + 1].timestamp.getTime() - log.timestamp.getTime()) / speed, 10)\n                : 0;\n              \n              if (delay > 0) {\n                replayTimeout = setTimeout(() => replayAction(index + 1), delay);\n              } else {\n                replayAction(index + 1);\n              }\n            };\n            \n            replayAction(0);\n          },\n          \n          stopReplay: () => {\n            if (replayTimeout) {\n              clearTimeout(replayTimeout);\n              replayTimeout = null;\n            }\n            \n            set({ \n              isReplaying: false,\n              currentReplayIndex: 0\n            }, false, 'debug:stopReplay');\n          },\n          \n          pauseReplay: () => {\n            if (replayTimeout) {\n              clearTimeout(replayTimeout);\n              replayTimeout = null;\n            }\n          },\n          \n          resumeReplay: () => {\n            const state = get();\n            if (state.isReplaying && state.currentReplayIndex < state.actionLogs.length) {\n              // Resume from current index\n              state.startReplay(\n                state.actionLogs.slice(state.currentReplayIndex),\n                state.replaySpeed\n              );\n            }\n          },\n          \n          getStateDiff: (storeKey, fromTimestamp, toTimestamp) => {\n            const state = get();\n            const snapshots = state.snapshots.get(storeKey) || [];\n            \n            const fromSnapshot = snapshots.find(s => s.timestamp >= fromTimestamp);\n            const toSnapshot = [...snapshots].reverse().find(s => s.timestamp <= toTimestamp);\n            \n            if (!fromSnapshot || !toSnapshot) return [];\n            \n            return get()._calculateStateDiff(fromSnapshot.state, toSnapshot.state);\n          },\n          \n          getPerformanceReport: (storeKey) => {\n            const state = get();\n            const metrics = Array.from(state.performanceMetrics.values());\n            \n            return storeKey \n              ? metrics.filter(m => m.storeKey === storeKey)\n              : metrics;\n          },\n          \n          findSlowActions: (threshold, storeKey) => {\n            const state = get();\n            return state.actionLogs.filter(log => {\n              const matchesStore = !storeKey || log.storeKey === storeKey;\n              return matchesStore && log.duration > threshold;\n            });\n          },\n          \n          exportDebugData: (options = {}) => {\n            const state = get();\n            const { includeStates = false, timeRange } = options;\n            \n            let logs = state.actionLogs;\n            \n            if (timeRange) {\n              const [start, end] = timeRange;\n              logs = logs.filter(log => log.timestamp >= start && log.timestamp <= end);\n            }\n            \n            const exportData = {\n              metadata: {\n                exportedAt: new Date(),\n                version: '1.0.0',\n                stores: Array.from(state.registeredStores.keys())\n              },\n              logs: includeStates ? logs : logs.map(log => ({\n                ...log,\n                previousState: undefined,\n                nextState: undefined\n              })),\n              performanceMetrics: Object.fromEntries(state.performanceMetrics),\n              snapshots: includeStates ? Object.fromEntries(state.snapshots) : {}\n            };\n            \n            return safeStringify(exportData, null, 2);\n          },\n          \n          importDebugData: (data) => {\n            try {\n              const importData = safeParse(data);\n              \n              set({\n                actionLogs: importData.logs || [],\n                performanceMetrics: new Map(Object.entries(importData.performanceMetrics || {})),\n                snapshots: new Map(Object.entries(importData.snapshots || {}))\n              }, false, 'debug:import');\n            } catch (error) {\n              logger.error('Failed to import debug data:', error);\n            }\n          },\n          \n          getStateHistory: (storeKey, limit = 10) => {\n            const state = get();\n            const snapshots = state.snapshots.get(storeKey) || [];\n            \n            return snapshots\n              .slice(-limit)\n              .map(snapshot => snapshot.state);\n          },\n          \n          searchLogs: (query, storeKey) => {\n            const state = get();\n            const searchTerm = query.toLowerCase();\n            \n            return state.actionLogs.filter(log => {\n              const matchesStore = !storeKey || log.storeKey === storeKey;\n              const matchesQuery = \n                log.actionName.toLowerCase().includes(searchTerm) ||\n                log.storeKey.toLowerCase().includes(searchTerm) ||\n                (log.metadata?.component?.toLowerCase().includes(searchTerm));\n              \n              return matchesStore && matchesQuery;\n            });\n          },\n          \n          _logAction: (log) => {\n            set((state) => {\n              const newLogs = [...state.actionLogs, log];\n              \n              // Maintain max log size\n              if (newLogs.length > state.maxLogSize) {\n                newLogs.shift();\n              }\n              \n              return { actionLogs: newLogs };\n            }, false, 'debug:logAction');\n          },\n          \n          _updatePerformanceMetrics: (storeKey, actionName, duration) => {\n            set((state) => {\n              const metrics = state.performanceMetrics.get(storeKey);\n              if (!metrics) return state;\n              \n              const actionCounts = { ...metrics.actionCounts };\n              const averageDurations = { ...metrics.averageDurations };\n              const maxDurations = { ...metrics.maxDurations };\n              \n              actionCounts[actionName] = (actionCounts[actionName] || 0) + 1;\n              \n              const currentAvg = averageDurations[actionName] || 0;\n              const count = actionCounts[actionName];\n              averageDurations[actionName] = (currentAvg * (count - 1) + duration) / count;\n              \n              maxDurations[actionName] = Math.max(maxDurations[actionName] || 0, duration);\n              \n              const newPerformanceMetrics = new Map(state.performanceMetrics);\n              newPerformanceMetrics.set(storeKey, {\n                ...metrics,\n                actionCounts,\n                averageDurations,\n                maxDurations,\n                lastUpdated: new Date()\n              });\n              \n              return { performanceMetrics: newPerformanceMetrics };\n            }, false, 'debug:updateMetrics');\n          },\n          \n          _createSnapshot: (storeKey, state) => {\n            set((currentState) => {\n              const snapshots = new Map(currentState.snapshots);\n              const storeSnapshots = snapshots.get(storeKey) || [];\n              \n              const newSnapshot = {\n                timestamp: new Date(),\n                state: safeParse(safeStringify(state))\n              };\n              \n              const newStoreSnapshots = [...storeSnapshots, newSnapshot];\n              \n              // Keep only last 50 snapshots per store\n              if (newStoreSnapshots.length > 50) {\n                newStoreSnapshots.shift();\n              }\n              \n              snapshots.set(storeKey, newStoreSnapshots);\n              \n              return { snapshots };\n            }, false, 'debug:createSnapshot');\n          },\n          \n          _calculateStateDiff: (oldState, newState, path = []) => {\n            const diffs: StateDiff[] = [];\n            \n            const oldKeys = new Set(Object.keys(oldState || {}));\n            const newKeys = new Set(Object.keys(newState || {}));\n            \n            // Check for added properties\n            newKeys.forEach(key => {\n              const newPath = [...path, key];\n              \n              if (!oldKeys.has(key)) {\n                diffs.push({\n                  path: newPath,\n                  oldValue: undefined,\n                  newValue: newState[key],\n                  type: 'added'\n                });\n              } else if (!deepEqual(oldState[key], newState[key])) {\n                if (typeof oldState[key] === 'object' && typeof newState[key] === 'object') {\n                  // Recursively diff nested objects\n                  diffs.push(...get()._calculateStateDiff(oldState[key], newState[key], newPath));\n                } else {\n                  diffs.push({\n                    path: newPath,\n                    oldValue: oldState[key],\n                    newValue: newState[key],\n                    type: 'changed'\n                  });\n                }\n              }\n            });\n            \n            // Check for removed properties\n            oldKeys.forEach(key => {\n              if (!newKeys.has(key)) {\n                diffs.push({\n                  path: [...path, key],\n                  oldValue: oldState[key],\n                  newValue: undefined,\n                  type: 'removed'\n                });\n              }\n            });\n            \n            return diffs;\n          }\n        };\n      }\n    ),\n    { name: 'DebugStore' }\n  )\n);\n\n// Hooks\nexport const useDebug = () => {\n  return useDebugStore((state) => ({\n    isEnabled: state.isEnabled,\n    actionLogs: state.actionLogs,\n    performanceMetrics: Array.from(state.performanceMetrics.values()),\n    monitoredStores: Array.from(state.monitoredStores),\n    registeredStores: Array.from(state.registeredStores.keys()),\n    isReplaying: state.isReplaying,\n    replayProgress: state.actionLogs.length > 0 ? state.currentReplayIndex / state.actionLogs.length : 0\n  }));\n};\n\nexport const useDebugActions = () => {\n  return useDebugStore((state) => ({\n    enable: state.enable,\n    disable: state.disable,\n    registerStore: state.registerStore,\n    unregisterStore: state.unregisterStore,\n    startMonitoring: state.startMonitoring,\n    stopMonitoring: state.stopMonitoring,\n    clearLogs: state.clearLogs,\n    startReplay: state.startReplay,\n    stopReplay: state.stopReplay,\n    exportDebugData: state.exportDebugData,\n    importDebugData: state.importDebugData,\n    searchLogs: state.searchLogs\n  }));\n};\n\n// Auto-registration hook\nexport const useDebugRegistration = (\n  storeKey: string,\n  useStore: any,\n  options?: { name?: string; version?: string; autoMonitor?: boolean }\n) => {\n  const { registerStore, unregisterStore, startMonitoring } = useDebugActions();\n  \n  React.useEffect(() => {\n    const storeInterface = {\n      getState: () => useStore.getState(),\n      setState: (state: any, actionName?: string) => {\n        useStore.setState(state, false, actionName);\n      },\n      subscribe: (callback: (state: any, actionName?: string) => void) => {\n        return useStore.subscribe(callback);\n      }\n    };\n    \n    registerStore(storeKey, storeInterface, options);\n    \n    if (options?.autoMonitor !== false) {\n      startMonitoring(storeKey);\n    }\n    \n    return () => unregisterStore(storeKey);\n  }, [storeKey, registerStore, unregisterStore, startMonitoring, options]);\n};\n\n// DevTools integration\nexport const connectDebugToDevTools = () => {\n  if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {\n    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect({\n      name: 'Zustand Debug Store'\n    });\n    \n    useDebugStore.subscribe((state) => {\n      devTools.send('STATE_UPDATE', {\n        actionLogs: state.actionLogs.slice(-10), // Send only last 10 logs\n        performanceMetrics: Object.fromEntries(state.performanceMetrics),\n        monitoredStores: Array.from(state.monitoredStores)\n      });\n    });\n  }\n};