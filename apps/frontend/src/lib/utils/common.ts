import { NullOrUndefinedValueError, AssertionError } from "./errors";
/**
 * Explicitly marks a promise as something we won't await
 * @param _promise
 */
export function spawn(_promise: Promise<any>) {} // eslint-disable-line

/**
 * Explicitly mark that a cast is safe.
 * e.g. `safeCast(x as string[])`.
 */
export function safeCast<T>(x: T): T {
  return x;
}

/**
 * Marks that a cast should be checked at runtime.
 * Usually this is at some system boundary, e.g. a message received over the network.
 */
export function uncheckedCast<T>(x: any): T {
  return x;
}

/**
 * Asserts that a condition is true.
 * @param cond
 * @param msg
 */
export function assert<T>(cond: T, msg: string): asserts cond {
  if (!cond) {
    // eslint-disable-next-line no-debugger
    debugger;
    throw new AssertionError(msg || "Assertion failed");
  }
}

/**
 * Asserts that a branch is never taken.
 * Useful for exhaustiveness checking.
 * @param _x
 */
export function assertNever(_x: never): never {
  throw new Error("unexpected branch taken");
}

/**
 * Asserts that a value is not null or undefined.
 * @param x
 * @param msg
 * @returns
 */
export function ensure<T>(x: T | null | undefined, msg: string): T {
  if (x === null || x === undefined) {
    // eslint-disable-next-line no-debugger
    debugger;
    throw new NullOrUndefinedValueError(
      `Value must not be undefined or null${msg ? `- ${msg}` : ""}`,
    );
  } else {
    return x;
  }
}
