import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildPiArgs,
  finalAssistantText,
  hasMeasureResultBlock,
  loadModelMap,
  loadPiAgents,
  parseAgentFile,
  parsePiEventStream,
  resolveHarnessRoot,
  selectPiAgent,
  sumTokenUsage,
  toPiModelRef,
  toolsForPiAgent,
  type PiAgentDefinition,
} from './piHarness';

const MODEL_MAP = {
  'minimax-cn-coding-plan/MiniMax-M3': 'minimax-cn/MiniMax-M3',
  'openai/gpt-5.6-terra': 'openai-codex/gpt-5.6-terra',
};

let harnessRoot: string;

function agentFile(name: string, frontmatter: string, body = 'System prompt.'): void {
  writeFileSync(
    resolve(harnessRoot, 'agents', `${name}.md`),
    `---\n${frontmatter}\n---\n${body}\n`,
  );
}

beforeAll(() => {
  harnessRoot = mkdtempSync(resolve(tmpdir(), 'pi-harness-'));
  mkdirSync(resolve(harnessRoot, 'agents'), { recursive: true });
  mkdirSync(resolve(harnessRoot, 'config'), { recursive: true });
  writeFileSync(
    resolve(harnessRoot, 'config', 'model-map.json'),
    JSON.stringify(MODEL_MAP, null, 2),
  );

  agentFile(
    'coder-minimax-m3',
    [
      'description: MiniMax coder',
      'mode: subagent',
      'model: minimax-cn-coding-plan/MiniMax-M3',
      'permission:',
      '  edit: allow',
      '  bash: allow',
    ].join('\n'),
  );
  agentFile(
    'coder-kimi-unmapped',
    [
      'description: Coder on a model with no mapping',
      'mode: subagent',
      'model: kimi-for-coding/k3',
      'permission:',
      '  edit: allow',
    ].join('\n'),
  );
  agentFile(
    'measure-phase-acceptance',
    [
      'description: Audit-only role',
      'mode: subagent',
      'model: openai/gpt-5.6-terra',
      'options:',
      '  reasoningEffort: medium',
      'permission:',
      '  edit: deny',
      '  task:',
      '    "*": deny',
    ].join('\n'),
  );
  agentFile(
    'measure-jr-green',
    [
      'description: Green implementer that may delegate to coders',
      'mode: subagent',
      'model: openai/gpt-5.6-terra',
      'permission:',
      '  edit: allow',
      '  task:',
      '    "*": deny',
      '    "coder-*": allow',
    ].join('\n'),
  );
});

afterAll(() => {
  rmSync(harnessRoot, { recursive: true, force: true });
});

describe('resolveHarnessRoot', () => {
  it('prefers PI_MEASURE_HARNESS_ROOT', () => {
    expect(resolveHarnessRoot({ PI_MEASURE_HARNESS_ROOT: '/opt/harness' })).toBe(
      '/opt/harness',
    );
  });

  it('ignores a blank override and falls back to the conventional path', () => {
    expect(resolveHarnessRoot({ PI_MEASURE_HARNESS_ROOT: '   ' })).toContain(
      'pi-measure-harness',
    );
  });
});

describe('loadModelMap / toPiModelRef', () => {
  it('reads the map from the package root', () => {
    expect(loadModelMap(harnessRoot)).toEqual(MODEL_MAP);
  });

  it('translates a mapped reference', () => {
    expect(toPiModelRef('minimax-cn-coding-plan/MiniMax-M3', MODEL_MAP)).toBe(
      'minimax-cn/MiniMax-M3',
    );
  });

  it('returns null for an unmapped reference rather than passing it through', () => {
    expect(toPiModelRef('kimi-for-coding/k3', MODEL_MAP)).toBeNull();
  });
});

