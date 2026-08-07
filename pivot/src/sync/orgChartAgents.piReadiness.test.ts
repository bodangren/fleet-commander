import { describe, it, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ORG_CHART_AGENTS } from './createOrgChartAgents';
import { assessReadiness } from '../orchestrator/piBackendPreflight';
import {
  loadModelMap,
  loadPiAgents,
  resolveHarnessRoot,
} from '../orchestrator/piHarness';

/**
 * Model references pi-measure-harness serves a `coder-*` role for.
 *
 * Checked in deliberately: it makes "a seeded agent is pointed at a model the
 * harness cannot run" a test failure here rather than a fail-closed dispatch
 * in production. Phase 4 found all 13 agents in that state at once.
 *
 * Keep in step with the harness roster — the drift test below compares this
 * list against the real package whenever it is present on the machine.
 */
const HARNESS_SERVED_MODELS = [
  'deepseek/deepseek-v4-flash',
  'kimi-for-coding/k3',
  'kimi-for-coding/kimi-for-coding',
  'kimi-for-coding/kimi-for-coding-highspeed',
  'minimax-cn-coding-plan/MiniMax-M3',
  'openai/gpt-5.6-luna',
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-terra',
  'vocengine-coding/ark-code-latest',
  'vocengine-coding/deepseek-v4-pro',
  'vocengine-coding/glm-5.2',
  'xiaomi/mimo-v2.5',
  'xiaomi/mimo-v2.5-pro',
];

describe('org chart agents are dispatchable under the Pi backend', () => {
  it('points every agent at a model the harness serves', () => {
    const stranded = ORG_CHART_AGENTS.filter(
      (agent) => !HARNESS_SERVED_MODELS.includes(agent.model),
    ).map((agent) => `${agent.name} -> ${agent.model}`);

    expect(stranded).toEqual([]);
  });

  it('seeds at least one agent, so the check cannot pass vacuously', () => {
    expect(ORG_CHART_AGENTS.length).toBeGreaterThan(0);
  });

  it('assigns every agent a well-formed provider/model reference', () => {
    for (const agent of ORG_CHART_AGENTS) {
      expect(agent.model).toMatch(/^[^/]+\/[^/]+$/);
    }
  });
});

/**
 * Drift detector. The list above is a checked-in copy; this compares it with
 * the real package when the machine has one, so a harness-side change to the
 * roster or model map surfaces here instead of at dispatch time.
 */
describe('harness roster drift', () => {
  const harnessRoot = resolveHarnessRoot();
  const present = existsSync(resolve(harnessRoot, 'agents'));

  it.skipIf(!present)('matches the models the installed harness serves', () => {
    const roster = loadPiAgents(harnessRoot, loadModelMap(harnessRoot));
    const served = roster
      .filter((role) => role.name.startsWith('coder-') && role.model && role.sourceModel)
      .map((role) => role.sourceModel!)
      .sort();

    expect([...new Set(served)]).toEqual([...HARNESS_SERVED_MODELS].sort());
  });

  it.skipIf(!present)('reports every seeded agent as ready', () => {
    const roster = loadPiAgents(harnessRoot, loadModelMap(harnessRoot));
    const report = assessReadiness(ORG_CHART_AGENTS, roster, harnessRoot);
    const blocked = report.agents.filter((a) => !a.ok);

    expect(blocked.map((a) => `${a.agentName}: ${a.reason}`)).toEqual([]);
    expect(report.ready).toBe(true);
  });
});
