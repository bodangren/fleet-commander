import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const E2E_ROOT = join(__dirname, '..', '..', 'e2e')
const LIVE_SPEC_PATH = join(E2E_ROOT, 'fleet-bootstrap-live.spec.ts')

function readLiveSpec(): string {
  return readFileSync(LIVE_SPEC_PATH, 'utf8')
}

describe('fleet bootstrap live evidence contract', () => {
  it('keeps a real tagged cold-load proof at the Quality selector boundary', () => {
    expect(existsSync(LIVE_SPEC_PATH)).toBe(true)
    const source = readLiveSpec()

    expect(source).toContain('@live @fleet-bootstrap')
    expect(source).toContain('/settings/quality?project=')
    expect(source).toContain("getByRole('combobox', { name: 'Project', exact: true })")
    expect(source).toContain("getByRole('heading', { name: 'Quality workflow', exact: true })")
    expect(source).toContain("test.info().attach('fleet-bootstrap-request-ledger'")
  })

  it('forbids mocked transport, fixed waits, and bootstrap writes in the live proof', () => {
    const source = readLiveSpec()
    const forbiddenPatterns = [
      /\bpage\s*\.\s*route\s*\(/,
      /\broute\s*\.\s*fulfill\s*\(/,
      /\bseedScenario\s*\(/,
      /\bsetupMockApp\b/,
      /\bwaitForTimeout\s*\(/,
    ]

    for (const pattern of forbiddenPatterns) {
      expect(source, `live fleet bootstrap proof must not contain ${pattern}`).not.toMatch(pattern)
    }
    expect(source).toContain("const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])")
    expect(source).toContain('expect(telemetry.mutationRequests).toEqual([])')
  })

  it('records source-aware ordering and pins only the measured selector readiness guardrail', () => {
    const source = readLiveSpec()

    for (const resourcePath of ['/api/health', '/api/projects', '/api/agents', '/api/harnesses']) {
      expect(source).toContain(resourcePath)
    }
    expect(source).toContain('const projectSelectorGuardrailMs = 13_100')
    expect(source).toContain('selectorRenderToleranceMs')
    expect(source).toContain("import('/src/lib/dataAdapter.ts')")
    expect(source).toContain(
      'Convex-backed ${resourceName} must not duplicate GET /api/${resourceName}',
    )
    expect(source).toContain("if (sliceConfig.projects === 'bun')")
    expect(source).toContain('expect(telemetry.slugResolution?.status).toBe(200)')
    expect(source).toContain(
      'harness-after-project: selector was not blocked on harness settlement',
    )
    expect(source).toContain('expect(telemetry.failedApiResponses).toEqual([])')
  })
})
