import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'js-yaml';

/**
 * A packaged pi-measure-harness role, parsed from its agent Markdown file.
 *
 * `sourceModel` is the OpenCode-style reference declared in frontmatter.
 * `model` is that reference translated through the harness model map, and is
 * undefined when the reference is absent or unmapped — the harness treats an
 * unmapped reference as "inherit the parent model", never as a passthrough.
 */
export interface PiAgentDefinition {
  name: string;
  description: string;
  mode: string;
  sourceModel?: string;
  model?: string;
  thinkingLevel: string;
  permission: {
    edit?: string;
    bash?: string;
    skill?: string;
    task?: Record<string, string>;
  };
  systemPrompt: string;
}

/**
 * Resolves the pi-measure-harness package root.
 * Honours PI_MEASURE_HARNESS_ROOT, falling back to the conventional location
 * beside this checkout.
 *
 * @param env - Environment to read, defaults to the process environment
 */
export function resolveHarnessRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.PI_MEASURE_HARNESS_ROOT?.trim();
  if (configured) return configured;
  return resolve(homedir(), 'Desktop', 'pi-measure-harness');
}

/**
 * Reads the harness model map, which translates OpenCode-style provider/model
 * references into the Pi provider/model references registered with the CLI.
 *
 * @param harnessRoot - Package root returned by resolveHarnessRoot
 */
export function loadModelMap(harnessRoot: string): Record<string, string> {
  const path = resolve(harnessRoot, 'config', 'model-map.json');
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Harness model map is not an object: ${path}`);
  }
  return parsed as Record<string, string>;
}

/**
 * Translates an OpenCode-style model reference into its Pi equivalent.
 * Returns null when the reference has no mapping — callers must fail closed
 * rather than passing the untranslated reference to the CLI.
 *
 * @param openCodeRef - Reference in `provider/model` form
 * @param modelMap - Map loaded by loadModelMap
 */
export function toPiModelRef(
  openCodeRef: string,
  modelMap: Record<string, string>,
): string | null {
  return modelMap[openCodeRef] ?? null;
}

/**
 * Parses one harness agent Markdown file into a role definition.
 * Mirrors the harness's own parser so the two rosters cannot diverge in
 * interpretation of the same file.
 *
 * @param filePath - Absolute path to an agent .md file
 * @param modelMap - Map loaded by loadModelMap
 */
export function parseAgentFile(
  filePath: string,
  modelMap: Record<string, string>,
): PiAgentDefinition {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Agent file has no valid frontmatter: ${filePath}`);
  }

  const frontmatter = (yaml.load(match[1]) ?? {}) as Record<string, unknown>;
  const sourceModel =
    typeof frontmatter.model === 'string' ? frontmatter.model : undefined;
  const options = frontmatter.options as { reasoningEffort?: string } | undefined;

  return {
    name: basename(filePath, '.md'),
    description:
      typeof frontmatter.description === 'string' ? frontmatter.description : '',
    mode: typeof frontmatter.mode === 'string' ? frontmatter.mode : 'subagent',
    sourceModel,
    model: sourceModel ? toPiModelRef(sourceModel, modelMap) ?? undefined : undefined,
    thinkingLevel: options?.reasoningEffort ?? 'high',
    permission: (frontmatter.permission ?? {}) as PiAgentDefinition['permission'],
    systemPrompt: match[2].trim(),
  };
}

/**
 * Loads every packaged role from the harness `agents/` directory.
 *
 * @param harnessRoot - Package root returned by resolveHarnessRoot
 * @param modelMap - Map loaded by loadModelMap
 */
export function loadPiAgents(
  harnessRoot: string,
  modelMap: Record<string, string>,
): PiAgentDefinition[] {
  const agentDir = resolve(harnessRoot, 'agents');
  return readdirSync(agentDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => parseAgentFile(resolve(agentDir, name), modelMap));
}

/**
 * Computes the tool allowlist for a role. Mirrors the harness's own policy so
 * a role dispatched from the orchestrator gets exactly the tools it would get
 * when dispatched from an interactive Pi session.
 *
 * @param agent - Role definition
 */
export function toolsForPiAgent(agent: PiAgentDefinition): string[] {
  const base = ['read', 'grep', 'find', 'ls', 'bash'];
  if (agent.name === 'measure-orchestrator') {
    return [...base, 'task', 'question', 'todowrite', 'measure_doctor'];
  }
  if (agent.name === 'coder-orchestrator') {
    return [...base, 'edit', 'write', 'task', 'question', 'todowrite'];
  }

  const tools = [...base];
  if (agent.permission?.edit !== 'deny') {
    tools.push('edit', 'write');
  }
  const taskRules = agent.permission?.task;
  if (
    taskRules &&
    Object.entries(taskRules).some(([key, value]) => key !== '*' && value === 'allow')
  ) {
    tools.push('task');
  }
  return tools;
}

/**
 * Failure modes for role selection, distinguished so the orchestrator can
 * report why a task could not be dispatched rather than emitting a bare null.
 */
export type PiAgentSelection =
  | { ok: true; agent: PiAgentDefinition; modelRef: string }
  | { ok: false; reason: string };

