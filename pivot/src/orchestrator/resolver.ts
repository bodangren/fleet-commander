import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Agent, Harness } from './types';
import type { HarnessHooks } from './hookRunner';

interface ResolvedCommand {
  command: string;
  args: string[];
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
 * Resolves an agent tag to a command + args pair using Convex-backed agent/harness definitions.
 * Falls back to `echo` if the agent cannot be resolved.
 * Supports {session_id} template variable for session continuation.
 */
export async function resolveAgentCommand(
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  options?: ResolveOptions,
): Promise<ResolvedCommand> {
  if (!agentTag) {
    return { command: 'echo', args: [prompt] };
  }

  const [agents, harnesses] = await Promise.all([
    loadAgents(client),
    loadHarnesses(client),
  ]);

  const agent = agents.find(
    (a) => a.name.toLowerCase() === agentTag.toLowerCase(),
  );
  if (!agent) {
    return { command: 'echo', args: [prompt] };
  }

  const slashIdx = agent.model.indexOf('/');
  if (slashIdx === -1) {
    return { command: 'echo', args: [prompt] };
  }

  const harnessName = agent.model.slice(0, slashIdx);
  const modelId = agent.model.slice(slashIdx + 1);

  if (!harnessName || !modelId) {
    return { command: 'echo', args: [prompt] };
  }

  const harness = harnesses.find(
    (h) => h.name.toLowerCase() === harnessName.toLowerCase(),
  );
  if (!harness) {
    return { command: 'echo', args: [prompt] };
  }

  const template = harness.commandTemplate
    .replace(/\{model\}/g, modelId)
    .replace(/\{prompt\}/g, prompt)
    .replace(/\{file\}/g, '')
    .replace(/\{session_id\}/g, options?.sessionId ?? '');

  const parts = splitCommandLine(template);
  if (parts.length === 0) {
    return { command: 'echo', args: [prompt] };
  }

  const binary = harness.name;
  let args = parts;
  if (parts[0] === binary || parts[0].endsWith('/' + binary)) {
    args = parts.slice(1);
  }

  return { command: binary, args };
}

/**
 * Splits a command line string into tokens, respecting quotes.
 */
function splitCommandLine(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let escaped = false;
  let inToken = false;

  const flush = () => {
    if (inToken) {
      parts.push(current);
      current = '';
      inToken = false;
    }
  };

  for (const ch of input) {
    if (escaped) {
      current += ch;
      escaped = false;
      inToken = true;
      continue;
    }

    if (quote === null && ch === '\\') {
      escaped = true;
      continue;
    }

    if (quote !== null) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      inToken = true;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      inToken = true;
    } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      flush();
    } else {
      current += ch;
      inToken = true;
    }
  }

  flush();
  return parts;
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
