import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  loadModelMap,
  loadPiAgents,
  resolveHarnessRoot,
  selectPiAgent,
  type PiAgentDefinition,
} from './piHarness'

export interface PiAgentReadiness {
  agentName?: string
  modelRef: string
  ok: boolean
  binaryFound: boolean
  harnessRoot: string
  provider?: string
  piModel?: string
  piRole?: string
  reason?: string
}

export interface PiHarnessCatalogEntry {
  layer: 'bundled'
  binaryFound: boolean
  readiness: Pick<PiAgentReadiness, 'ok' | 'reason' | 'piModel' | 'piRole'>
  models: string[]
  definition: {
    name: string
    binary: string
    discovery: {
      command: string
      parseStrategy: string
      pattern: string
    }
    invocation: {
      template: string
      flags: Record<string, string>
    }
  }
}

export interface PiHarnessProbeDeps {
  run: (
    args: string[],
    options?: { timeout?: number },
  ) => { status: number | null; stdout?: string; stderr?: string }
  exists: (path: string) => boolean
  readFile: (path: string) => string
}

const DEFAULT_PROBE_DEPS: PiHarnessProbeDeps = {
  run: (args, options) => spawnSync('pi', args, { encoding: 'utf8', ...options }),
  exists: existsSync,
  readFile: path => readFileSync(path, 'utf8'),
}

const PROVIDER_ENV_KEYS: Record<string, string[]> = {
  'openai-codex': ['OPENAI_API_KEY', 'OPENAI_OAUTH_TOKEN'],
  deepseek: ['DEEPSEEK_API_KEY'],
  'minimax-cn': ['MINIMAX_API_KEY'],
  'kimi-coding': ['KIMI_API_KEY'],
  xiaomi: ['XIAOMI_API_KEY', 'XIAOMI_TOKEN_PLAN_CN_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
}

function providerFromModel(modelRef: string): string {
  return modelRef.slice(0, modelRef.indexOf('/'))
}

function hasCredentialValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, entry]) => /(?:key|token|secret|access|refresh)/i.test(key) && hasCredentialValue(entry),
  )
}

function providerHasCredential(
  provider: string,
  env: NodeJS.ProcessEnv,
  deps: PiHarnessProbeDeps,
): boolean {
  const envKeys = PROVIDER_ENV_KEYS[provider] ?? [
    `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`,
  ]
  if (envKeys.some(key => Boolean(env[key]?.trim()))) return true

  const authDir = env.PI_CODING_AGENT_DIR?.trim() || resolve(homedir(), '.pi', 'agent')
  const authPath = resolve(authDir, 'auth.json')
  if (!deps.exists(authPath)) return false
  try {
    const auth = JSON.parse(deps.readFile(authPath)) as Record<string, unknown>
    return hasCredentialValue(auth[provider])
  } catch {
    return false
  }
}

function checkPiInstallation(
  env: NodeJS.ProcessEnv,
  deps: PiHarnessProbeDeps,
): { ok: boolean; root: string; reason?: string } {
  const root = resolveHarnessRoot(env)
  if (!deps.exists(resolve(root, 'agents'))) {
    return { ok: false, root, reason: `pi-measure-harness not found at ${root}` }
  }
  if (!deps.exists(resolve(root, 'config', 'model-map.json'))) {
    return { ok: false, root, reason: `pi-measure-harness model map missing at ${root}` }
  }
  let version: ReturnType<PiHarnessProbeDeps['run']>
  try {
    version = deps.run(['--version'])
  } catch {
    return { ok: false, root, reason: 'pi CLI is not on PATH' }
  }
  if (version.status !== 0) {
    return { ok: false, root, reason: 'pi CLI is not on PATH' }
  }
  return { ok: true, root }
}

/**
 * Checks one Fleet model against the installed Pi role, model map, binary, and
 * local provider credentials. The optional model-list probe is read-only and
 * does not create a session, edit a worktree, or dispatch a task.
 *
 * @param modelRef - Fleet provider/model reference
 * @param env - Environment containing Pi configuration overrides
 * @param deps - Injectable filesystem and process probes
 * @param agentName - Optional Fleet agent name for the result
 * @returns Truthful readiness information for the model
 */
