import { StateStorage, PersistOptions } from 'zustand/middleware';

/**
 * SSR-Safe Persistence Middleware for Zustand
 * Features:
 * - Server-side rendering compatibility
 * - Hydration error prevention
 * - Storage fallback mechanisms
 * - Cross-tab synchronization
 * - Encrypted storage support
 * - Version migration support
 */

interface SSRPersistOptions<T> extends Omit<PersistOptions<T, T>, 'storage'> {
  storage?: StateStorage;
  encryption?: {
    encrypt: (value: string) => string;
    decrypt: (value: string) => string;
  };
  version?: number;
  migrate?: (persistedState: unknown, version: number) => T;
  syncAcrossTabs?: boolean;
  onRehydrationError?: (error: Error) => void;
}

interface StorageEvent {
  key: string;
  oldValue: string | null;
  newValue: string | null;
}

// Create SSR-safe storage that falls back gracefully
export const createSSRStorage = (storage?: StateStorage): StateStorage => {
  // Return a no-op storage for SSR
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
  }

  // Use provided storage or default to localStorage
  const actualStorage = storage || localStorage;

  return {
    getItem: (name: string) => {
      try {
        return actualStorage.getItem(name);
      } catch (error) {
        console.warn(`Failed to get item from storage: ${name}`, error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        actualStorage.setItem(name, value);
      } catch (error) {
        console.warn(`Failed to set item in storage: ${name}`, error);
      }
    },
    removeItem: (name: string) => {
      try {
        actualStorage.removeItem(name);
      } catch (error) {
        console.warn(`Failed to remove item from storage: ${name}`, error);
      }
    }
  };
};

// Enhanced storage with encryption and compression
export const createSecureStorage = (
  baseStorage: StateStorage,
  encryption?: { encrypt: (value: string) => string; decrypt: (value: string) => string }
): StateStorage => {
  return {
    getItem: (name: string) => {
      const value = baseStorage.getItem(name);
      if (!value || !encryption) return value;
      
      try {
        return encryption.decrypt(value);
      } catch (error) {
        console.warn(`Failed to decrypt storage item: ${name}`, error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      const finalValue = encryption ? encryption.encrypt(value) : value;
      baseStorage.setItem(name, finalValue);
    },
    removeItem: (name: string) => {
      baseStorage.removeItem(name);
    }
  };
};

// Cross-tab synchronization manager
class TabSyncManager {
  private listeners: Map<string, Set<(newValue: any) => void>> = new Map();
  private isListening = false;

  startListening() {
    if (this.isListening || typeof window === 'undefined') return;
    
    this.isListening = true;
    window.addEventListener('storage', this.handleStorageChange);
    
    // Modern browsers support BroadcastChannel for same-origin tab communication
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('zustand-sync');
      channel.addEventListener('message', (event) => {
        const { key, value } = event.data;
        this.notifyListeners(key, value);
      });
    }
  }

  stopListening() {
    if (!this.isListening || typeof window === 'undefined') return;
    
    this.isListening = false;
    window.removeEventListener('storage', this.handleStorageChange);
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (!event.key || !event.newValue) return;
    
    try {
      const newValue = safeParse(event.newValue);
      this.notifyListeners(event.key, newValue);
    } catch (error) {
      console.warn('Failed to parse storage change event', error);
    }
  };

  private notifyListeners(key: string, value: any) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => listener(value));
    }
  }

  subscribe(key: string, listener: (newValue: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  broadcast(key: string, value: any) {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('zustand-sync');
      channel.postMessage({ key, value });
    }
  }
}

const globalTabSyncManager = new TabSyncManager();

