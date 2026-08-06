/**
 * Estimates token count for text input (chars/4).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface TokenBudget {
  remaining: number;
}

/**
 * Reads a ReadableStream into chunks and accumulates text.
 * Kills the process if the shared token budget is exhausted.
 */
async function readStreamWithTokenLimit(
  stream: ReadableStream<Uint8Array>,
  proc: { kill: () => void },
  budget: TokenBudget | null,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulated += chunk;
      if (budget) {
        budget.remaining -= estimateTokens(chunk);
        if (budget.remaining < 0) {
          proc.kill();
          break;
        }
      }
    }
    accumulated += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

/**
 * Executes a generic shell command via Bun.spawn.
 * Streams stdout/stderr, enforces timeout and optional maxTokens.
 *
 * NOTE: Agent tasks go through `executeTaskViaPi` in `./piExecutor`. This
 * utility is for non-agent shell commands only (e.g. quality-workflow
 * lifecycle hooks).
 */
export async function executeCommand(
  command: string,
  args: string[],
  timeoutMs: number,
  maxTokens?: number,
  cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean; tokensExceeded: boolean }> {
  const proc = Bun.spawn({
    cmd: [command, ...args],
    stdout: 'pipe',
    stderr: 'pipe',
    cwd,
  });

  let timedOut = false;
  let tokensExceeded = false;

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, timeoutMs)
      : null;

  const budget =
    maxTokens !== undefined && maxTokens > 0
      ? { remaining: maxTokens }
      : null;

  const [stdout, stderr, exitCode] = await Promise.all([
    readStreamWithTokenLimit(proc.stdout, proc, budget),
    readStreamWithTokenLimit(proc.stderr, proc, budget),
    proc.exited,
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (budget && budget.remaining < 0) {
    tokensExceeded = true;
  }

  return { stdout, stderr, exitCode, timedOut, tokensExceeded };
}
