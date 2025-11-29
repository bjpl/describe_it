/**
 * Shared Storage Utilities
 * Safe sessionStorage and localStorage operations with error handling
 */

import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from "@/lib/logger";

/**
 * Safely get item from sessionStorage with JSON parsing
 * @param key - Storage key
 * @returns Parsed value or null if not found/error
 */
export function safeGetSessionStorage<T = any>(key: string): T | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const item = window.sessionStorage.getItem(key);
    if (!item) {
      return null;
    }

    const parsed = safeParse<T>(item);
    return parsed !== undefined ? parsed : null;
  } catch (error) {
    logger.error(`Error reading from sessionStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safely set item in sessionStorage with JSON stringification
 * @param key - Storage key
 * @param value - Value to store
 * @returns Success boolean
 */
export function safeSetSessionStorage(key: string, value: any): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    const serialized = safeStringify(value);
    window.sessionStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    logger.error(`Error writing to sessionStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safely get item from localStorage with JSON parsing
 * @param key - Storage key
 * @returns Parsed value or null if not found/error
 */
export function safeGetLocalStorage<T = any>(key: string): T | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const item = window.localStorage.getItem(key);
    if (!item) {
      return null;
    }

    const parsed = safeParse<T>(item);
    return parsed !== undefined ? parsed : null;
  } catch (error) {
    logger.error(`Error reading from localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safely set item in localStorage with JSON stringification
 * @param key - Storage key
 * @param value - Value to store
 * @returns Success boolean
 */
export function safeSetLocalStorage(key: string, value: any): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    const serialized = safeStringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    logger.error(`Error writing to localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from sessionStorage
 */
export function removeSessionStorage(key: string): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    window.sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`Error removing from sessionStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeLocalStorage(key: string): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`Error removing from localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Clear all sessionStorage
 */
export function clearSessionStorage(): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    window.sessionStorage.clear();
    return true;
  } catch (error) {
    logger.error("Error clearing sessionStorage:", error);
    return false;
  }
}

/**
 * Clear all localStorage
 */
export function clearLocalStorage(): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    window.localStorage.clear();
    return true;
  } catch (error) {
    logger.error("Error clearing localStorage:", error);
    return false;
  }
}

/**
 * Coordinate with agents by storing data in sessionStorage
 * @param agentId - Agent identifier (e.g., "gamma-3", "alpha-1")
 * @param data - Data to share with other agents
 * @param options - Optional coordination options
 */
export interface CoordinationOptions {
  emitEvent?: boolean;
  eventName?: string;
  storageKey?: string;
}

export function coordinateWithAgents(
  agentId: string,
  data: Record<string, any>,
  options: CoordinationOptions = {}
): boolean {
  try {
    const {
      emitEvent = true,
      eventName,
      storageKey,
    } = options;

    const coordinationData = {
      agent: agentId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Store in sessionStorage
    const key = storageKey || `${agentId}-status`;
    const stored = safeSetSessionStorage(key, coordinationData);

    // Emit custom event if requested
    if (emitEvent && typeof window !== "undefined") {
      const event = new CustomEvent(eventName || `${agentId}Update`, {
        detail: coordinationData,
      });
      window.dispatchEvent(event);
    }

    return stored;
  } catch (error) {
    logger.error(`Error coordinating with agents for ${agentId}:`, error);
    return false;
  }
}

/**
 * Listen for agent coordination events
 * @param agentId - Agent identifier
 * @param callback - Callback function to handle events
 * @returns Cleanup function to remove listener
 */
export function listenToAgentEvents(
  agentId: string,
  callback: (data: any) => void,
  eventName?: string
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const eventType = eventName || `${agentId}Update`;
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail);
  };

  window.addEventListener(eventType, handler);

  // Return cleanup function
  return () => {
    window.removeEventListener(eventType, handler);
  };
}

/**
 * Get agent status from sessionStorage
 */
export function getAgentStatus<T = any>(agentId: string): T | null {
  return safeGetSessionStorage<T>(`${agentId}-status`);
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Get storage size estimate
 */
export function getStorageSize(storageType: "session" | "local" = "local"): number {
  try {
    if (!isBrowser()) {
      return 0;
    }

    const storage = storageType === "session" ? sessionStorage : localStorage;
    let totalSize = 0;

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }

    // Return size in bytes
    return totalSize * 2; // UTF-16 uses 2 bytes per character
  } catch (error) {
    logger.error("Error calculating storage size:", error);
    return 0;
  }
}

/**
 * Check if storage is available and working
 */
export function isStorageAvailable(storageType: "session" | "local" = "local"): boolean {
  try {
    if (!isBrowser()) {
      return false;
    }

    const storage = storageType === "session" ? sessionStorage : localStorage;
    const testKey = "__storage_test__";
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}
