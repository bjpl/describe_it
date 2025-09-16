/**
 * Safe JSON parsing and stringification utilities
 * Prevents runtime crashes from malformed JSON
 */

/**
 * Safely parse JSON with error handling
 * @param text - JSON string to parse
 * @param fallback - Optional fallback value on parse failure
 * @returns Parsed object or fallback value
 */
export function safeParse<T = any>(
  text: string,
  fallback?: T
): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[safeParse] JSON parsing failed:', error);
    }
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 * @param value - Value to stringify
 * @param replacer - Optional replacer function or array
 * @param space - Optional indentation
 * @returns JSON string or undefined on error
 */
export function safeStringify(
  value: any,
  replacer?: (key: string, value: any) => any | (string | number)[],
  space?: string | number
): string | undefined {
  try {
    return JSON.stringify(value, replacer as any, space);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[safeStringify] JSON stringification failed:', error);
    }
    return undefined;
  }
}

/**
 * Parse JSON with validation using a schema
 * @param text - JSON string to parse
 * @param validator - Validation function
 * @returns Validated parsed object or undefined
 */
export function parseWithValidation<T>(
  text: string,
  validator: (data: unknown) => T | null
): T | undefined {
  const parsed = safeParse(text);
  if (parsed === undefined) return undefined;
  
  try {
    const validated = validator(parsed);
    return validated ?? undefined;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[parseWithValidation] Validation failed:', error);
    }
    return undefined;
  }
}

/**
 * Safely parse JSON from localStorage
 * @param key - localStorage key
 * @param fallback - Optional fallback value
 * @returns Parsed object or fallback
 */
export function safeParseLocalStorage<T = any>(
  key: string,
  fallback?: T
): T | undefined {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return safeParse<T>(item, fallback);
  } catch (error) {
    // localStorage might not be available (SSR, permissions)
    return fallback;
  }
}

/**
 * Safely stringify and store in localStorage
 * @param key - localStorage key
 * @param value - Value to store
 * @returns Success boolean
 */
export function safeSetLocalStorage(
  key: string,
  value: any
): boolean {
  try {
    const stringified = safeStringify(value);
    if (!stringified) return false;
    localStorage.setItem(key, stringified);
    return true;
  } catch (error) {
    // localStorage might be full or unavailable
    return false;
  }
}

/**
 * Deep clone an object using JSON (handles most simple cases)
 * @param obj - Object to clone
 * @returns Cloned object or undefined on error
 */
export function safeDeepClone<T>(obj: T): T | undefined {
  const stringified = safeStringify(obj);
  if (!stringified) return undefined;
  return safeParse<T>(stringified);
}

/**
 * Parse JSON with size limit to prevent DoS
 * @param text - JSON string to parse
 * @param maxLength - Maximum string length allowed
 * @returns Parsed object or undefined if too large
 */
export function safeParseLimited<T = any>(
  text: string,
  maxLength: number = 1024 * 1024 // 1MB default
): T | undefined {
  if (text.length > maxLength) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[safeParseLimited] JSON too large: ${text.length} > ${maxLength}`);
    }
    return undefined;
  }
  return safeParse<T>(text);
}