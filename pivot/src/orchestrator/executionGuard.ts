/**
 * Wraps an async function with an execution guard that prevents overlapping invocations.
 * If the wrapped function is already running, subsequent calls are skipped.
 * @param fn - The async function to guard
 * @param onSkipped - Optional callback invoked when a call is skipped
 * @returns Wrapped function that skips overlapping calls
 */
export function withExecutionGuard<TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  onSkipped?: () => void,
): (...args: TArgs) => Promise<TResult | null> {
  let running = false;

  return async (...args: TArgs): Promise<TResult | null> => {
    if (running) {
      onSkipped?.();
      return null;
    }
    running = true;
    try {
      return await fn(...args);
    } finally {
      running = false;
    }
  };
}