describe('parseAgentFile', () => {
  it('parses frontmatter and resolves the model through the map', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'coder-minimax-m3.md'),
      MODEL_MAP,
    );
    expect(agent.name).toBe('coder-minimax-m3');
    expect(agent.sourceModel).toBe('minimax-cn-coding-plan/MiniMax-M3');
    expect(agent.model).toBe('minimax-cn/MiniMax-M3');
    expect(agent.systemPrompt).toBe('System prompt.');
  });

  it('leaves model undefined when the reference is unmapped', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'coder-kimi-unmapped.md'),
      MODEL_MAP,
    );
    expect(agent.sourceModel).toBe('kimi-for-coding/k3');
    expect(agent.model).toBeUndefined();
  });

  it('defaults the thinking level to high and honours an explicit one', () => {
    const dflt = parseAgentFile(
      resolve(harnessRoot, 'agents', 'coder-minimax-m3.md'),
      MODEL_MAP,
    );
    const explicit = parseAgentFile(
      resolve(harnessRoot, 'agents', 'measure-phase-acceptance.md'),
      MODEL_MAP,
    );
    expect(dflt.thinkingLevel).toBe('high');
    expect(explicit.thinkingLevel).toBe('medium');
  });

  it('rejects a file without frontmatter', () => {
    const path = resolve(harnessRoot, 'no-frontmatter.md');
    writeFileSync(path, 'just a body');
    expect(() => parseAgentFile(path, MODEL_MAP)).toThrow(/no valid frontmatter/);
  });
});

describe('loadPiAgents', () => {
  it('loads every agent file in sorted order', () => {
    const names = loadPiAgents(harnessRoot, MODEL_MAP).map((a) => a.name);
    expect(names).toEqual([
      'coder-kimi-unmapped',
      'coder-minimax-m3',
      'measure-jr-green',
      'measure-phase-acceptance',
    ]);
  });
});

describe('toolsForPiAgent', () => {
  const base = ['read', 'grep', 'find', 'ls', 'bash'];

  it('grants edit and write when edit is not denied', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'coder-minimax-m3.md'),
      MODEL_MAP,
    );
    expect(toolsForPiAgent(agent)).toEqual([...base, 'edit', 'write']);
  });

  it('withholds edit and write from an audit-only role', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'measure-phase-acceptance.md'),
      MODEL_MAP,
    );
    expect(toolsForPiAgent(agent)).toEqual(base);
  });

  it('grants task when a specific delegation target is allowed', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'measure-jr-green.md'),
      MODEL_MAP,
    );
    expect(toolsForPiAgent(agent)).toContain('task');
  });

  it('withholds task when only the wildcard rule is present and denies', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'measure-phase-acceptance.md'),
      MODEL_MAP,
    );
    expect(toolsForPiAgent(agent)).not.toContain('task');
  });

  it('gives the orchestrator roles their fixed tool sets', () => {
    const orchestrator = {
      name: 'measure-orchestrator',
      permission: {},
    } as PiAgentDefinition;
    expect(toolsForPiAgent(orchestrator)).toEqual([
      ...base,
      'task',
      'question',
      'todowrite',
      'measure_doctor',
    ]);
    expect(toolsForPiAgent(orchestrator)).not.toContain('edit');
  });
});

describe('selectPiAgent', () => {
  let roster: PiAgentDefinition[];

  beforeAll(() => {
    roster = loadPiAgents(harnessRoot, MODEL_MAP);
  });

  it('selects the coder role configured for the requested model', () => {
    const result = selectPiAgent(roster, 'minimax-cn-coding-plan/MiniMax-M3');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.agent.name).toBe('coder-minimax-m3');
    expect(result.modelRef).toBe('minimax-cn/MiniMax-M3');
  });

  it('fails closed when no coder role serves the model', () => {
    const result = selectPiAgent(roster, 'anthropic/claude-opus-5');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('No harness coder role');
  });

  it('fails closed when the coder role exists but its model is unmapped', () => {
    const result = selectPiAgent(roster, 'kimi-for-coding/k3');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('not in the harness model map');
  });

  it('honours an explicit role name over model-driven selection', () => {
    const result = selectPiAgent(
      roster,
      'minimax-cn-coding-plan/MiniMax-M3',
      'measure-jr-green',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.agent.name).toBe('measure-jr-green');
    expect(result.modelRef).toBe('openai-codex/gpt-5.6-terra');
  });

  it('rejects an unknown explicit role name', () => {
    const result = selectPiAgent(roster, 'minimax-cn-coding-plan/MiniMax-M3', 'nope');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('Unknown harness role');
  });

  it('never selects a non-coder role by model alone', () => {
    const result = selectPiAgent(roster, 'openai/gpt-5.6-terra');
    expect(result.ok).toBe(false);
  });
});

