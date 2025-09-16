import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from '@/lib/utils/json-safe';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const item = safeParseLocalStorage(key, initialValue);
      return item !== undefined ? item : initialValue;
    }
    return initialValue;
  });

  const setValue = (value: T) => {
    setStoredValue(value);
    if (typeof window !== "undefined") {
      if (!safeSetLocalStorage(key, value)) {
        logger.warn(`Failed to save localStorage key "${key}"`);
      }
    }
  };

  return [storedValue, setValue];
}
