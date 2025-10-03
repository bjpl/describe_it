/**
 * Store utilities for performance optimization and memory leak prevention
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Shallow comparison utility for objects
 */
export function shallowEqual<T extends Record<string, any>>(
  obj1: T,
  obj2: T
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Shallow comparison for arrays
 */
export function shallowEqualArray<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Create a stable selector with shallow comparison
 */
export function createShallowSelector<T, R>(
  selector: (state: T) => R
) {
  return function useShallowSelector(useStore: (selector: (state: T) => R) => R): R {
    const lastResultRef = useRef<R>(undefined as any);
    const lastStateRef = useRef<T>(undefined as any);

    return useStore(
      useCallback(
        (state: T): R => {
          if (lastStateRef.current && lastStateRef.current === state) {
            return lastResultRef.current!;
          }

          const result = selector(state);

          // For objects and arrays, use shallow comparison
          if (
            lastResultRef.current &&
            typeof result === 'object' &&
            result !== null
          ) {
            if (Array.isArray(result) && Array.isArray(lastResultRef.current)) {
              if (shallowEqualArray(result, lastResultRef.current)) {
                return lastResultRef.current;
              }
            } else if (!Array.isArray(result) && !Array.isArray(lastResultRef.current)) {
              if (shallowEqual(result as Record<string, any>, lastResultRef.current as Record<string, any>)) {
                return lastResultRef.current;
              }
            }
          }

          lastResultRef.current = result;
          lastStateRef.current = state;
          return result;
        },
        [selector] as any[]
      )
    );
  };
}

/**
 * Memoized callback that only updates when dependencies change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);

  // Only update if dependencies have changed (shallow comparison)
  if (!shallowEqualArray(deps as any[], depsRef.current as any[])) {
    ref.current = callback;
    depsRef.current = deps;
  }

  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    return ref.current(...args);
  }, [] as React.DependencyList) as T;
}

/**
 * Optimized Set-based operations for array management
 */
export class OptimizedSet<T> {
  private set = new Set<T>();
  private array: T[] = [];

  add(item: T): boolean {
    if (!this.set.has(item)) {
      this.set.add(item);
      this.array.push(item);
      return true;
    }
    return false;
  }

  delete(item: T): boolean {
    if (this.set.has(item)) {
      this.set.delete(item);
      const index = this.array.indexOf(item);
      if (index > -1) {
        this.array.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  has(item: T): boolean {
    return this.set.has(item);
  }

  clear(): void {
    this.set.clear();
    this.array = [];
  }

  get size(): number {
    return this.set.size;
  }

  toArray(): T[] {
    return [...this.array];
  }

  filter(predicate: (value: T) => boolean): T[] {
    return this.array.filter(predicate);
  }

  find(predicate: (value: T) => boolean): T | undefined {
    return this.array.find(predicate);
  }
}

/**
 * Optimized Map for key-value storage with array-like operations
 */
export class OptimizedMap<K, V> {
  private map = new Map<K, V>();
  private keys: K[] = [];

  set(key: K, value: V): this {
    if (!this.map.has(key)) {
      this.keys.push(key);
    }
    this.map.set(key, value);
    return this;
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    if (this.map.has(key)) {
      this.map.delete(key);
      const index = this.keys.indexOf(key);
      if (index > -1) {
        this.keys.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  clear(): void {
    this.map.clear();
    this.keys = [];
  }

  get size(): number {
    return this.map.size;
  }

  getKeys(): K[] {
    return [...this.keys];
  }

  getValues(): V[] {
    return this.keys.map(key => this.map.get(key)!);
  }

  entries(): Array<[K, V]> {
    return this.keys.map(key => [key, this.map.get(key)!] as [K, V]);
  }

  filter(predicate: (value: V, key: K) => boolean): Array<[K, V]> {
    return this.entries().filter(([key, value]) => predicate(value, key));
  }

  find(predicate: (value: V, key: K) => boolean): [K, V] | undefined {
    return this.entries().find(([key, value]) => predicate(value, key));
  }
}

/**
 * Cleanup manager for intervals, timeouts, and other resources
 */
export class CleanupManager {
  private cleanupFunctions: (() => void)[] = [];
  private intervals = new Set<NodeJS.Timeout>();
  private timeouts = new Set<NodeJS.Timeout>();

  addInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const id = setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }

  addTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      callback();
    }, delay);
    this.timeouts.add(id);
    return id;
  }

  clearInterval(id: NodeJS.Timeout): void {
    clearInterval(id);
    this.intervals.delete(id);
  }

  clearTimeout(id: NodeJS.Timeout): void {
    clearTimeout(id);
    this.timeouts.delete(id);
  }

  addCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }

  cleanup(): void {
    // Clear all intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();

    // Clear all timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();

    // Execute cleanup functions
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        logger.warn('Cleanup function failed:', { error: error as Error });
      }
    });
    this.cleanupFunctions = [];
  }
}

/**
 * Hook for managing cleanup operations
 */
export function useCleanupManager(): CleanupManager {
  const cleanupManagerRef = useRef<CleanupManager>(undefined as any);

  if (!cleanupManagerRef.current) {
    cleanupManagerRef.current = new CleanupManager();
  }

  // Cleanup on unmount - SSR safe
  React.useEffect(() => {
    const cleanup = () => {
      if (cleanupManagerRef.current) {
        cleanupManagerRef.current.cleanup();
      }
    };
    
    // Register cleanup for unmount - browser only
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanup);
      return () => {
        window.removeEventListener('beforeunload', cleanup);
        cleanup();
      };
    }
    
    return cleanup;
  }, []);

  return cleanupManagerRef.current;
}