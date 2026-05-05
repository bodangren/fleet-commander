import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Agent, Harness } from './types';
import type { HarnessHooks } from './hookRunner';

export interface ResolvedConfig {
  providerId: string;
  modelId: string;
  agent?: string;
  sessionId?: string;
}

/**
 * Options for resolving a command, including optional session continuation.
 */
export interface ResolveOptions {
  sessionId?: string;
}

/**
 * Loads agents from Convex.
 */
async function loadAgents(client: ConvexHttpClient): Promise<Agent[]> {
  const agents = await client.query(api.fleetCatalog.listAgents, {});
  return agents as unknown as Agent[];
}

/**
 * Loads harnesses from Convex.
 */
async function loadHarnesses(client: ConvexHttpClient): Promise<Harness[]> {
  const harnesses = await client.query(api.fleetCatalog.listHarnesses, {});
  return harnesses as unknown as Harness[];
}

/**
 * Resolves an agent tag to SDK-compatible configuration using Convex-backed
 * agent/harness definitions.
 * Returns null-config sentinel when the agent cannot be resolved.
 */
export async function resolveAgentCommand(
  client: ConvexHttpClient,
  agentTag: string,
  options?: ResolveOptions,
): Promise<ResolvedConfig> {
  if (!agentTag) {
    return { providerId: '', modelId: '' };
  }

  const [agents, harnesses] = await Promise.all([
    loadAgents(client),
    loadHarnesses(client),
  ]);

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

  const harnessName = agent.model.slice(0, slashIdx);
  const modelId = agent.model.slice(slashIdx + 1);

  if (!harnessName || !modelId) {
    return { providerId: '', modelId: '' };
  }

  const harness = harnesses.find(
    (h) => h.name.toLowerCase() === harnessName.toLowerCase(),
  );
  if (!harness) {
    return { providerId: '', modelId: '' };
  }

  if (harness.commandTemplate && harness.commandTemplate.trim().length > 0) {
    console.warn(
      `[resolver] Harness "${harness.name}" has commandTemplate configured but CLI mode is no longer supported — SDK providerId "${harnessName}" will be used instead.`,
    );
  }

  return {
    providerId: harnessName,
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
