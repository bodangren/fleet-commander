import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Agent } from './types';
import {
  loadModelMap,
  loadPiAgents,
  resolveHarnessRoot,
  selectPiAgent,
  type PiAgentDefinition,
} from './piHarness';

/**
 * Per-agent verdict on whether the Pi backend could dispatch it.
 */
export interface AgentReadiness {
  agentName: string;
  modelRef: string;
  ok: boolean;
  piRole?: string;
  piModel?: string;
  reason?: string;
}

/**
 * Whole-fleet readiness for a cutover to the Pi backend.
 */
export interface PiBackendReadiness {
  harnessRoot: string;
  rolesLoaded: number;
  agents: AgentReadiness[];
  ready: boolean;
}

/**
 * Checks every Fleet agent against the harness roster and reports which ones
 * the Pi backend could dispatch.
 *
 * Phase 4 cannot retire the OpenCode executor while any agent is unresolvable:
 * a task assigned to such an agent would fail closed at dispatch instead of
 * running. Run this before switching FLEET_EXECUTOR_BACKEND.
 *
 * @param agents - Fleet agent roster, as stored in Convex
 * @param roster - Harness roles from loadPiAgents
 * @param harnessRoot - Package root, recorded on the report
 */
export function assessReadiness(
  agents: Array<Pick<Agent, 'name' | 'model'>>,
  roster: PiAgentDefinition[],
  harnessRoot: string,
): PiBackendReadiness {
  const results: AgentReadiness[] = agents.map((agent) => {
    const selection = selectPiAgent(roster, agent.model);
    if (!selection.ok) {
      return {
        agentName: agent.name,
        modelRef: agent.model,
        ok: false,
        reason: selection.reason,
      };
    }
    return {
      agentName: agent.name,
      modelRef: agent.model,
      ok: true,
      piRole: selection.agent.name,
      piModel: selection.modelRef,
    };
  });

  return {
    harnessRoot,
    rolesLoaded: roster.length,
    agents: results,
    ready: results.length > 0 && results.every((r) => r.ok),
  };
}

/**
 * Renders a readiness report as human-readable lines.
 *
 * @param report - Result of assessReadiness
 */
export function formatReadiness(report: PiBackendReadiness): string {
  const lines: string[] = [
    `harness root : ${report.harnessRoot}`,
    `roles loaded : ${report.rolesLoaded}`,
    `fleet agents : ${report.agents.length}`,
    '',
  ];

  const ok = report.agents.filter((a) => a.ok);
  const blocked = report.agents.filter((a) => !a.ok);

  if (ok.length > 0) {
    lines.push(`dispatchable (${ok.length}):`);
    for (const a of ok) {
      lines.push(`  ${a.agentName.padEnd(28)} ${a.modelRef}  ->  ${a.piRole} (${a.piModel})`);
    }
    lines.push('');
  }

  if (blocked.length > 0) {
    lines.push(`BLOCKED (${blocked.length}):`);
    for (const a of blocked) {
      lines.push(`  ${a.agentName.padEnd(28)} ${a.modelRef}`);
      lines.push(`  ${''.padEnd(28)} ${a.reason}`);
    }
    lines.push('');
  }

  lines.push(
    report.ready
      ? 'READY: every Fleet agent resolves to a harness role.'
      : 'NOT READY: the agents above would fail closed under FLEET_EXECUTOR_BACKEND=pi.',
  );

  return lines.join('\n');
}

/**
 * Loads the live Fleet roster and the harness roster, and reports readiness.
 *
 * @param client - Convex HTTP client
 */
export async function checkPiBackendReadiness(
  client: ConvexHttpClient,
): Promise<PiBackendReadiness> {
  const harnessRoot = resolveHarnessRoot();
  const roster = loadPiAgents(harnessRoot, loadModelMap(harnessRoot));
  const agents = (await client.query(
    api.fleetCatalog.listAgents,
    {},
  )) as unknown as Agent[];
  return assessReadiness(agents, roster, harnessRoot);
}
