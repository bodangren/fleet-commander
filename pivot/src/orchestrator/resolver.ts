import { ConvexHttpClient } from 'convex/browser';
import type { Agent, Harness } from './types';

interface ResolvedCommand {
  command: string;
  args: string[];
}

/**
 * Loads agents from Convex.
 */
async function loadAgents(client: ConvexHttpClient): Promise<Agent[]> {
  const agents = await client.query(
    'fleetCatalog:listAgents' as never,
    {} as never,
  );
  return agents as unknown as Agent[];
}

/**
 * Loads harnesses from Convex.
 */
async function loadHarnesses(client: ConvexHttpClient): Promise<Harness[]> {
  const harnesses = await client.query(
    'fleetCatalog:listHarnesses' as never,
    {} as never,
  );
  return harnesses as unknown as Harness[];
}

/**
 * Resolves an agent tag to a command + args pair using Convex-backed agent/harness definitions.
 * Falls back to `echo` if the agent cannot be resolved.
 */
export async function resolveAgentCommand(
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
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
    .replace(/\{file\}/g, '');

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
