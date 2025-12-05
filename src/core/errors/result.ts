/**
 * Result type for operation outcomes
 * Implements the Result pattern for type-safe error handling
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return err('Division by zero');
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.success) {
 *   console.log(result.data); // 5
 * } else {
 *   console.error(result.error); // Type-safe access to error
 * }
 * ```
 */

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Creates a successful Result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Creates a failed Result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if Result is a failure
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Maps a Result's success value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.success) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Maps a Result's error value
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (!result.success) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chains Result-returning operations
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}

/**
 * Unwraps a Result or returns a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

/**
 * Unwraps a Result or throws the error
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Converts a Promise to a Result
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    const mappedError = errorMapper ? errorMapper(error) : (error as E);
    return err(mappedError);
  }
}

/**
 * Combines multiple Results into a single Result
 * Returns ok with array of values if all succeed, or first error encountered
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.success) {
      return result;
    }
    values.push(result.data);
  }

  return ok(values);
}

/**
 * Wraps a function that might throw into a Result-returning function
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  errorMapper?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    const mappedError = errorMapper ? errorMapper(error) : (error as E);
    return err(mappedError);
  }
}

/**
 * Async version of tryCatch
 */
export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    const mappedError = errorMapper ? errorMapper(error) : (error as E);
    return err(mappedError);
  }
}
