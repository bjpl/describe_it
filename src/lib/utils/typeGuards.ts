/**
 * Type Guard Utilities
 * Provides type-safe casting and validation utilities for TypeScript
 */

import { LogContext } from '@/lib/logger';

/**
 * Type guard to safely cast unknown values to LogContext
 * This is useful when dealing with API responses or third-party data
 * that should conform to the LogContext interface
 *
 * @param ctx - The value to cast to LogContext
 * @returns The value cast as LogContext
 *
 * @example
 * const unknownData: unknown = { userId: '123', requestId: 'abc' };
 * const logContext = asLogContext(unknownData);
 * logger.info('User action', logContext);
 */
export function asLogContext(ctx: unknown): LogContext {
  // If the value is null or undefined, return an empty object
  if (ctx === null || ctx === undefined) {
    return {};
  }

  // If it's already an object, cast it
  if (typeof ctx === 'object') {
    return ctx as LogContext;
  }

  // For primitive values, wrap them
  return { value: ctx } as LogContext;
}

/**
 * Validates if a value is a valid LogContext
 * Performs runtime type checking
 *
 * @param value - The value to check
 * @returns True if the value is a valid LogContext
 */
export function isLogContext(value: unknown): value is LogContext {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value !== 'object') {
    return false;
  }

  // LogContext is an object with optional string keys
  return true;
}

/**
 * Safely merges multiple LogContext objects
 * Later contexts override earlier ones
 *
 * @param contexts - Variable number of LogContext objects to merge
 * @returns A merged LogContext object
 */
export function mergeLogContexts(...contexts: Array<LogContext | unknown>): LogContext {
  return contexts.reduce<LogContext>((acc, ctx) => {
    if (isLogContext(ctx)) {
      return { ...acc, ...ctx };
    }
    return acc;
  }, {});
}

/**
 * Type guard for checking if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for checking if a value is an object (but not null or array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if a value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard for checking if a value is an Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safe string conversion
 * Converts any value to a string, handling nulls and undefined
 */
export function asString(value: unknown, defaultValue = ''): string {
  if (isNullOrUndefined(value)) {
    return defaultValue;
  }

  if (isString(value)) {
    return value;
  }

  if (isNumber(value) || isBoolean(value)) {
    return String(value);
  }

  if (isObject(value) || isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return defaultValue;
    }
  }

  return defaultValue;
}

/**
 * Safe number conversion
 * Converts any value to a number, handling nulls and undefined
 */
export function asNumber(value: unknown, defaultValue = 0): number {
  if (isNullOrUndefined(value)) {
    return defaultValue;
  }

  if (isNumber(value)) {
    return value;
  }

  if (isString(value)) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  return defaultValue;
}

/**
 * Safe boolean conversion
 * Converts any value to a boolean
 */
export function asBoolean(value: unknown, defaultValue = false): boolean {
  if (isNullOrUndefined(value)) {
    return defaultValue;
  }

  if (isBoolean(value)) {
    return value;
  }

  if (isString(value)) {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (isNumber(value)) {
    return value !== 0;
  }

  return defaultValue;
}
