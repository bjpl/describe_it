import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== "undefined") {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      logger.warn(
        `Error reading localStorage key "${key}"`,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: "useLocalStorage",
          key,
          operation: "read",
        },
      );
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      logger.warn(
        `Error setting localStorage key "${key}"`,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: "useLocalStorage",
          key,
          operation: "write",
        },
      );
    }
  };

  return [storedValue, setValue];
}
