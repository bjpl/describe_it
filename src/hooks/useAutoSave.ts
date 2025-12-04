import { useEffect, useRef, useCallback } from "react";
import { useDebounce } from "./useDebounce";
import { logger } from "@/lib/logger";

export interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void> | void;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  forceSave: () => Promise<void>;
}

/**
 * Auto-save hook with debouncing
 * Automatically saves data after a specified delay when it changes
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const debouncedData = useDebounce(data, delay);
  const previousDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);
  const lastSavedRef = useRef<Date | null>(null);
  const errorRef = useRef<Error | null>(null);
  const initialRenderRef = useRef(true);

  const save = useCallback(
    async (dataToSave: T) => {
      if (isSavingRef.current || !enabled) return;

      try {
        isSavingRef.current = true;
        errorRef.current = null;

        await onSave(dataToSave);

        lastSavedRef.current = new Date();
        previousDataRef.current = dataToSave;

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errorRef.current = err;
        logger.error("Auto-save failed:", err);

        if (onError) {
          onError(err);
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [enabled, onSave, onSuccess, onError]
  );

  const forceSave = useCallback(async () => {
    await save(data);
  }, [data, save]);

  useEffect(() => {
    // Skip initial render
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      previousDataRef.current = debouncedData;
      return;
    }

    // Only save if data has actually changed
    if (
      enabled &&
      JSON.stringify(debouncedData) !== JSON.stringify(previousDataRef.current)
    ) {
      save(debouncedData);
    }
  }, [debouncedData, enabled, save]);

  return {
    isSaving: isSavingRef.current,
    lastSaved: lastSavedRef.current,
    error: errorRef.current,
    forceSave,
  };
}
