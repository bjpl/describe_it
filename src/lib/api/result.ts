/**
 * Result Type for Type-Safe Error Handling
 *
 * Provides a functional approach to error handling without exceptions.
 * Inspired by Rust's Result<T, E> pattern.
 */

export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Standard API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
  timestamp?: string;
  path?: string;
}

/**
 * Create a successful result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function err<T = never>(error: ApiError): Result<T> {
  return { success: false, error };
}

/**
 * Type guard for successful results
 */
export function isOk<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard for failed results
 */
export function isErr<T>(result: Result<T>): result is { success: false; error: ApiError } {
  return result.success === false;
}

/**
 * Unwrap result or throw error
 */
export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw new Error(result.error.message);
}

/**
 * Unwrap result or return default value
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return isOk(result) ? result.data : defaultValue;
}

/**
 * Map a successful result to a new value
 */
export function map<T, U>(
  result: Result<T>,
  fn: (data: T) => U
): Result<U> {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Map an error to a new error
 */
export function mapErr<T>(
  result: Result<T>,
  fn: (error: ApiError) => ApiError
): Result<T> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain async operations that return Results
 */
export async function andThen<T, U>(
  result: Result<T>,
  fn: (data: T) => Promise<Result<U>>
): Promise<Result<U>> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Convert an error code to a standard ApiError
 */
export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  status?: number
): ApiError {
  return {
    code,
    message,
    details,
    status,
    timestamp: new Date().toISOString(),
  };
}
