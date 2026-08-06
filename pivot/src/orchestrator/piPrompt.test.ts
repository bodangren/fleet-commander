import { describe, it, expect } from 'bun:test';
import { runPiPrompt, type PiPromptDeps } from './piPrompt';
import type { PiAgentDefinition } from './piHarness';

const CODER: PiAgentDefinition = {
  name: 'coder-minimax-m3',
  description: 'MiniMax coder',
  mode: 'subagent',
  sourceModel: 'minimax-cn-coding-plan/MiniMax-M3',
  model: 'minimax-cn/MiniMax-M3',
  thinkingLevel: 'high',
  permission: { edit: 'allow' },
  systemPrompt: '',
};

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
    loadRoster: () => [CODER],
    makeScratchDir: () => '/tmp/scratch-xyz',
    ...overrides,
  };
  return Object.assign(deps, { calls });
}

const BASE = {
  modelRef: 'minimax-cn-coding-plan/MiniMax-M3',
  prompt: 'write a story',
  timeoutMs: 60_000,
};

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
    expect(args[args.indexOf('--model') + 1]).toBe('minimax-cn/MiniMax-M3');
  });

  it('reports an unserved model as an error instead of throwing', async () => {
    const result = await runPiPrompt({ ...BASE, modelRef: 'openai/gpt-4o-mini' }, makeDeps());
    expect(result.output).toBe('');
    expect(result.error).toContain('No harness coder role');
  });

  it('reports a roster load failure', async () => {
    const result = await runPiPrompt(
      BASE,
      makeDeps({
        loadRoster: () => {
          throw new Error('ENOENT');
        },
      }),
    );
    expect(result.error).toContain('Failed to load pi-measure-harness roster');
  });

  it('dispatches through the role serving the model, which is what sets it', () => {
    // The harness extension sets the model from the selected role on
    // session_start, overriding --model. Passing --model without --agent runs
    // the default role's model instead of the one asked for.
    const deps = makeDeps();
    return runPiPrompt(BASE, deps).then(() => {
      const args = deps.calls[0]![0];
      expect(args[args.indexOf('--agent') + 1]).toBe('coder-minimax-m3');
      expect(args[args.indexOf('--model') + 1]).toBe('minimax-cn/MiniMax-M3');
    });
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
