/**
 * Deferred Value Hook
 *
 * Defers non-critical updates to improve responsiveness
 * Similar to React 18's useDeferredValue but with more control
 */

import { useState, useEffect, useRef, useTransition } from 'react';

export interface DeferOptions {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Hook to defer state updates for non-urgent UI updates
 *
 * Useful for:
 * - Search input (defer filtering while typing)
 * - Expensive computations
 * - Large list rendering
 * - Non-critical UI updates
 */
export function useDeferredValue<T>(value: T, options: DeferOptions = {}): T {
  const { timeout = 100, priority = 'low' } = options;
  const [deferredValue, setDeferredValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Immediate update for high priority
    if (priority === 'high') {
      setDeferredValue(value);
      return;
    }

    // Deferred update for low/normal priority
    const delay = priority === 'normal' ? timeout / 2 : timeout;

    timeoutRef.current = setTimeout(() => {
      setDeferredValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, timeout, priority]);

  return deferredValue;
}

/**
 * Hook to create a transition for expensive state updates
 * Wrapper around React 18's useTransition
 */
export function useTransitionWrapper() {
  // React 18's useTransition is always available
  const [isPending, startTransition] = useTransition();
  return { isPending, startTransition };
}

/**
 * Hook to debounce a value with improved performance
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return debouncedValue;
}

/**
 * Hook to throttle a value
 */
export function useThrottledValue<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= interval) {
      // Update immediately if enough time has passed
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      // Schedule update for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const remainingTime = interval - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, remainingTime);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook to defer expensive computations
 */
export function useDeferredComputation<T>(
  compute: () => T,
  deps: React.DependencyList,
  options: DeferOptions = {}
): { value: T | undefined; isPending: boolean } {
  const { timeout = 100 } = options;
  const [value, setValue] = useState<T>();
  const [isPending, setIsPending] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    setIsPending(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Defer the computation
    timeoutRef.current = setTimeout(() => {
      const result = compute();
      setValue(result);
      setIsPending(false);
    }, timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { value, isPending };
}

/**
 * Hook for idle callback execution
 * Executes callback when browser is idle
 */
export function useIdleCallback(
  callback: () => void,
  deps: React.DependencyList
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(
        callback,
        { timeout: 1000 } // Execute within 1 second even if not idle
      );

      return () => {
        window.cancelIdleCallback(handle);
      };
    } else {
      // Fallback to setTimeout
      const timeout = setTimeout(callback, 100);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to prioritize updates
 * High priority updates execute immediately
 * Low priority updates are deferred
 */
export function usePrioritizedValue<T>(
  value: T,
  isPriority: boolean
): T {
  const deferredValue = useDeferredValue(value, {
    priority: isPriority ? 'high' : 'low',
  });

  return isPriority ? value : deferredValue;
}