/**
 * Selects the harness role that should run a task.
 *
 * Fleet Commander's own agent roster is org-chart shaped (`backend-lead`,
 * `qa-test-engineer`, …) and does not overlap the harness roster, so selection
 * is driven by the model the Fleet agent is configured with: the harness keeps
 * one `coder-*` role per model reference. An explicit harness role name is
 * honoured when the caller supplies one that exists.
 *
 * @param agents - Roster loaded by loadPiAgents
 * @param openCodeModelRef - The Fleet agent's `provider/model` reference
 * @param preferredRole - Optional explicit harness role name
 */
export function selectPiAgent(
  agents: PiAgentDefinition[],
  openCodeModelRef: string,
  preferredRole?: string,
): PiAgentSelection {
  if (preferredRole) {
    const named = agents.find((a) => a.name === preferredRole);
    if (!named) {
      return { ok: false, reason: `Unknown harness role: ${preferredRole}` };
    }
    if (!named.model) {
      return {
        ok: false,
        reason: `Harness role ${named.name} declares model "${named.sourceModel ?? '<none>'}" which is not in the harness model map`,
      };
    }
    return { ok: true, agent: named, modelRef: named.model };
  }

  const byModel = agents.filter(
    (a) => a.name.startsWith('coder-') && a.sourceModel === openCodeModelRef,
  );
  if (byModel.length === 0) {
    return {
      ok: false,
      reason: `No harness coder role is configured for model "${openCodeModelRef}"`,
    };
  }

  const usable = byModel.find((a) => a.model);
  if (!usable) {
    return {
      ok: false,
      reason: `Harness coder role for "${openCodeModelRef}" exists but the model is not in the harness model map`,
    };
  }

  return { ok: true, agent: usable, modelRef: usable.model! };
}

/**
 * Builds the argument vector for a non-interactive Pi child process.
 * Matches the harness `task` tool's own invocation so receipts produced here
 * are comparable with receipts produced by an interactive orchestrator.
 *
 * @param opts.agent - Role to run
 * @param opts.modelRef - Pi provider/model reference
 * @param opts.prompt - Full prompt text, continuation already appended
 */
export function buildPiArgs(opts: {
  agent: PiAgentDefinition;
  modelRef: string;
  prompt: string;
}): string[] {
  return [
    '--mode',
    'json',
    '-p',
    '--no-session',
    '--approve',
    '--agent',
    opts.agent.name,
    '--model',
    opts.modelRef,
    '--thinking',
    opts.agent.thinkingLevel,
    '--tools',
    toolsForPiAgent(opts.agent).join(','),
    opts.prompt,
  ];
}

/**
 * Splits a Pi `--mode json` stdout stream into parsed events, retaining lines
 * that failed to parse so the caller can persist the raw log intact.
 *
 * @param stdout - Complete stdout text from the child process
 */
export function parsePiEventStream(stdout: string): {
  events: unknown[];
  rawLines: string[];
} {
  const rawLines = stdout.split('\n').filter((line) => line.length > 0);
  const events: unknown[] = [];
  for (const line of rawLines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // Malformed output is preserved in rawLines for the receipt log.
    }
  }
  return { events, rawLines };
}

interface MessageEndEvent {
  type?: string;
  message?: { role?: string; content?: Array<{ type?: string; text?: string }> };
}

/**
 * Extracts the last assistant text block from a parsed Pi event stream.
 *
 * @param events - Events returned by parsePiEventStream
 */
export function finalAssistantText(events: unknown[]): string {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index] as MessageEndEvent;
    if (event?.type !== 'message_end' || event.message?.role !== 'assistant') {
      continue;
    }
    const text = event.message.content?.find((part) => part.type === 'text')?.text;
    if (text) return text;
  }
  return '';
}

/**
 * Reports whether output carries the canonical Measure result block that every
 * `measure-*` child role is contractually required to return.
 *
 * @param output - Final assistant text
 */
export function hasMeasureResultBlock(output: string): boolean {
  return (
    output.includes('MEASURE_AGENT_RESULT') &&
    output.includes('END_MEASURE_AGENT_RESULT')
  );
}

/**
 * Aggregate token and cost usage reported by a Pi run.
 */
export interface PiUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Sums usage across a Pi event stream. Pi reports usage per turn on
 * `turn_end`, so a multi-turn run contributes several records. Returns
 * undefined when no turn reported usage, letting callers distinguish "zero
 * tokens" from "the run never reported usage".
 *
 * @param events - Events returned by parsePiEventStream
 */
export function sumTokenUsage(events: unknown[]): PiUsage | undefined {
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let seen = false;

  for (const raw of events) {
    const event = raw as {
      type?: string;
      message?: {
        usage?: { input?: number; output?: number; cost?: { total?: number } };
      };
    };
    if (event?.type !== 'turn_end') continue;
    const usage = event.message?.usage;
    if (!usage) continue;

    seen = true;
    inputTokens += usage.input ?? 0;
    outputTokens += usage.output ?? 0;
    costUsd += usage.cost?.total ?? 0;
  }

  return seen ? { inputTokens, outputTokens, costUsd } : undefined;
}
