/**
 * Result pattern for operations that can fail.
 * Used throughout the codebase for type-safe error handling.
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Creates a successful Result.
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Creates a failed Result.
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Unwraps a Result, throwing the error if it's a failure.
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwraps a Result, returning a default value if it's a failure.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Maps the success value of a Result.
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Maps the error value of a Result.
 */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (result.success) {
    return result;
  }
  return failure(fn(result.error));
}
