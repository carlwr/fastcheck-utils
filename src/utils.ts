export type AnyFunction = (...args: never) => unknown

/**
 * Return an error whose stack trace starts at the caller of `fromFn`.
 *
 * Using this function allows traces that point to the code that caused the error instead of pointing to library code. The `fromFn` should be the function that throws.
 *
 * This function might only trim the stack properly for the V8 runtime. For other runtimes, the stack is possibly left untouched.
*/
export function callerError(fromFn: AnyFunction, message: string): Error {
  const error = new Error(message)
  Error.captureStackTrace?.(error, fromFn)
  return error
}
