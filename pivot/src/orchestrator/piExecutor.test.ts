import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ConvexHttpClient } from 'convex/browser';
import { executeTaskViaPi, type PiExecutorDeps, type PiTaskReceipt } from './piExecutor';
import type { PiAgentDefinition } from './piHarness';

const CODER: PiAgentDefinition = {
  name: 'coder-minimax-m3',
  description: 'MiniMax coder',
  mode: 'subagent',
  sourceModel: 'minimax-cn-coding-plan/MiniMax-M3',
  model: 'minimax-cn/MiniMax-M3',
  thinkingLevel: 'high',
  permission: { edit: 'allow' },
  systemPrompt: 'be a coder',
};

const MEASURE_ROLE: PiAgentDefinition = {
  name: 'measure-phase-acceptance',
  description: 'Phase acceptance',
  mode: 'subagent',
  sourceModel: 'openai/gpt-5.6-terra',
  model: 'openai-codex/gpt-5.6-terra',
  thinkingLevel: 'high',
  permission: { edit: 'deny' },
  systemPrompt: 'audit',
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
    message: { usage: { input, output, cost: { total: 0.01 } } },
  });
}

/**
 * Convex client stub for the resolver. `resolveAgentCommand` filters agents
 * and harnesses out of the same result array by shape, so one array serves
 * both of its queries — the convention the resolver's own tests use.
 */
function makeClient(model = 'minimax-cn-coding-plan/MiniMax-M3'): ConvexHttpClient {
  return {
    query: mock(async () => [
      { name: 'backend-lead', model },
      { name: model.split('/')[0], commandTemplate: '' },
    ]),
    mutation: mock(async () => undefined),
  } as unknown as ConvexHttpClient;
}

type SpawnCall = Parameters<PiExecutorDeps['spawnPi']>;

/**
 * Records every spawn call so assertions can read the argv and options that
 * would have reached the Pi CLI.
 */
function recordingSpawn(
  stdout: string,
  rest: { stderr?: string; exitCode?: number; timedOut?: boolean } = {},
): PiExecutorDeps['spawnPi'] & { calls: SpawnCall[] } {
  const calls: SpawnCall[] = [];
  const fn = async (...args: SpawnCall) => {
    calls.push(args);
    return {
      stdout,
      stderr: rest.stderr ?? '',
      exitCode: rest.exitCode ?? 0,
      timedOut: rest.timedOut ?? false,
    };
  };
  return Object.assign(fn, { calls });
}

let receipts: PiTaskReceipt[];
let logs: string[][];

function makeDeps(overrides: Partial<PiExecutorDeps> = {}): PiExecutorDeps {
  let clock = 1_000;
  return {
    spawnPi: mock(async () => ({
      stdout: [usageEvent(100, 20), assistantEvent('all done')].join('\n'),
      stderr: '',
      exitCode: 0,
      timedOut: false,
    })),
    gitHead: () => 'abc1234',
    writeReceipt: (receipt, rawLines) => {
      receipts.push(receipt);
      logs.push(rawLines);
    },
    now: () => (clock += 500),
    loadRoster: () => [CODER, MEASURE_ROLE],
    cwd: '/repo',
    ...overrides,
  };
}

beforeEach(() => {
  receipts = [];
  logs = [];
});

