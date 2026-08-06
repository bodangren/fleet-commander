import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Agent } from './types';
import type { HarnessHooks } from './hookRunner';

export interface ResolvedConfig {
  providerId: string;
  modelId: string;
  agent?: string;
  sessionId?: string;
}

/**
 * Options for resolving a command, including optional session continuation.
 *
 * `piRole` and `continuationOutput` are consumed only by the Pi backend, whose
 * continuity is receipt-based rather than server-session-based; the OpenCode
 * backend ignores them.
 */
export interface ResolveOptions {
  sessionId?: string;
  piRole?: string;
  continuationOutput?: string;
}

/**
 * Loads agents from Convex.
 */
async function loadAgents(client: ConvexHttpClient): Promise<Agent[]> {
  const agents = await client.query(api.fleetCatalog.listAgents, {});
  return agents as unknown as Agent[];
}

/**
 * Resolves an agent tag to executor configuration from the agent's own
 * `provider/model` reference.
 * Returns a null-config sentinel when the agent cannot be resolved.
 *
 * This used to require a matching row in a `harnesses` catalog. That table was
 * dropped in the 2026-05-20 schema migration and `fleetCatalog.listHarnesses`
 * stubbed to return `[]`, so the lookup could never match and every agent
 * resolved to the null sentinel — no task has dispatched since. The lookup
 * contributed nothing anyway: provider and model are parsed from `agent.model`
 * here, and the only field it supplied was `commandTemplate`, whose CLI mode
 * was already unsupported. See ADR-004.
 */
export async function resolveAgentCommand(
  client: ConvexHttpClient,
  agentTag: string,
  options?: ResolveOptions,
): Promise<ResolvedConfig> {
  if (!agentTag) {
    return { providerId: '', modelId: '' };
  }

  const agents = await loadAgents(client);
  const agent = agents.find(
    (a) => a.name.toLowerCase() === agentTag.toLowerCase(),
  );
  if (!agent) {
    return { providerId: '', modelId: '' };
  }

  const slashIdx = agent.model.indexOf('/');
  if (slashIdx === -1) {
    return { providerId: '', modelId: '' };
  }

  const providerId = agent.model.slice(0, slashIdx);
  const modelId = agent.model.slice(slashIdx + 1);

  if (!providerId || !modelId) {
    return { providerId: '', modelId: '' };
  }

  return {
    providerId,
    modelId,
    agent: agent.name,
    sessionId: options?.sessionId,
  };
}

/**
 * Resolves lifecycle hooks for the harness associated with an agent.
 * Returns null hooks if the agent or harness profile cannot be resolved.
 */
export async function resolveHarnessHooks(
  client: ConvexHttpClient,
  agentTag: string,
): Promise<HarnessHooks> {
  if (!agentTag) return {};

  const agents = await loadAgents(client);
  const agent = agents.find(
    (a) => a.name.toLowerCase() === agentTag.toLowerCase(),
  );
  if (!agent) return {};

  const slashIdx = agent.model.indexOf('/');
  if (slashIdx === -1) return {};

  const harnessName = agent.model.slice(0, slashIdx);
  if (!harnessName) return {};

  try {
    const profile = await client.query(api.harnessProfiles.getProfile, {
      name: harnessName,
    });
    if (!profile) return {};

    return {
      beforeRun: profile.beforeRunHook,
      afterRun: profile.afterRunHook,
      afterCreate: profile.afterCreateHook,
    };
  } catch {
    return {};
  }
}
