/** Remembers the last call only; arguments are compared by identity. */
export function memoizeLast<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  let lastArgs: Args | null = null;
  let lastResult: Result;
  return (...args: Args) => {
    if (
      lastArgs &&
      lastArgs.length === args.length &&
      lastArgs.every((arg, i) => arg === args[i])
    ) {
      return lastResult;
    }
    lastResult = fn(...args);
    lastArgs = args;
    return lastResult;
  };
}
