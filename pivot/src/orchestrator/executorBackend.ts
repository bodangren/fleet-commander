import { ConvexHttpClient } from 'convex/browser';
import type { ResolveOptions } from './resolver';
import type { ExecutionResult } from './types';
import { executeTask } from './executor';
import { executeTaskViaPi } from './piExecutor';

/**
 * The execution backend that dispatches agent work.
 *
 * - `opencode` talks to the persistent OpenCode server over its SDK.
 * - `pi` spawns an isolated pi-measure-harness role per task and records a
 *   provenance receipt.
 */
export type ExecutorBackend = 'opencode' | 'pi';

export const DEFAULT_EXECUTOR_BACKEND: ExecutorBackend = 'opencode';

/**
 * Common shape of both backends, so the orchestrator can hold either without
 * knowing which one it has.
 */
export type BackendExecuteFn = (
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  taskKey: string,
  timeoutMs: number,
  maxTokens?: number,
  resolveOptions?: ResolveOptions,
) => Promise<ExecutionResult>;

/**
 * Reads the configured backend from the environment. Unrecognised values fall
 * back to the default rather than throwing, so a typo cannot halt dispatch.
 *
 * @param env - Environment to read, defaults to the process environment
 */
export function resolveExecutorBackend(
  env: NodeJS.ProcessEnv = process.env,
): ExecutorBackend {
  const raw = env.FLEET_EXECUTOR_BACKEND?.trim().toLowerCase();
  if (raw === 'pi') return 'pi';
  if (raw === 'opencode') return 'opencode';
  if (raw) {
    console.warn(
      `[executor] Unknown FLEET_EXECUTOR_BACKEND "${raw}", using "${DEFAULT_EXECUTOR_BACKEND}"`,
    );
  }
  return DEFAULT_EXECUTOR_BACKEND;
}

/**
 * Returns the execute function for a backend.
 *
 * @param backend - Backend to select, defaults to the configured one
 */
export function selectExecutor(
  backend: ExecutorBackend = resolveExecutorBackend(),
): BackendExecuteFn {
  return backend === 'pi' ? executeTaskViaPi : executeTask;
}
