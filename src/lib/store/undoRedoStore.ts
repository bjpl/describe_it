import React from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createShallowSelector } from '../utils/storeUtils';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

/**
 * Undo/Redo Store - Universal undo/redo functionality for any store
 * Features:
 * - Multi-store undo/redo support
 * - Action grouping and batching
 * - Selective property tracking
 * - Branch management for non-linear history
 * - Auto-cleanup of old history
 * - Compression for large states
 * - Metadata tracking
 */

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  storeKey: string;
  actionName: string;
  previousState: any;
  nextState: any;
  metadata?: {
    userId?: string;
    sessionId?: string;
    tags?: string[];
    description?: string;
  };
  compressed?: boolean;
}

export interface HistoryBranch {
  id: string;
  name: string;
  entries: HistoryEntry[];
  parentBranchId?: string;
  createdAt: Date;
}

export interface UndoRedoConfig {
  maxHistorySize: number;
  compressionThreshold: number; // Size in bytes to trigger compression
  autoCleanupMs: number; // Time in ms after which old entries are removed
  trackingStrategies: {
    [storeKey: string]: 'full' | 'selective' | 'none';
  };
  selectiveProps: {
    [storeKey: string]: string[];
  };
  groupingEnabled: boolean;
  groupingTimeoutMs: number;
}

interface UndoRedoState {
  // History management
  branches: Map<string, HistoryBranch>;
  currentBranchId: string;
  currentIndex: number; // Index within current branch

  // Configuration
  config: UndoRedoConfig;

  // Registered stores
  registeredStores: Map<string, {
    getState: () => any;
    setState: (state: any, actionName?: string) => void;
    subscribe: (callback: (state: any) => void) => () => void;
  }>;

  // Action grouping
  currentGroup: {
    id: string;
    entries: HistoryEntry[];
    timeout: NodeJS.Timeout | null;
  } | null;

  // Actions
  registerStore: (storeKey: string, storeInterface: any, strategy?: 'full' | 'selective' | 'none') => void;
  unregisterStore: (storeKey: string) => void;

  // History operations
  canUndo: (storeKey?: string) => boolean;
  canRedo: (storeKey?: string) => boolean;
  undo: (storeKey?: string) => boolean;
  redo: (storeKey?: string) => boolean;

  // Batch operations
  startGroup: (description?: string) => void;
  endGroup: () => void;

  // Branch management
  createBranch: (name: string, fromCurrentState?: boolean) => string;
  switchBranch: (branchId: string) => boolean;
  deleteBranch: (branchId: string) => void;
  mergeBranch: (sourceBranchId: string, targetBranchId: string) => boolean;

  // History queries
  getHistory: (storeKey?: string, limit?: number) => HistoryEntry[];
  getHistorySize: (storeKey?: string) => number;
  clearHistory: (storeKey?: string) => void;

  // State utilities
  jumpToEntry: (entryId: string) => boolean;
  getStateAt: (timestamp: Date, storeKey: string) => any;

  // Internal methods
  _recordEntry: (storeKey: string, actionName: string, previousState: any, nextState: any, metadata?: any) => void;
  _compressEntry: (entry: HistoryEntry) => HistoryEntry;
  _cleanup: () => void;
  _shouldTrack: (storeKey: string, actionName?: string) => boolean;
  _extractTrackedState: (storeKey: string, fullState: any) => any;
}

// Default configuration
const defaultConfig: UndoRedoConfig = {
  maxHistorySize: 100,
  compressionThreshold: 1024 * 10, // 10KB
  autoCleanupMs: 1000 * 60 * 60 * 24, // 24 hours
  trackingStrategies: {},
  selectiveProps: {},
  groupingEnabled: true,
  groupingTimeoutMs: 500
};

// Compression utilities
const compressState = (state: any): string => {
  try {
    const json = JSON.stringify(state);
    // Simple compression - in production, use a real compression library
    return btoa(json);
  } catch {
    return '';
  }
};

