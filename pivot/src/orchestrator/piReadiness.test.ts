import { describe, expect, it } from 'bun:test'
import { loadModelMap, loadPiAgents } from './piHarness'
import { checkPiAgentReadiness, loadPiHarnessCatalog, type PiHarnessProbeDeps } from './piReadiness'

const harnessRoot = '/home/daniebo/Desktop/pi-measure-harness'

function makeDeps(listOutput: string, listStatus = 0): PiHarnessProbeDeps {
  return {
    run: args =>
      args[0] === '--version'
        ? { status: 0, stdout: '0.80.6' }
        : { status: listStatus, stdout: listOutput },
    exists: path =>
      path === `${harnessRoot}/agents` || path === `${harnessRoot}/config/model-map.json`,
    readFile: () => '{}',
  }
}

describe('Pi readiness', () => {
  it('fails closed when the Pi installation is absent', () => {
    const result = checkPiAgentReadiness(
      'minimax-cn-coding-plan/MiniMax-M3',
      { PI_MEASURE_HARNESS_ROOT: '/missing' },
      { ...makeDeps(''), exists: () => false },
      'coder',
    )
    expect(result.ok).toBe(false)
    expect(result.binaryFound).toBe(false)
    expect(result.reason).toContain('not found')
  })

  it('requires a mapped role, credential, and successful provider model probe', () => {
    const result = checkPiAgentReadiness(
      'minimax-cn-coding-plan/MiniMax-M3',
      {
        PI_MEASURE_HARNESS_ROOT: harnessRoot,
        MINIMAX_API_KEY: 'test-only-placeholder',
      },
      makeDeps('minimax-cn/MiniMax-M3'),
      'coder',
    )
    expect(result.ok).toBe(true)
    expect(result.piRole).toBe('coder-minimax-m3')
    expect(result.piModel).toBe('minimax-cn/MiniMax-M3')
  })

  it('rejects a provider probe that reports no available models', () => {
    const result = checkPiAgentReadiness(
      'minimax-cn-coding-plan/MiniMax-M3',
      {
        PI_MEASURE_HARNESS_ROOT: harnessRoot,
        MINIMAX_API_KEY: 'test-only-placeholder',
      },
      makeDeps('No models available. Use /login to log into a provider.'),
      'coder',
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Provider probe failed')
  })

  it('rejects a zero-exit provider probe that does not list the selected model', () => {
    const result = checkPiAgentReadiness(
      'minimax-cn-coding-plan/MiniMax-M3',
      {
        PI_MEASURE_HARNESS_ROOT: harnessRoot,
        MINIMAX_API_KEY: 'test-only-placeholder',
      },
      makeDeps('provider model context max-out'),
      'coder',
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Provider probe failed')
  })

  it('does not mistake auth metadata for a provider credential', () => {
    const deps = makeDeps('minimax-cn/MiniMax-M3')
    const result = checkPiAgentReadiness(
      'minimax-cn-coding-plan/MiniMax-M3',
      {
        PI_MEASURE_HARNESS_ROOT: harnessRoot,
        PI_CODING_AGENT_DIR: '/pi-agent',
      },
      {
        ...deps,
        exists: path => deps.exists(path) || path === '/pi-agent/auth.json',
        readFile: () => JSON.stringify({ 'minimax-cn': { type: 'api_key', key: '' } }),
      },
      'coder',
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('credentials unavailable')
  })

  it('returns a blocked result when the Pi probe throws', () => {
    const deps = makeDeps('minimax-cn/MiniMax-M3')
    const result = checkPiAgentReadiness(
      'minimax-cn-coding-plan/MiniMax-M3',
      {
        PI_MEASURE_HARNESS_ROOT: harnessRoot,
        MINIMAX_API_KEY: 'test-only-placeholder',
      },
      {
        ...deps,
        run: args => {
          if (args[0] === '--version') return { status: 0, stdout: '0.80.6' }
          throw new Error('spawn failed')
        },
      },
      'coder',
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Provider probe failed')
  })

  it('exposes the installed Pi providers and truthful binary state', () => {
    const catalog = loadPiHarnessCatalog(
      {
        PI_MEASURE_HARNESS_ROOT: harnessRoot,
        MINIMAX_API_KEY: 'test-only-placeholder',
      },
      makeDeps(''),
    )
    const minimax = catalog.find(entry => entry.definition.name === 'minimax-cn-coding-plan')
    expect(minimax?.binaryFound).toBe(true)
    expect(minimax?.models).toContain('MiniMax-M3')
    expect(minimax?.definition.binary).toBe('pi')
  })

  it('only exposes models backed by a mapped coder role', () => {
    const catalog = loadPiHarnessCatalog({ PI_MEASURE_HARNESS_ROOT: harnessRoot }, makeDeps(''))
    const modelMap = loadModelMap(harnessRoot)
    const expected = new Set(
      loadPiAgents(harnessRoot, modelMap)
        .filter(agent => agent.name.startsWith('coder-') && agent.sourceModel && agent.model)
        .map(agent => agent.sourceModel!),
    )
    const exposed = new Set(
      catalog.flatMap(entry => entry.models.map(model => `${entry.definition.name}/${model}`)),
    )
    expect(exposed).toEqual(expected)
  })
})
