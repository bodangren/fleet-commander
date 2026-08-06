import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildPiPromptArgs,
  finalAssistantText,
  loadModelMap,
  parsePiEventStream,
  resolveHarnessRoot,
  sumTokenUsage,
  toPiModelRef,
} from './piHarness';
import { spawnPiProcess } from './piExecutor';

/**
 * Result of a one-shot Pi prompt.
 */
export interface PiPromptResult {
  output: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Injection seam for tests.
 */
export interface PiPromptDeps {
  spawnPi: typeof spawnPiProcess;
  loadModelMap: () => Record<string, string>;
  makeScratchDir: () => string;
}

function defaultDeps(): PiPromptDeps {
  const harnessRoot = resolveHarnessRoot();
  return {
    spawnPi: spawnPiProcess,
    loadModelMap: () => loadModelMap(harnessRoot),
    makeScratchDir: () => mkdtempSync(resolve(tmpdir(), 'pi-prompt-')),
  };
}

/**
 * Runs a single prompt through a Pi child process and returns its text.
 *
 * This is the text-generation counterpart to `executeTaskViaPi`: no Convex
 * agent lookup, no harness role, no receipt, no session continuity — just
 * prompt in, text out. It exists for callers that previously drove the
 * OpenCode SDK directly for one-shot generation (story generation,
 * retrospective reports).
 *
 * The model reference is translated through the harness model map, but no
 * `coder-*` role is required: under a role's system prompt a generation prompt
 * returns empty assistant content, since the roles are primed to work on a
 * repository rather than to write prose.
 *
 * The child runs in an ephemeral scratch directory rather than the repository,
 * because these callers want text and have no business editing the tree.
 *
 * Errors are returned rather than thrown, so route handlers can map them to a
 * status code without a try/catch around every call.
 *
 * @param opts.modelRef - OpenCode-style `provider/model` reference
 * @param opts.prompt - Prompt text
 * @param opts.timeoutMs - Wall-clock limit for the child
 * @param opts.maxTokens - Optional cap; exceeding it is reported as an error
 * @param deps - Injection seam for tests
 */
export async function runPiPrompt(
  opts: {
    modelRef: string;
    prompt: string;
    timeoutMs: number;
    maxTokens?: number;
  },
  deps: PiPromptDeps = defaultDeps(),
): Promise<PiPromptResult> {
  let modelMap: Record<string, string>;
  try {
    modelMap = deps.loadModelMap();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: '', error: `Failed to load pi-measure-harness model map: ${message}` };
  }

  const piModelRef = toPiModelRef(opts.modelRef, modelMap);
  if (!piModelRef) {
    return {
      output: '',
      error: `Model "${opts.modelRef}" is not in the harness model map`,
    };
  }

  let cwd: string;
  try {
    cwd = deps.makeScratchDir();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: '', error: `Failed to create scratch directory: ${message}` };
  }

  const { stdout, stderr, exitCode, timedOut } = await deps.spawnPi(
    buildPiPromptArgs({ modelRef: piModelRef, prompt: opts.prompt }),
    { cwd, env: { ...process.env }, timeoutMs: opts.timeoutMs },
  );

  if (timedOut) {
    return { output: '', error: `Pi child process exceeded ${opts.timeoutMs}ms` };
  }

  const { events } = parsePiEventStream(stdout);
  const output = finalAssistantText(events);
  const usage = sumTokenUsage(events);
  const tokens = {
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
  };

  if (exitCode !== 0) {
    return {
      output,
      ...tokens,
      error: stderr.trim() || `Pi child process exited ${exitCode}`,
    };
  }

  if (!output) {
    return {
      output: '',
      ...tokens,
      error: 'Pi child process produced no final assistant output',
    };
  }

  if (
    opts.maxTokens !== undefined &&
    opts.maxTokens > 0 &&
    usage &&
    usage.inputTokens + usage.outputTokens > opts.maxTokens
  ) {
    return {
      output,
      ...tokens,
      error: `Output exceeded maxTokens limit of ${opts.maxTokens}`,
    };
  }

  return { output, ...tokens };
}