const decompressState = (compressed: string): any => {
  try {
    return JSON.parse(atob(compressed));
  } catch {
    return null;
  }
};

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useUndoRedoStore = create<UndoRedoState>()(  
  devtools(
    subscribeWithSelector(
      (set, get) => {
        let cleanupInterval: NodeJS.Timeout | null = null;
        
        // Initialize cleanup interval
        if (typeof window !== 'undefined') {
          cleanupInterval = setInterval(() => {
            get()._cleanup();
          }, 60000); // Run cleanup every minute
        }
        
        return {
          branches: new Map([[
            'main', 
            {
              id: 'main',
              name: 'Main',
              entries: [],
              createdAt: new Date()
            }
          ]]),
          currentBranchId: 'main',
          currentIndex: -1,
          config: defaultConfig,
          registeredStores: new Map(),
          currentGroup: null,
          
          registerStore: (storeKey, storeInterface, strategy = 'full') => {
            const state = get();
            
            // Set tracking strategy
            set((state) => ({
              config: {
                ...state.config,
                trackingStrategies: {
                  ...state.config.trackingStrategies,
                  [storeKey]: strategy
                }
              }
            }), false, 'setTrackingStrategy');
            
            // Register store interface
            const registeredStores = new Map(state.registeredStores);
            registeredStores.set(storeKey, storeInterface);
            
            // Subscribe to store changes
            const unsubscribe = storeInterface.subscribe((newState: any, actionName?: string) => {
              const currentState = get();
              if (!currentState._shouldTrack(storeKey, actionName)) return;
              
              // Get previous state for comparison
              const currentBranch = currentState.branches.get(currentState.currentBranchId);
              let previousState = null;
              
              if (currentBranch && currentState.currentIndex >= 0) {
                const lastEntry = currentBranch.entries[currentState.currentIndex];
                if (lastEntry && lastEntry.storeKey === storeKey) {
                  previousState = lastEntry.nextState;
                }
              }
              
              if (!previousState) {
                previousState = currentState._extractTrackedState(storeKey, storeInterface.getState());
              }
              
              const trackedNewState = currentState._extractTrackedState(storeKey, newState);
              
              // Only record if state actually changed
              if (JSON.stringify(previousState) !== JSON.stringify(trackedNewState)) {
                currentState._recordEntry(
                  storeKey,
                  actionName || 'unknown',
                  previousState,
                  trackedNewState
                );
              }
            });
            
            // Store cleanup function with store interface
            registeredStores.set(storeKey, {
              ...storeInterface,
              _unsubscribe: unsubscribe
            });
            
            set({ registeredStores }, false, 'registerStore');
          },
          
          unregisterStore: (storeKey) => {
            const state = get();
            const storeInterface = state.registeredStores.get(storeKey);
            
            if (storeInterface && (storeInterface as any)._unsubscribe) {
              (storeInterface as any)._unsubscribe();
            }
            
            const newRegisteredStores = new Map(state.registeredStores);
            newRegisteredStores.delete(storeKey);
            
            set({ registeredStores: newRegisteredStores }, false, 'unregisterStore');
          },
          
          canUndo: (storeKey) => {
            const state = get();
            const currentBranch = state.branches.get(state.currentBranchId);
            
            if (!currentBranch || state.currentIndex < 0) return false;
            
            if (storeKey) {
              // Check if there's an entry for this specific store to undo
              for (let i = state.currentIndex; i >= 0; i--) {
                if (currentBranch.entries[i].storeKey === storeKey) {
                  return true;
                }
              }
              return false;
            }
            
            return state.currentIndex >= 0;
          },
          
          canRedo: (storeKey) => {
            const state = get();
            const currentBranch = state.branches.get(state.currentBranchId);
            
            if (!currentBranch || state.currentIndex >= currentBranch.entries.length - 1) return false;
            
            if (storeKey) {
              // Check if there's an entry for this specific store to redo
              for (let i = state.currentIndex + 1; i < currentBranch.entries.length; i++) {
                if (currentBranch.entries[i].storeKey === storeKey) {
                  return true;
                }
              }
              return false;
            }
            
            return state.currentIndex < currentBranch.entries.length - 1;
          },
          
          undo: (storeKey) => {
            const state = get();
            if (!state.canUndo(storeKey)) return false;
            
            const currentBranch = state.branches.get(state.currentBranchId)!;
            let targetIndex = state.currentIndex;
            
            if (storeKey) {
              // Find the most recent entry for this store
              for (let i = state.currentIndex; i >= 0; i--) {
                if (currentBranch.entries[i].storeKey === storeKey) {
                  const entry = currentBranch.entries[i];
                  const storeInterface = state.registeredStores.get(storeKey);
                  
                  if (storeInterface) {
                    const stateToRestore = entry.compressed 
                      ? decompressState(entry.previousState)
                      : entry.previousState;
                      
                    storeInterface.setState(stateToRestore, `undo:${entry.actionName}`);
                  }
                  
                  targetIndex = i - 1;
                  break;
                }
              }
            } else {
              // Undo the last action regardless of store
              const entry = currentBranch.entries[state.currentIndex];
              const storeInterface = state.registeredStores.get(entry.storeKey);
              
              if (storeInterface) {
                const stateToRestore = entry.compressed 
                  ? decompressState(entry.previousState)
                  : entry.previousState;
                  
                storeInterface.setState(stateToRestore, `undo:${entry.actionName}`);
              }
              
              targetIndex = state.currentIndex - 1;
            }
            
            set({ currentIndex: targetIndex }, false, 'undo');
            return true;
          },
          
          redo: (storeKey) => {
            const state = get();
            if (!state.canRedo(storeKey)) return false;
            
            const currentBranch = state.branches.get(state.currentBranchId)!;
            let targetIndex = state.currentIndex;
            
            if (storeKey) {
              // Find the next entry for this store
              for (let i = state.currentIndex + 1; i < currentBranch.entries.length; i++) {
                if (currentBranch.entries[i].storeKey === storeKey) {
                  const entry = currentBranch.entries[i];
                  const storeInterface = state.registeredStores.get(storeKey);
                  
                  if (storeInterface) {
                    const stateToRestore = entry.compressed 
                      ? decompressState(entry.nextState)
                      : entry.nextState;
                      
                    storeInterface.setState(stateToRestore, `redo:${entry.actionName}`);
                  }
                  
                  targetIndex = i;
                  break;
                }
              }
            } else {
              // Redo the next action
              const entry = currentBranch.entries[state.currentIndex + 1];
              const storeInterface = state.registeredStores.get(entry.storeKey);
              
              if (storeInterface) {
                const stateToRestore = entry.compressed 
                  ? decompressState(entry.nextState)
                  : entry.nextState;
                  
                storeInterface.setState(stateToRestore, `redo:${entry.actionName}`);
              }
              
              targetIndex = state.currentIndex + 1;
            }
            
            set({ currentIndex: targetIndex }, false, 'redo');
            return true;
          },
          
          startGroup: (description) => {
            const state = get();
            
            // End current group if exists
            if (state.currentGroup) {
              get().endGroup();
            }
            
            set({
              currentGroup: {
                id: generateId(),
                entries: [],
                timeout: null
              }
            }, false, 'startGroup');
          },
          
          endGroup: () => {
            const state = get();
            if (!state.currentGroup) return;
            
            if (state.currentGroup.timeout) {
              clearTimeout(state.currentGroup.timeout);
            }
            
            // If group has entries, they're already recorded individually
            // Just clear the group
            set({ currentGroup: null }, false, 'endGroup');
          },
          
          createBranch: (name, fromCurrentState = true) => {
            const branchId = generateId();
            const state = get();
            
            const newBranch: HistoryBranch = {
              id: branchId,
              name,
              entries: [],
              parentBranchId: state.currentBranchId,
              createdAt: new Date()
            };
            
            // Copy current history up to current index if requested
            if (fromCurrentState) {
              const currentBranch = state.branches.get(state.currentBranchId);
              if (currentBranch) {
                newBranch.entries = currentBranch.entries.slice(0, state.currentIndex + 1);
              }
            }
            
            const newBranches = new Map(state.branches);
            newBranches.set(branchId, newBranch);
            
            set({ branches: newBranches }, false, 'createBranch');
            
            return branchId;
          },
          
          switchBranch: (branchId) => {
            const state = get();
            const targetBranch = state.branches.get(branchId);
            
            if (!targetBranch) return false;
            
            // Apply all states from the target branch
            targetBranch.entries.forEach(entry => {
              const storeInterface = state.registeredStores.get(entry.storeKey);
              if (storeInterface) {
                const stateToApply = entry.compressed 
                  ? decompressState(entry.nextState)
                  : entry.nextState;
                  
                storeInterface.setState(stateToApply, `branch:${entry.actionName}`);
              }
            });
            
            set({
              currentBranchId: branchId,
              currentIndex: targetBranch.entries.length - 1
            }, false, 'switchBranch');
            
            return true;
          },
          
          deleteBranch: (branchId) => {
            if (branchId === 'main') return; // Can't delete main branch
            
            const state = get();
            const newBranches = new Map(state.branches);
            newBranches.delete(branchId);
            
            let newCurrentBranchId = state.currentBranchId;
            if (state.currentBranchId === branchId) {
              newCurrentBranchId = 'main';
            }
            
            const newBranch = newBranches.get(newCurrentBranchId);

            set({
              branches: newBranches,
              currentBranchId: newCurrentBranchId,
              currentIndex: newBranch ? newBranch.entries.length - 1 : -1
            }, false, 'deleteBranch');
          },
          
          mergeBranch: (sourceBranchId, targetBranchId) => {
            const state = get();
            const sourceBranch = state.branches.get(sourceBranchId);
            const targetBranch = state.branches.get(targetBranchId);
            
            if (!sourceBranch || !targetBranch) return false;
            
            // Merge source branch entries into target branch
            const mergedEntries = [...targetBranch.entries, ...sourceBranch.entries];
            
            const newBranches = new Map(state.branches);
            newBranches.set(targetBranchId, {
              ...targetBranch,
              entries: mergedEntries
            });
            
            set({ branches: newBranches }, false, 'mergeBranch');
            
            return true;
          },
          
          getHistory: (storeKey, limit) => {
            const state = get();
            const currentBranch = state.branches.get(state.currentBranchId);
            
            if (!currentBranch) return [];
            
            let entries = currentBranch.entries;
            
            if (storeKey) {
              entries = entries.filter(entry => entry.storeKey === storeKey);
            }
            
            if (limit && entries.length > limit) {
              entries = entries.slice(-limit);
            }
            
            return entries;
          },
          
          getHistorySize: (storeKey) => {
            return get().getHistory(storeKey).length;
          },
          
          clearHistory: (storeKey) => {
            const state = get();
            const currentBranch = state.branches.get(state.currentBranchId);
            
            if (!currentBranch) return;
            
            let newEntries = currentBranch.entries;
            
            if (storeKey) {
              newEntries = newEntries.filter(entry => entry.storeKey !== storeKey);
            } else {
              newEntries = [];
            }
            
            const newBranches = new Map(state.branches);
            newBranches.set(state.currentBranchId, {
              ...currentBranch,
              entries: newEntries
            });
            
            set({
              branches: newBranches,
              currentIndex: newEntries.length - 1
            }, false, 'clearHistory');
          },
          
          jumpToEntry: (entryId) => {
            const state = get();
            const currentBranch = state.branches.get(state.currentBranchId);
            
            if (!currentBranch) return false;
            
            const entryIndex = currentBranch.entries.findIndex(entry => entry.id === entryId);
            
            if (entryIndex === -1) return false;
            
            // Apply all states up to the target entry
            for (let i = 0; i <= entryIndex; i++) {
              const entry = currentBranch.entries[i];
              const storeInterface = state.registeredStores.get(entry.storeKey);
              
              if (storeInterface) {
                const stateToApply = entry.compressed 
                  ? decompressState(entry.nextState)
                  : entry.nextState;
                  
                storeInterface.setState(stateToApply, `jump:${entry.actionName}`);
              }
            }
            
            set({ currentIndex: entryIndex }, false, 'jumpToEntry');
            
            return true;
          },
          
          getStateAt: (timestamp, storeKey) => {
            const state = get();
            const currentBranch = state.branches.get(state.currentBranchId);
            
            if (!currentBranch) return null;
            
            // Find the last entry for this store before or at the timestamp
            for (let i = currentBranch.entries.length - 1; i >= 0; i--) {
              const entry = currentBranch.entries[i];
              if (entry.storeKey === storeKey && entry.timestamp <= timestamp) {
                return entry.compressed 
                  ? decompressState(entry.nextState)
                  : entry.nextState;
              }
            }
            
            return null;
          },
          
          _recordEntry: (storeKey, actionName, previousState, nextState, metadata) => {
            const state = get();
            
            const entry: HistoryEntry = {
              id: generateId(),
              timestamp: new Date(),
              storeKey,
              actionName,
              previousState,
              nextState,
              metadata
            };
            
            // Check if compression is needed
            const entrySize = JSON.stringify(entry).length;
            if (entrySize > state.config.compressionThreshold) {
              entry.previousState = compressState(previousState);
              entry.nextState = compressState(nextState);
              entry.compressed = true;
            }
            
            const currentBranch = state.branches.get(state.currentBranchId)!;
            
            // If we're not at the end of history, create a new branch
            let targetBranch = currentBranch;
            let targetBranchId = state.currentBranchId;
            
            if (state.currentIndex < currentBranch.entries.length - 1) {
              // Create new branch from current position
              targetBranchId = get().createBranch(`Auto-${Date.now()}`, true);
              targetBranch = state.branches.get(targetBranchId)!;
            }
            
            // Add entry to branch
            const newEntries = [...targetBranch.entries, entry];
            
            // Maintain max history size
            if (newEntries.length > state.config.maxHistorySize) {
              newEntries.shift(); // Remove oldest entry
            }
            
            const newBranches = new Map(state.branches);
            newBranches.set(targetBranchId, {
              ...targetBranch,
              entries: newEntries
            });
            
            set({
              branches: newBranches,
              currentBranchId: targetBranchId,
              currentIndex: newEntries.length - 1
            }, false, 'recordEntry');
          },
          
          _compressEntry: (entry) => {
            return {
              ...entry,
              previousState: compressState(entry.previousState),
              nextState: compressState(entry.nextState),
              compressed: true
            };
          },
          
          _cleanup: () => {
            const state = get();
            const cutoffTime = Date.now() - state.config.autoCleanupMs;
            let hasChanges = false;
            
            const newBranches = new Map();
            
            state.branches.forEach((branch, branchId) => {
              const filteredEntries = branch.entries.filter(
                entry => entry.timestamp.getTime() > cutoffTime
              );
              
              if (filteredEntries.length !== branch.entries.length) {
                hasChanges = true;
              }
              
              newBranches.set(branchId, {
                ...branch,
                entries: filteredEntries
              });
            });
            
            if (hasChanges) {
              set({ branches: newBranches }, false, 'cleanup');
            }
          },
          
          _shouldTrack: (storeKey, actionName) => {
            const state = get();
            const strategy = state.config.trackingStrategies[storeKey] || 'full';
            
            if (strategy === 'none') return false;
            
            // Don't track undo/redo actions to prevent infinite loops
            if (actionName?.startsWith('undo:') || actionName?.startsWith('redo:')) {
              return false;
            }
            
            return true;
          },
          
          _extractTrackedState: (storeKey, fullState) => {
            const state = get();
            const strategy = state.config.trackingStrategies[storeKey] || 'full';
            
            if (strategy === 'selective') {
              const propsToTrack = state.config.selectiveProps[storeKey] || [];
              const trackedState: any = {};
              
              propsToTrack.forEach(prop => {
                if (prop in fullState) {
                  trackedState[prop] = fullState[prop];
                }
              });
              
              return trackedState;
            }
            
            return fullState;
          }
        };
      }
    ),
    { name: 'UndoRedoStore' }
  )
);

