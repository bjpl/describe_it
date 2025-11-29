/**
 * Optimized State Management Hook
 * Prevents unnecessary re-renders and manages component state efficiently
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { isDevelopment } from '@/config/env';
import { logger } from '@/lib/logger';

interface OptimizedStateOptions<T> {
  initialValue: T;
  compare?: (prev: T, next: T) => boolean;
  debug?: boolean;
}

interface OptimizedStateResult<T> {
  value: T;
  setValue: (newValue: T | ((prev: T) => T)) => void;
  reset: () => void;
  isStale: boolean;
}

/**
 * Deep equality comparison for objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Optimized state hook with intelligent re-render prevention
 */
export function useOptimizedState<T>(
  options: OptimizedStateOptions<T>
): OptimizedStateResult<T> {
  const { initialValue, compare = deepEqual, debug = false } = options;
  const [value, setValueInternal] = useState<T>(initialValue);
  const previousValue = useRef<T>(initialValue);
  const renderCount = useRef<number>(0);
  const lastUpdate = useRef<number>(Date.now());

  // Track render count in development
  useEffect(() => {
    renderCount.current++;
    if (debug && isDevelopment()) {
      logger.info(`useOptimizedState render #${renderCount.current}:`, {
        currentValue: value,
        previousValue: previousValue.current,
        hasChanged: !compare(value, previousValue.current),
        timeSinceLastUpdate: Date.now() - lastUpdate.current,
      });
    }
  });

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value)
        : newValue;

      // Only update if value actually changed
      if (!compare(value, nextValue)) {
        previousValue.current = value;
        lastUpdate.current = Date.now();
        setValueInternal(nextValue);
        
        if (debug && isDevelopment()) {
          logger.info('useOptimizedState: Value updated', {
            from: value,
            to: nextValue,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (debug && isDevelopment()) {
        logger.info('useOptimizedState: Update skipped (no change)', {
          attempted: nextValue,
          current: value,
        });
      }
    },
    [value, compare, debug]
  );

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue, setValue]);

  const isStale = useMemo(() => {
    return Date.now() - lastUpdate.current > 60000; // 1 minute
  }, []);

  return {
    value,
    setValue,
    reset,
    isStale,
  };
}

/**
 * Optimized array state hook with efficient array operations
 */
export function useOptimizedArray<T>(initialArray: T[] = []) {
  const { value: items, setValue } = useOptimizedState({
    initialValue: initialArray,
    compare: deepEqual,
  });

  const addItem = useCallback((item: T) => {
    setValue(prev => [...prev, item]);
  }, [setValue]);

  const removeItem = useCallback((index: number) => {
    setValue(prev => prev.filter((_, i) => i !== index));
  }, [setValue]);

  const updateItem = useCallback((index: number, newItem: T) => {
    setValue(prev => prev.map((item, i) => i === index ? newItem : item));
  }, [setValue]);

  const insertItem = useCallback((index: number, item: T) => {
    setValue(prev => [
      ...prev.slice(0, index),
      item,
      ...prev.slice(index)
    ]);
  }, [setValue]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setValue(prev => {
      const newArray = [...prev];
      const [movedItem] = newArray.splice(fromIndex, 1);
      newArray.splice(toIndex, 0, movedItem);
      return newArray;
    });
  }, [setValue]);

  const clear = useCallback(() => {
    setValue([]);
  }, [setValue]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    insertItem,
    moveItem,
    clear,
    length: items.length,
    isEmpty: items.length === 0,
  };
}

/**
 * Optimized object state hook for complex state objects
 */
export function useOptimizedObject<T extends object>(initialObject: T) {
  const { value: object, setValue } = useOptimizedState({
    initialValue: initialObject,
    compare: deepEqual,
  });

  const updateField = useCallback(<K extends keyof T>(
    field: K, 
    value: T[K]
  ) => {
    setValue(prev => ({ ...prev, [field]: value }));
  }, [setValue]);

  const updateFields = useCallback((fields: Partial<T>) => {
    setValue(prev => ({ ...prev, ...fields }));
  }, [setValue]);

  const resetField = useCallback(<K extends keyof T>(field: K) => {
    setValue(prev => ({ ...prev, [field]: initialObject[field] }));
  }, [setValue, initialObject]);

  return {
    object,
    updateField,
    updateFields,
    resetField,
    reset: () => setValue(initialObject),
  };
}

/**
 * Memory-efficient selector hook for derived state
 */
export function useOptimizedSelector<T, R>(
  state: T,
  selector: (state: T) => R,
  deps: React.DependencyList = []
): R {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedSelector = useCallback(selector, deps);

  return useMemo(() => {
    return memoizedSelector(state);
  }, [state, memoizedSelector]);
}

export default useOptimizedState;