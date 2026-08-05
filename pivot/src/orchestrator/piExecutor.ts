import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { ConvexHttpClient } from 'convex/browser';
import { resolveAgentCommand, type ResolveOptions } from './resolver';
import type { ExecutionResult } from './types';
import {
  buildPiArgs,
  finalAssistantText,
  hasMeasureResultBlock,
  loadModelMap,
  loadPiAgents,
  parsePiEventStream,
  resolveHarnessRoot,
  selectPiAgent,
  sumTokenUsage,
  type PiAgentDefinition,
} from './piHarness';

/**
 * Provenance record written for every Pi dispatch. Field-compatible with the
 * receipts the harness `task` tool writes, so both producers can be read by
 * the same tooling.
 */
export interface PiTaskReceipt {
  taskId: string;
  continuedFrom?: string;
  parentAgent: string;
  childAgent: string;
  parentSessionId: string;
  cwd: string;
  model?: string;
  promptHash: string;
  outputHash: string;
  startHead?: string;
  endHead?: string;
  exitCode: number;
  startedAt: string;
  completedAt: string;
  finalOutput: string;
  stderr: string;
  logPath: string;
}

/**
 * Injection seam for tests: everything that touches the machine.
 */
export interface PiExecutorDeps {
  spawnPi: (
    args: string[],
    opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
  ) => Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }>;
  gitHead: (cwd: string) => string | undefined;
  writeReceipt: (receipt: PiTaskReceipt, rawLines: string[]) => void;
  now: () => number;
  loadRoster: () => PiAgentDefinition[];
  cwd: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Resolves the directory Pi receipts are written to. Shared with the harness
 * so receipts from both dispatch paths land in one place.
 */
export function receiptDir(env: NodeJS.ProcessEnv = process.env): string {
  const agentDir = env.PI_AGENT_DIR?.trim() || resolve(homedir(), '.pi', 'agent');
  return resolve(agentDir, 'measure-harness', 'tasks');
}

/**
 * Spawns a non-interactive Pi child process, enforcing a wall-clock timeout.
 *
 * @param args - Argument vector from buildPiArgs
 * @param opts.cwd - Working directory for the child
 * @param opts.timeoutMs - Wall-clock limit; 0 or less disables the timeout
 */