// Selectors
const undoRedoSelector = createShallowSelector((state: UndoRedoState) => ({
  canUndo: (storeKey?: string) => state.canUndo(storeKey),
  canRedo: (storeKey?: string) => state.canRedo(storeKey),
  currentBranch: state.branches.get(state.currentBranchId)?.name || 'Unknown',
  historySize: state.branches.get(state.currentBranchId)?.entries.length || 0,
  currentIndex: state.currentIndex
}));

// Hooks
export const useUndoRedo = (storeKey?: string) => {
  const selector = undoRedoSelector(useUndoRedoStore);
  const actions = useUndoRedoStore((state) => ({
    undo: () => state.undo(storeKey),
    redo: () => state.redo(storeKey),
    startGroup: state.startGroup,
    endGroup: state.endGroup,
    canUndo: selector.canUndo(storeKey),
    canRedo: selector.canRedo(storeKey)
  }));
  
  return actions;
};

export const useUndoRedoActions = () => {
  return useUndoRedoStore((state) => ({
    registerStore: state.registerStore,
    unregisterStore: state.unregisterStore,
    createBranch: state.createBranch,
    switchBranch: state.switchBranch,
    deleteBranch: state.deleteBranch,
    mergeBranch: state.mergeBranch,
    clearHistory: state.clearHistory,
    jumpToEntry: state.jumpToEntry
  }));
};

