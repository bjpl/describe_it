'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// Hook to prevent memory leaks from event listeners
export const useEventListenerCleanup = () => {
  const listenersRef = useRef<Array<{
    element: EventTarget;
    event: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>>([]);

  const addListener = useCallback(
    (element: EventTarget, event: string, handler: EventListener, options?: boolean | AddEventListenerOptions) => {
      element.addEventListener(event, handler, options);
      listenersRef.current.push({ element, event, handler, options });
    },
    []
  );

  const removeListener = useCallback(
    (element: EventTarget, event: string, handler: EventListener) => {
      element.removeEventListener(event, handler);
      listenersRef.current = listenersRef.current.filter(
        listener => !(listener.element === element && listener.event === event && listener.handler === handler)
      );
    },
    []
  );

  const removeAllListeners = useCallback(() => {
    listenersRef.current.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    return removeAllListeners;
  }, [removeAllListeners]);

  return { addListener, removeListener, removeAllListeners };
};

// Hook to prevent memory leaks from timers
export const useTimerCleanup = () => {
  const timersRef = useRef<Array<NodeJS.Timeout | number>>([]);

  const setTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = globalThis.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const setInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = globalThis.setInterval(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const clearTimer = useCallback((timer: NodeJS.Timeout | number) => {
    globalThis.clearTimeout(timer);
    globalThis.clearInterval(timer);
    timersRef.current = timersRef.current.filter(t => t !== timer);
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => {
      globalThis.clearTimeout(timer);
      globalThis.clearInterval(timer);
    });
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return clearAllTimers;
  }, [clearAllTimers]);

  return { setTimeout, setInterval, clearTimer, clearAllTimers };
};

// Hook to prevent memory leaks from promises
export const usePromiseCleanup = () => {
  const abortControllersRef = useRef<Array<AbortController>>([]);

  const createAbortController = useCallback((): AbortController => {
    const controller = new AbortController();
    abortControllersRef.current.push(controller);
    return controller;
  }, []);

  const abortController = useCallback((controller: AbortController) => {
    controller.abort();
    abortControllersRef.current = abortControllersRef.current.filter(c => c !== controller);
  }, []);

  const abortAllControllers = useCallback(() => {
    abortControllersRef.current.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    abortControllersRef.current = [];
  }, []);

  useEffect(() => {
    return abortAllControllers;
  }, [abortAllControllers]);

  return {
    createAbortController,
    abortController,
    abortAllControllers
  };
};

// Comprehensive memory leak prevention hook
export const useMemoryLeakPrevention = (componentName: string) => {
  const eventCleanup = useEventListenerCleanup();
  const timerCleanup = useTimerCleanup();
  const promiseCleanup = usePromiseCleanup();

  // Cleanup everything on unmount
  useEffect(() => {
    return () => {
      eventCleanup.removeAllListeners();
      timerCleanup.clearAllTimers();
      promiseCleanup.abortAllControllers();
    };
  }, [eventCleanup, timerCleanup, promiseCleanup]);

  return {
    ...eventCleanup,
    ...timerCleanup,
    ...promiseCleanup
  };
};