describe('buildPiArgs', () => {
  it('matches the harness task tool invocation', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'coder-minimax-m3.md'),
      MODEL_MAP,
    );
    expect(
      buildPiArgs({ agent, modelRef: 'minimax-cn/MiniMax-M3', prompt: 'Task: do it' }),
    ).toEqual([
      '--mode',
      'json',
      '-p',
      '--no-session',
      '--approve',
      '--agent',
      'coder-minimax-m3',
      '--model',
      'minimax-cn/MiniMax-M3',
      '--thinking',
      'high',
      '--tools',
      'read,grep,find,ls,bash,edit,write',
      'Task: do it',
    ]);
  });

  it('passes the prompt last so it is never read as a flag value', () => {
    const agent = parseAgentFile(
      resolve(harnessRoot, 'agents', 'coder-minimax-m3.md'),
      MODEL_MAP,
    );
    const args = buildPiArgs({ agent, modelRef: 'm/x', prompt: '--tools evil' });
    expect(args[args.length - 1]).toBe('--tools evil');
  });
});

describe('parsePiEventStream', () => {
  it('parses newline-delimited JSON and drops empty lines', () => {
    const { events, rawLines } = parsePiEventStream(
      '{"type":"a"}\n{"type":"b"}\n\n',
    );
    expect(events).toEqual([{ type: 'a' }, { type: 'b' }]);
    expect(rawLines).toHaveLength(2);
  });

  it('retains malformed lines in the raw log without throwing', () => {
    const { events, rawLines } = parsePiEventStream('{"type":"a"}\nnot json\n');
    expect(events).toEqual([{ type: 'a' }]);
    expect(rawLines).toEqual(['{"type":"a"}', 'not json']);
  });
});

describe('finalAssistantText', () => {
  it('returns the last assistant message_end text', () => {
    const events = [
      { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'first' }] } },
      { type: 'message_end', message: { role: 'user', content: [{ type: 'text', text: 'ignored' }] } },
      { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'last' }] } },
    ];
    expect(finalAssistantText(events)).toBe('last');
  });

  it('skips assistant messages that carry only tool calls', () => {
    const events = [
      { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'real' }] } },
      { type: 'message_end', message: { role: 'assistant', content: [{ type: 'toolCall', id: 'x' }] } },
    ];
    expect(finalAssistantText(events)).toBe('real');
  });

  it('returns empty string when no assistant text exists', () => {
    expect(finalAssistantText([{ type: 'turn_end' }])).toBe('');
    expect(finalAssistantText([])).toBe('');
  });
});

describe('hasMeasureResultBlock', () => {
  it('requires both delimiters', () => {
    expect(hasMeasureResultBlock('MEASURE_AGENT_RESULT\nrole: x\nEND_MEASURE_AGENT_RESULT')).toBe(true);
    expect(hasMeasureResultBlock('MEASURE_AGENT_RESULT\nrole: x')).toBe(false);
    expect(hasMeasureResultBlock('nothing here')).toBe(false);
  });
});

describe('sumTokenUsage', () => {
  it('sums usage across every turn', () => {
    const events = [
      { type: 'turn_end', message: { usage: { input: 100, output: 10, cost: { total: 0.5 } } } },
      { type: 'turn_end', message: { usage: { input: 200, output: 20, cost: { total: 0.25 } } } },
    ];
    expect(sumTokenUsage(events)).toEqual({
      inputTokens: 300,
      outputTokens: 30,
      costUsd: 0.75,
    });
  });

  it('ignores non-turn_end events that happen to carry a message', () => {
    const events = [
      { type: 'message_end', message: { usage: { input: 999, output: 999 } } },
      { type: 'turn_end', message: { usage: { input: 1, output: 2 } } },
    ];
    expect(sumTokenUsage(events)).toEqual({
      inputTokens: 1,
      outputTokens: 2,
      costUsd: 0,
    });
  });

  it('returns undefined when no turn reported usage', () => {
    expect(sumTokenUsage([{ type: 'turn_end', message: {} }])).toBeUndefined();
    expect(sumTokenUsage([])).toBeUndefined();
  });
});
