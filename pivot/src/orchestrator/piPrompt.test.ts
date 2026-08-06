import { describe, it, expect } from 'bun:test';
import { runPiPrompt, type PiPromptDeps } from './piPrompt';

const MODEL_MAP = { 'openai/gpt-5.6-luna': 'openai-codex/gpt-5.6-luna' };

function assistantEvent(text: string): string {
  return JSON.stringify({
    type: 'message_end',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  });
}

function usageEvent(input: number, output: number): string {
  return JSON.stringify({
    type: 'turn_end',
    message: { usage: { input, output, cost: { total: 0 } } },
  });
}

type SpawnCall = Parameters<PiPromptDeps['spawnPi']>;

function makeDeps(
  overrides: Partial<PiPromptDeps> = {},
): PiPromptDeps & { calls: SpawnCall[] } {
  const calls: SpawnCall[] = [];
  const deps: PiPromptDeps = {
    spawnPi: async (...args: SpawnCall) => {
      calls.push(args);
      return {
        stdout: [usageEvent(50, 5), assistantEvent('generated text')].join('\n'),
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
    },
    loadModelMap: () => MODEL_MAP,
    makeScratchDir: () => '/tmp/scratch-xyz',
    ...overrides,
  };
  return Object.assign(deps, { calls });
}

const BASE = { modelRef: 'openai/gpt-5.6-luna', prompt: 'write a story', timeoutMs: 60_000 };

describe('runPiPrompt', () => {
  it('returns the generated text and usage', async () => {
    const result = await runPiPrompt(BASE, makeDeps());
    expect(result.output).toBe('generated text');
    expect(result.error).toBeUndefined();
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(5);
  });

  it('runs in a scratch directory, never the repository', async () => {
    const deps = makeDeps();
    await runPiPrompt(BASE, deps);
    expect(deps.calls[0]![1].cwd).toBe('/tmp/scratch-xyz');
    expect(deps.calls[0]![1].cwd).not.toContain('fleet-commander');
  });

  it('passes the prompt through unwrapped, with the mapped model', async () => {
    const deps = makeDeps();
    await runPiPrompt(BASE, deps);
    const args = deps.calls[0]![0];
    expect(args[args.length - 1]).toBe('write a story');
    expect(args[args.indexOf('--model') + 1]).toBe('openai-codex/gpt-5.6-luna');
  });

  it('reports an unmapped model as an error instead of throwing', async () => {
    const result = await runPiPrompt({ ...BASE, modelRef: 'openai/gpt-4o-mini' }, makeDeps());
    expect(result.output).toBe('');
    expect(result.error).toContain('not in the harness model map');
  });

  it('reports a model-map load failure', async () => {
    const result = await runPiPrompt(
      BASE,
      makeDeps({
        loadModelMap: () => {
          throw new Error('ENOENT');
        },
      }),
    );
    expect(result.error).toContain('Failed to load pi-measure-harness model map');
  });

  it('runs the bare model with tools off and no role', async () => {
    // Under a coder-* role's system prompt the assistant returns empty content
    // for a generation prompt; the roles are primed to act, not to write.
    const deps = makeDeps();
    await runPiPrompt(BASE, deps);
    const args = deps.calls[0]![0];
    expect(args).toContain('--no-tools');
    expect(args).not.toContain('--agent');
    expect(args).not.toContain('--tools');
  });

  it('reports a scratch-directory failure without spawning', async () => {
    const deps = makeDeps({
      makeScratchDir: () => {
        throw new Error('EACCES');
      },
    });
    const result = await runPiPrompt(BASE, deps);
    expect(result.error).toContain('Failed to create scratch directory');
    expect(deps.calls).toHaveLength(0);
  });

  it('reports a timeout', async () => {
    const result = await runPiPrompt(
      BASE,
      makeDeps({
        spawnPi: async () => ({ stdout: '', stderr: '', exitCode: 143, timedOut: true }),
      }),
    );
    expect(result.error).toContain('exceeded 60000ms');
  });

  it('reports a non-zero exit with stderr', async () => {
    const result = await runPiPrompt(
      BASE,
      makeDeps({
        spawnPi: async () => ({
          stdout: assistantEvent('partial'),
          stderr: 'model refused\n',
          exitCode: 1,
          timedOut: false,
        }),
      }),
    );
    expect(result.error).toBe('model refused');
  });

  it('reports empty output as an error', async () => {
    const result = await runPiPrompt(
      BASE,
      makeDeps({
        spawnPi: async () => ({
          stdout: usageEvent(1, 0),
          stderr: '',
          exitCode: 0,
          timedOut: false,
        }),
      }),
    );
    expect(result.error).toContain('no final assistant output');
  });

  it('enforces maxTokens when given, and ignores it otherwise', async () => {
    const capped = await runPiPrompt({ ...BASE, maxTokens: 10 }, makeDeps());
    expect(capped.error).toContain('maxTokens');
    // Output is still returned so callers can log what was produced.
    expect(capped.output).toBe('generated text');

    for (const maxTokens of [undefined, 0]) {
      expect((await runPiPrompt({ ...BASE, maxTokens }, makeDeps())).error).toBeUndefined();
    }
  });
});