describe('executeTaskViaPi', () => {
  it('dispatches to the coder role matching the agent model and succeeds', async () => {
    const deps = makeDeps();
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'implement the thing',
      'TASK-1',
      60_000,
      undefined,
      undefined,
      deps,
    );

    expect(result.status).toBe('succeeded');
    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('all done');
    expect(result.model).toBe('minimax-cn/MiniMax-M3');
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(20);
    expect(result.taskKey).toBe('TASK-1');
  });

  it('spawns pi with the role, mapped model, and prompt last', async () => {
    const spawnPi = recordingSpawn(assistantEvent('ok'));
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'do work',
      'TASK-2',
      45_000,
      undefined,
      undefined,
      makeDeps({ spawnPi }),
    );

    const [args, opts] = spawnPi.calls[0]!;
    expect(args).toContain('--no-session');
    expect(args[args.indexOf('--agent') + 1]).toBe('coder-minimax-m3');
    expect(args[args.indexOf('--model') + 1]).toBe('minimax-cn/MiniMax-M3');
    expect(args[args.length - 1]).toBe('Task: do work');
    expect(opts.timeoutMs).toBe(45_000);
    expect(opts.cwd).toBe('/repo');
  });

  it('uses the resolved project path and forwards the explicit token bound', async () => {
    const spawnPi = recordingSpawn(assistantEvent('ok'));
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'run in the imported project',
      'TASK-PATH-BOUND',
      12_345,
      678,
      { projectPath: '/imported/project' },
      makeDeps({ spawnPi }),
    );

    const [args, opts] = spawnPi.calls[0]!;
    expect(args.at(-1)).toBe('Task: run in the imported project');
    expect(opts.cwd).toBe('/imported/project');
    expect(opts.cwd).not.toBe('/repo');
    expect(opts.timeoutMs).toBe(12_345);
    expect(opts.maxTokens).toBe(678);
    expect(receipts[0]?.cwd).toBe('/imported/project');
    expect(receipts[0]?.timeoutMs).toBe(12_345);
    expect(receipts[0]?.maxTokens).toBe(678);
  });

  it('returns a session id that is the receipt task id', async () => {
    const deps = makeDeps();
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-3',
      1000,
      undefined,
      undefined,
      deps,
    );
    expect(result.sessionId).toBe(receipts[0].taskId);
  });

  it('prepends the previous output when continuing from a prior task', async () => {
    const spawnPi = recordingSpawn(assistantEvent('ok'));
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'retry it',
      'TASK-4',
      1000,
      undefined,
      { sessionId: 'prior-task-id', continuationOutput: 'what happened before' },
      makeDeps({ spawnPi }),
    );

    const prompt = spawnPi.calls[0]![0].at(-1)!;
    expect(prompt).toContain('Task: retry it');
    expect(prompt).toContain('Continuation from task prior-task-id:');
    expect(prompt).toContain('what happened before');
    expect(receipts[0].continuedFrom).toBe('prior-task-id');
  });

  it('does not add a continuation header when there is no prior output', async () => {
    const spawnPi = recordingSpawn(assistantEvent('ok'));
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'first try',
      'TASK-5',
      1000,
      undefined,
      { sessionId: undefined },
      makeDeps({ spawnPi }),
    );
    expect(spawnPi.calls[0]![0].at(-1)).toBe('Task: first try');
  });

  it('writes a receipt carrying provenance for every dispatch', async () => {
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-6',
      1000,
      undefined,
      undefined,
      makeDeps(),
    );

    const receipt = receipts[0];
    expect(receipt.parentAgent).toBe('backend-lead');
    expect(receipt.childAgent).toBe('coder-minimax-m3');
    expect(receipt.parentSessionId).toBe('TASK-6');
    expect(receipt.startHead).toBe('abc1234');
    expect(receipt.endHead).toBe('abc1234');
    expect(receipt.exitCode).toBe(0);
    expect(receipt.model).toBe('minimax-cn/MiniMax-M3');
    expect(receipt.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never puts raw prompt or output text in the hashed fields', async () => {
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'secret-prompt-text',
      'TASK-7',
      1000,
      undefined,
      undefined,
      makeDeps(),
    );
    expect(receipts[0].promptHash).not.toContain('secret-prompt-text');
  });

  it('writes a receipt even when the child fails', async () => {
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-8',
      1000,
      undefined,
      undefined,
      makeDeps({
        spawnPi: async () => ({
          stdout: '',
          stderr: 'boom',
          exitCode: 3,
          timedOut: false,
        }),
      }),
    );
    expect(receipts).toHaveLength(1);
    expect(receipts[0].exitCode).toBe(3);
    expect(receipts[0].stderr).toBe('boom');
  });

  it('classifies a timeout', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-9',
      5_000,
      undefined,
      undefined,
      makeDeps({
        spawnPi: async () => ({ stdout: '', stderr: '', exitCode: 143, timedOut: true }),
      }),
    );
    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('timeout');
    expect(result.error).toContain('5000ms');
  });

  it('classifies a non-zero exit as exit_code and surfaces stderr', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-10',
      1000,
      undefined,
      undefined,
      makeDeps({
        spawnPi: async () => ({
          stdout: assistantEvent('partial'),
          stderr: 'model refused\n',
          exitCode: 1,
          timedOut: false,
        }),
      }),
    );
    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('exit_code');
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('model refused');
  });

  it('classifies exceeding maxTokens as tokens_exceeded, not a provider error', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-11',
      1000,
      50,
      undefined,
      makeDeps(),
    );
    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('tokens_exceeded');
  });

  it('does not apply a token cap when maxTokens is absent or zero', async () => {
    for (const cap of [undefined, 0]) {
      const result = await executeTaskViaPi(
        makeClient(),
        'backend-lead',
        'p',
        'TASK-12',
        1000,
        cap,
        undefined,
        makeDeps(),
      );
      expect(result.status).toBe('succeeded');
    }
  });

  it('fails when the child produced no final assistant output', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-13',
      1000,
      undefined,
      undefined,
      makeDeps({
        spawnPi: async () => ({
          stdout: usageEvent(1, 1),
          stderr: '',
          exitCode: 0,
          timedOut: false,
        }),
      }),
    );
    expect(result.status).toBe('failed');
    expect(result.error).toContain('no final assistant output');
  });

  it('requires a MEASURE_AGENT_RESULT block from measure-* roles', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-14',
      1000,
      undefined,
      { piRole: 'measure-phase-acceptance' },
      makeDeps(),
    );
    expect(result.status).toBe('failed');
    expect(result.error).toContain('MEASURE_AGENT_RESULT');
  });

  it('accepts a measure-* role that returns the required block', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-15',
      1000,
      undefined,
      { piRole: 'measure-phase-acceptance' },
      makeDeps({
        spawnPi: async () => ({
          stdout: assistantEvent(
            'MEASURE_AGENT_RESULT\nrole: acceptance\nEND_MEASURE_AGENT_RESULT',
          ),
          stderr: '',
          exitCode: 0,
          timedOut: false,
        }),
      }),
    );
    expect(result.status).toBe('succeeded');
  });

  it('does not require a result block from coder-* roles', async () => {
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-16',
      1000,
      undefined,
      undefined,
      makeDeps(),
    );
    expect(result.status).toBe('succeeded');
  });

  it('fails closed when no harness role serves the configured model', async () => {
    const result = await executeTaskViaPi(
      makeClient('anthropic/claude-opus-5'),
      'backend-lead',
      'p',
      'TASK-17',
      1000,
      undefined,
      undefined,
      makeDeps(),
    );
    expect(result.status).toBe('failed');
    expect(result.error).toContain('No harness coder role');
    expect(receipts).toHaveLength(0);
  });

  it('fails without spawning when the roster cannot be loaded', async () => {
    const spawnPi = mock();
    const result = await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-18',
      1000,
      undefined,
      undefined,
      makeDeps({
        spawnPi,
        loadRoster: () => {
          throw new Error('ENOENT: no agents dir');
        },
      }),
    );
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Failed to load pi-measure-harness roster');
    expect(spawnPi).not.toHaveBeenCalled();
  });

  it('fails when the Fleet agent cannot be resolved at all', async () => {
    const client = {
      query: mock(async () => []),
      mutation: mock(),
    } as unknown as ConvexHttpClient;
    const result = await executeTaskViaPi(
      client,
      'ghost-agent',
      'p',
      'TASK-19',
      1000,
      undefined,
      undefined,
      makeDeps(),
    );
    expect(result.status).toBe('failed');
    expect(result.error).toContain('could not be resolved');
  });

  it('records the raw event log alongside the receipt', async () => {
    await executeTaskViaPi(
      makeClient(),
      'backend-lead',
      'p',
      'TASK-20',
      1000,
      undefined,
      undefined,
      makeDeps(),
    );
    expect(logs[0]).toHaveLength(2);
    expect(receipts[0].logPath).toContain(`${receipts[0].taskId}.jsonl`);
  });
});
