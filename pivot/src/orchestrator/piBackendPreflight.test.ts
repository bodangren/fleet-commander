import { describe, it, expect } from 'bun:test';
import { assessReadiness, formatReadiness } from './piBackendPreflight';
import type { PiAgentDefinition } from './piHarness';

function coder(name: string, sourceModel: string, model?: string): PiAgentDefinition {
  return {
    name,
    description: '',
    mode: 'subagent',
    sourceModel,
    model,
    thinkingLevel: 'high',
    permission: {},
    systemPrompt: '',
  };
}

const ROSTER: PiAgentDefinition[] = [
  coder('coder-minimax-m3', 'minimax-cn-coding-plan/MiniMax-M3', 'minimax-cn/MiniMax-M3'),
  coder('coder-kimi-unmapped', 'kimi-for-coding/k9', undefined),
];

describe('assessReadiness', () => {
  it('reports the harness role and model for a dispatchable agent', () => {
    const report = assessReadiness(
      [{ name: 'qa-test-engineer', model: 'minimax-cn-coding-plan/MiniMax-M3' }],
      ROSTER,
      '/harness',
    );
    expect(report.ready).toBe(true);
    expect(report.agents[0]).toMatchObject({
      agentName: 'qa-test-engineer',
      ok: true,
      piRole: 'coder-minimax-m3',
      piModel: 'minimax-cn/MiniMax-M3',
    });
  });

  it('blocks an agent whose model no harness role serves', () => {
    const report = assessReadiness(
      [{ name: 'frontend-lead', model: 'opencode-go/mimo-v2-omni' }],
      ROSTER,
      '/harness',
    );
    expect(report.ready).toBe(false);
    expect(report.agents[0]!.ok).toBe(false);
    expect(report.agents[0]!.reason).toContain('No harness coder role');
  });

  it('blocks an agent whose harness role exists but has an unmapped model', () => {
    const report = assessReadiness(
      [{ name: 'devops-sre', model: 'kimi-for-coding/k9' }],
      ROSTER,
      '/harness',
    );
    expect(report.ready).toBe(false);
    expect(report.agents[0]!.reason).toContain('not in the harness model map');
  });

  it('is not ready when a single agent out of many is blocked', () => {
    const report = assessReadiness(
      [
        { name: 'ok-one', model: 'minimax-cn-coding-plan/MiniMax-M3' },
        { name: 'ok-two', model: 'minimax-cn-coding-plan/MiniMax-M3' },
        { name: 'bad', model: 'opencode-go/glm-5.1' },
      ],
      ROSTER,
      '/harness',
    );
    expect(report.ready).toBe(false);
    expect(report.agents.filter((a) => a.ok)).toHaveLength(2);
  });

  it('is not ready for an empty fleet rather than vacuously ready', () => {
    expect(assessReadiness([], ROSTER, '/harness').ready).toBe(false);
  });
});

describe('formatReadiness', () => {
  it('names every blocked agent and its reason', () => {
    const text = formatReadiness(
      assessReadiness(
        [{ name: 'frontend-lead', model: 'opencode-go/mimo-v2-omni' }],
        ROSTER,
        '/harness',
      ),
    );
    expect(text).toContain('BLOCKED (1)');
    expect(text).toContain('frontend-lead');
    expect(text).toContain('opencode-go/mimo-v2-omni');
    expect(text).toContain('NOT READY');
  });

  it('states readiness plainly when every agent resolves', () => {
    const text = formatReadiness(
      assessReadiness(
        [{ name: 'qa-test-engineer', model: 'minimax-cn-coding-plan/MiniMax-M3' }],
        ROSTER,
        '/harness',
      ),
    );
    expect(text).toContain('dispatchable (1)');
    expect(text).toContain('READY:');
    expect(text).not.toContain('BLOCKED');
  });
});