export function checkPiAgentReadiness(
  modelRef: string,
  env: NodeJS.ProcessEnv = process.env,
  deps: PiHarnessProbeDeps = DEFAULT_PROBE_DEPS,
  agentName?: string,
): PiAgentReadiness {
  const installation = checkPiInstallation(env, deps)
  const base = {
    agentName,
    modelRef,
    binaryFound: installation.ok,
    harnessRoot: installation.root,
  }
  if (!installation.ok) return { ...base, ok: false, reason: installation.reason }

  let roster: PiAgentDefinition[]
  let modelMap: Record<string, string>
  try {
    modelMap = loadModelMap(installation.root)
    roster = loadPiAgents(installation.root, modelMap)
  } catch (error) {
    return {
      ...base,
      ok: false,
      reason: error instanceof Error ? error.message : 'Unable to load Pi harness roster',
    }
  }

  const selection = selectPiAgent(roster, modelRef)
  if (!selection.ok) return { ...base, ok: false, reason: selection.reason }

  const provider = providerFromModel(modelRef)
  const selected = {
    ...base,
    provider,
    piModel: selection.modelRef,
    piRole: selection.agent.name,
  }
  if (!providerHasCredential(providerFromModel(selection.modelRef), env, deps)) {
    return { ...selected, ok: false, reason: `Provider credentials unavailable for ${provider}` }
  }

  let probe: ReturnType<PiHarnessProbeDeps['run']>
  try {
    probe = deps.run(['--list-models', selection.modelRef], { timeout: 15_000 })
  } catch {
    return {
      ...selected,
      ok: false,
      reason: `Provider probe failed for ${selection.modelRef}`,
    }
  }
  const output = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`
  const [piProvider, piModel] = selection.modelRef.split('/', 2)
  const selectedModelListed = Boolean(
    piProvider && piModel && output.includes(piProvider) && output.includes(piModel),
  )
  if (
    probe.status !== 0 ||
    !selectedModelListed ||
    /no models available|login to a provider|api key required/i.test(output)
  ) {
    return {
      ...selected,
      ok: false,
      reason: `Provider probe failed for ${selection.modelRef}`,
    }
  }
  return { ...selected, ok: true }
}

/**
 * Builds the provider/model choices exposed by the agent editor from the
 * installed Pi roster and model map rather than Convex harness/OpenCode data.
 *
 * @param env - Environment containing Pi configuration overrides
 * @param deps - Injectable filesystem and process probes
 * @returns Provider entries with truthful binary and structural readiness
 */
export function loadPiHarnessCatalog(
  env: NodeJS.ProcessEnv = process.env,
  deps: PiHarnessProbeDeps = DEFAULT_PROBE_DEPS,
): PiHarnessCatalogEntry[] {
  const root = resolveHarnessRoot(env)
  const binary = checkPiInstallation(env, deps)
  let modelMap: Record<string, string> = {}
  let roster: PiAgentDefinition[] = []
  try {
    modelMap = loadModelMap(root)
    roster = loadPiAgents(root, modelMap)
  } catch {
    // The catalog remains visible with binaryFound=false and a concrete reason.
  }

  const dispatchableSourceRefs = roster
    .filter(agent => agent.name.startsWith('coder-') && agent.sourceModel && agent.model)
    .map(agent => agent.sourceModel!)
  const byProvider = new Map<string, string[]>()
  for (const sourceRef of dispatchableSourceRefs) {
    const slash = sourceRef.indexOf('/')
    if (slash < 1 || slash === sourceRef.length - 1) continue
    const provider = sourceRef.slice(0, slash)
    const model = sourceRef.slice(slash + 1)
    const models = byProvider.get(provider) ?? []
    if (!models.includes(model)) models.push(model)
    byProvider.set(provider, models)
  }

  return Array.from(byProvider.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provider, models]) => {
      const firstRef = `${provider}/${models[0]}`
      const selection = binary.ok ? selectPiAgent(roster, firstRef) : null
      const credentialsReady = Boolean(
        selection?.ok && providerHasCredential(providerFromModel(selection.modelRef), env, deps),
      )
      const reason = !binary.ok
        ? binary.reason
        : selection && !selection.ok
          ? selection.reason
          : !credentialsReady
            ? `Provider credentials unavailable for ${provider}`
            : undefined
      return {
        layer: 'bundled' as const,
        binaryFound: binary.ok,
        readiness: {
          ok: binary.ok && Boolean(selection?.ok) && credentialsReady,
          reason,
          piModel: selection?.ok ? selection.modelRef : undefined,
          piRole: selection?.ok ? selection.agent.name : undefined,
        },
        models: models.sort(),
        definition: {
          name: provider,
          binary: 'pi',
          discovery: {
            command: 'pi --list-models',
            parseStrategy: 'pi-roster',
            pattern: `${provider}/*`,
          },
          invocation: {
            template: 'pi --model {model} --mode json -p {prompt}',
            flags: { readiness: 'pi --list-models {model}' },
          },
        },
      }
    })
}