// Auto-registration hook
export const useUndoRedoRegistration = (
  storeKey: string,
  useStore: any,
  strategy: 'full' | 'selective' | 'none' = 'full',
  selectiveProps?: string[]
) => {
  const { registerStore, unregisterStore } = useUndoRedoActions();
  
  React.useEffect(() => {
    const storeInterface = {
      getState: () => useStore.getState(),
      setState: (state: any, actionName?: string) => {
        useStore.setState(state, false, actionName);
      },
      subscribe: (callback: (state: any) => void) => {
        return useStore.subscribe(callback);
      }
    };

    registerStore(storeKey, storeInterface, strategy);

    // Set selective props if provided
    if (strategy === 'selective' && selectiveProps) {
      useUndoRedoStore.setState((state) => ({
        config: {
          ...state.config,
          selectiveProps: {
            ...state.config.selectiveProps,
            [storeKey]: selectiveProps
          }
        }
      }));
    }

    return () => unregisterStore(storeKey);
  }, [storeKey, registerStore, unregisterStore, strategy, selectiveProps, useStore]);
};

// Keyboard shortcuts for undo/redo
export const useUndoRedoShortcuts = (storeKey?: string) => {
  const { undo, redo } = useUndoRedo(storeKey);
  
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key === 'Z' || event.key === 'y')) {
        event.preventDefault();
        redo();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [undo, redo]);
};