// Create enhanced persist middleware with SSR support
export const ssrPersist = <T>(
  config: (set: any, get: any, api: any) => T,
  options: SSRPersistOptions<T>
): ((set: any, get: any, api: any) => T) => {
  return (set, get, api) => {
    const storage = createSecureStorage(
      createSSRStorage(options.storage),
      options.encryption
    );

    const {
      name,
      partialize,
      onRehydrationError,
      syncAcrossTabs = false,
      version = 0,
      migrate,
      ...rest
    } = options;

    let hasHydrated = false;
    let isHydrating = false;

    // Create the base state
    const stateCreator = config(set, get, api);

    // SSR-safe rehydration
    const rehydrate = async () => {
      if (hasHydrated || isHydrating || typeof window === 'undefined') return;
      
      isHydrating = true;

      try {
        const storedValue = storage.getItem(name);
        if (!storedValue) {
          hasHydrated = true;
          isHydrating = false;
          return;
        }

        const parsed = JSON.parse(storedValue);
        let state = parsed.state;

        // Handle version migration
        if (migrate && parsed.version !== undefined && parsed.version !== version) {
          state = migrate(state, parsed.version);
        }

        // Merge stored state with current state
        const currentState = get();
        const stateToMerge = partialize ? partialize(state) : state;
        const mergedState = { ...currentState, ...stateToMerge };

        set(mergedState, false, 'rehydrate');
        hasHydrated = true;
      } catch (error) {
        console.warn(`Failed to rehydrate ${name}:`, error);
        if (onRehydrationError) {
          onRehydrationError(error as Error);
        }
      } finally {
        isHydrating = false;
      }
    };

    // Persist state to storage
    const persistState = () => {
      if (!hasHydrated || typeof window === 'undefined') return;

      try {
        const state = get();
        const stateToStore = partialize ? partialize(state) : state;
        const serialized = safeStringify({
          state: stateToStore,
          version,
          timestamp: Date.now()
        });

        storage.setItem(name, serialized);

        // Broadcast to other tabs
        if (syncAcrossTabs) {
          globalTabSyncManager.broadcast(name, stateToStore);
        }
      } catch (error) {
        console.warn(`Failed to persist ${name}:`, error);
      }
    };

    // Set up cross-tab synchronization
    if (syncAcrossTabs && typeof window !== 'undefined') {
      globalTabSyncManager.startListening();
      const unsubscribe = globalTabSyncManager.subscribe(name, (newState) => {
        if (hasHydrated) {
          const currentState = get();
          const mergedState = { ...currentState, ...newState };
          set(mergedState, false, 'sync-tabs');
        }
      });

      // Clean up on unmount (browser environments)
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', unsubscribe);
      }
    }

    // Subscribe to state changes for persistence
    api.subscribe((state: T) => {
      if (hasHydrated) {
        persistState();
      }
    });

    // Rehydrate when component mounts in browser
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => rehydrate());
      } else {
        setTimeout(rehydrate, 0);
      }
    }

    // Add rehydrate method to API
    return {
      ...stateCreator,
      // Utility methods
      _hasHydrated: () => hasHydrated,
      _rehydrate: rehydrate,
      _clearStorage: () => storage.removeItem(name),
      _exportState: () => {
        const state = get();
        const stateToExport = partialize ? partialize(state) : state;
        return safeStringify({ state: stateToExport, version, timestamp: Date.now() });
      },
      _importState: (serializedState: string) => {
        try {
          const parsed = safeParse(serializedState);
          let state = parsed.state;

          if (migrate && parsed.version !== undefined && parsed.version !== version) {
            state = migrate(state, parsed.version);
          }

          const currentState = get();
          const mergedState = { ...currentState, ...state };
          set(mergedState, false, 'import');
          persistState();
        } catch (error) {
          throw new Error(`Failed to import state: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } as T & {
      _hasHydrated: () => boolean;
      _rehydrate: () => Promise<void>;
      _clearStorage: () => void;
      _exportState: () => string;
      _importState: (state: string) => void;
    };
  };
};

// Hydration guard hook
export const useHydration = <T>(useStore: (selector?: (state: T) => any) => any) => {
  const [hasHydrated, setHasHydrated] = React.useState(false);
  
  React.useEffect(() => {
    const store = useStore.getState();
    if (store && typeof store._hasHydrated === 'function') {
      // Poll for hydration completion
      const checkHydration = () => {
        if (store._hasHydrated()) {
          setHasHydrated(true);
        } else {
          setTimeout(checkHydration, 50);
        }
      };
      checkHydration();
    } else {
      // Fallback for stores without hydration support
      setHasHydrated(true);
    }
  }, [useStore]);

  return hasHydrated;
};

// Storage adapters
export const storageAdapters = {
  localStorage: (typeof window !== 'undefined' && window.localStorage) || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  
  sessionStorage: (typeof window !== 'undefined' && window.sessionStorage) || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  
  // IndexedDB adapter for large amounts of data
  indexedDB: {
    getItem: async (name: string) => {
      if (typeof window === 'undefined' || !window.indexedDB) return null;
      
      try {
        const db = await openDB();
        const transaction = db.transaction(['zustand'], 'readonly');
        const store = transaction.objectStore('zustand');
        const result = await store.get(name);
        return result?.value || null;
      } catch (error) {
        console.warn('IndexedDB getItem failed:', error);
        return null;
      }
    },
    
    setItem: async (name: string, value: string) => {
      if (typeof window === 'undefined' || !window.indexedDB) return;
      
      try {
        const db = await openDB();
        const transaction = db.transaction(['zustand'], 'readwrite');
        const store = transaction.objectStore('zustand');
        await store.put({ key: name, value, timestamp: Date.now() });
      } catch (error) {
        console.warn('IndexedDB setItem failed:', error);
      }
    },
    
    removeItem: async (name: string) => {
      if (typeof window === 'undefined' || !window.indexedDB) return;
      
      try {
        const db = await openDB();
        const transaction = db.transaction(['zustand'], 'readwrite');
        const store = transaction.objectStore('zustand');
        await store.delete(name);
      } catch (error) {
        console.warn('IndexedDB removeItem failed:', error);
      }
    }
  }
};

// IndexedDB helper
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('ZustandDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('zustand')) {
        db.createObjectStore('zustand', { keyPath: 'key' });
      }
    };
  });
};

import React from 'react';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";