export async function spawnPiProcess(
  args: string[],
  opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  const proc = Bun.spawn({
    cmd: ['pi', ...args],
    cwd: opts.cwd,
    env: opts.env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  const timeoutId =
    opts.timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, opts.timeoutMs)
      : null;

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (timeoutId) clearTimeout(timeoutId);

  return { stdout, stderr, exitCode, timedOut };
}

/**
 * Reads the current git HEAD of a directory, or undefined when it is not a
 * repository.
 *
 * @param cwd - Directory to inspect
 */
export function readGitHead(cwd: string): string | undefined {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/**
 * Persists a receipt and its raw event log with owner-only permissions.
 *
 * @param receipt - Provenance record to write
 * @param rawLines - Unparsed stdout lines from the child
 */
export function writeReceiptToDisk(receipt: PiTaskReceipt, rawLines: string[]): void {
  const dir = receiptDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(receipt.logPath, `${rawLines.join('\n')}\n`, { mode: 0o600 });
  writeFileSync(
    resolve(dir, `${receipt.taskId}.json`),
    `${JSON.stringify(receipt, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function defaultDeps(): PiExecutorDeps {
  const harnessRoot = resolveHarnessRoot();
  return {
    spawnPi: spawnPiProcess,
    gitHead: readGitHead,
    writeReceipt: writeReceiptToDisk,
    now: Date.now,
    loadRoster: () => loadPiAgents(harnessRoot, loadModelMap(harnessRoot)),
    cwd: process.cwd(),
  };
}

function failure(
  taskKey: string,
  error: string,
  durationMs = 0,
): ExecutionResult {
  return {
    taskKey,
    status: 'failed',
    durationMs,
    error,
    failureType: 'unknown',
    output: '',
  };
}

/**
 * Dispatches a task to a pi-measure-harness role in an isolated Pi process and
 * returns a structured result.
 *
 * Drop-in replacement for `executeTask` from `./executor`: same positional
 * signature, same `ExecutionResult` contract. Two semantics differ by design,
 * both inherited from the harness:
 *
 * - Continuity is receipt-based, not server-session-based. `sessionId` carries
 *   a Pi task id; on a retry the prior run's final output is prepended to the
 *   prompt, exactly as the harness `task` tool does with `task_id`.
 * - An unmapped model fails closed rather than passing the untranslated
 *   reference to the CLI.
 *
 * @param client - Convex HTTP client used to resolve the Fleet agent
 * @param agentTag - Fleet agent name
 * @param prompt - Prompt text
 * @param taskKey - Task key, recorded on the result and the receipt
 * @param timeoutMs - Wall-clock limit for the child process
 * @param maxTokens - Optional cap; exceeding it marks the run tokens_exceeded
 * @param resolveOptions - Session continuation options
 * @param deps - Injection seam for tests
 */
export async function executeTaskViaPi(
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  taskKey: string,
  timeoutMs: number,
  maxTokens?: number,
  resolveOptions?: ResolveOptions,
  deps: PiExecutorDeps = defaultDeps(),
): Promise<ExecutionResult> {
  const resolved = await resolveAgentCommand(client, agentTag, resolveOptions);
  if (!resolved.providerId || !resolved.modelId) {
    return failure(
      taskKey,
      `Agent "${agentTag}" could not be resolved to a valid harness`,
    );
  }

  const openCodeModelRef = `${resolved.providerId}/${resolved.modelId}`;

  let roster: PiAgentDefinition[];
  try {
    roster = deps.loadRoster();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return failure(taskKey, `Failed to load pi-measure-harness roster: ${message}`);
  }

  const selection = selectPiAgent(roster, openCodeModelRef, resolveOptions?.piRole);
  if (!selection.ok) {
    return failure(taskKey, selection.reason);
  }
  const { agent: child, modelRef } = selection;

  const continuedFrom = resolveOptions?.sessionId;
  const continuationText = resolveOptions?.continuationOutput
    ? `\n\nContinuation from task ${continuedFrom}:\n${resolveOptions.continuationOutput}`
    : '';
  const fullPrompt = `Task: ${prompt}${continuationText}`;

  const taskId = randomUUID();
  const logPath = resolve(receiptDir(), `${taskId}.jsonl`);
  const startedAtMs = deps.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const startHead = deps.gitHead(deps.cwd);

  const { stdout, stderr, exitCode, timedOut } = await deps.spawnPi(
    buildPiArgs({ agent: child, modelRef, prompt: fullPrompt }),
    {
      cwd: deps.cwd,
      env: {
        ...process.env,
        PI_MEASURE_AGENT: child.name,
        PI_MEASURE_TASK_ID: taskId,
        PI_MEASURE_PARENT_SESSION_ID: taskKey,
        PI_MEASURE_RESULT_PATH: '',
      },
      timeoutMs,
    },
  );

  const durationMs = deps.now() - startedAtMs;
  const { events, rawLines } = parsePiEventStream(stdout);
  const output = finalAssistantText(events);
  const usage = sumTokenUsage(events);

  const receipt: PiTaskReceipt = {
    taskId,
    continuedFrom,
    parentAgent: agentTag,
    childAgent: child.name,
    parentSessionId: taskKey,
    cwd: deps.cwd,
    model: modelRef,
    promptHash: sha256(fullPrompt),
    outputHash: sha256(output),
    startHead,
    endHead: deps.gitHead(deps.cwd),
    exitCode,
    startedAt,
    completedAt: new Date(deps.now()).toISOString(),
    finalOutput: output,
    stderr,
    logPath,
  };
  deps.writeReceipt(receipt, rawLines);

  const base = {
    taskKey,
    durationMs,
    output,
    sessionId: taskId,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    model: modelRef,
  };

  if (timedOut) {
    return {
      ...base,
      status: 'failed',
      error: `Pi child process exceeded ${timeoutMs}ms`,
      failureType: 'timeout',
    };
  }

  if (
    maxTokens !== undefined &&
    maxTokens > 0 &&
    usage &&
    usage.inputTokens + usage.outputTokens > maxTokens
  ) {
    return {
      ...base,
      status: 'failed',
      error: `Output exceeded maxTokens limit of ${maxTokens}`,
      failureType: 'tokens_exceeded',
    };
  }

  if (exitCode !== 0) {
    return {
      ...base,
      status: 'failed',
      exitCode,
      error: stderr.trim() || `Pi child process exited ${exitCode}`,
      failureType: 'exit_code',
    };
  }

  if (!output) {
    return {
      ...base,
      status: 'failed',
      error: 'Pi child process produced no final assistant output',
      failureType: 'unknown',
    };
  }

  if (child.name.startsWith('measure-') && !hasMeasureResultBlock(output)) {
    return {
      ...base,
      status: 'failed',
      error: `Role ${child.name} returned no MEASURE_AGENT_RESULT block`,
      failureType: 'unknown',
    };
  }

  return { ...base, status: 'succeeded', exitCode: 0 };
}

/**
 * Reports whether the Pi CLI and the harness package are both present, so the
 * orchestrator can refuse to select the Pi backend on a machine that cannot
 * run it instead of failing task by task.
 *
 * @param env - Environment to read, defaults to the process environment
 */
export function piBackendAvailable(env: NodeJS.ProcessEnv = process.env): {
  ok: boolean;
  reason?: string;
} {
  const harnessRoot = resolveHarnessRoot(env);
  if (!existsSync(resolve(harnessRoot, 'agents'))) {
    return { ok: false, reason: `pi-measure-harness not found at ${harnessRoot}` };
  }
  if (!existsSync(resolve(harnessRoot, 'config', 'model-map.json'))) {
    return { ok: false, reason: `pi-measure-harness model map missing at ${harnessRoot}` };
  }
  const probe = spawnSync('pi', ['--version'], { encoding: 'utf8' });
  if (probe.status !== 0) {
    return { ok: false, reason: 'pi CLI is not on PATH' };
  }
  return { ok: true };
}
