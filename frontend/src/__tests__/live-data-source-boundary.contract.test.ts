import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const E2E_ROOT = join(__dirname, '..', '..', 'e2e')
const LIVE_CORE_PATH = join(E2E_ROOT, 'live-core.spec.ts')
const SECONDARY_READ_PATH = join(E2E_ROOT, 'secondary-read-live.spec.ts')

function readSpec(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('live data-source boundary contract', () => {
  it('keeps the live provider catalog source-aware without weakening rendered truth', () => {
    expect(existsSync(LIVE_CORE_PATH)).toBe(true)
    const source = readSpec(LIVE_CORE_PATH)

    expect(source).toContain("import('/src/lib/dataAdapter.ts')")
    expect(source).toContain("if (harnessesSource === 'bun')")
    expect(source).toContain('response.status() === 200')
    expect(source).toContain(
      'Convex-backed harnesses must not request GET /api/harnesses from the page',
    )
    expect(source).toContain('Pi catalog entry — read-only.')
    expect(source).toContain('No Pi providers are configured.')
  })

  it('resolves history project identity from the correct real boundary for each source', () => {
    expect(existsSync(SECONDARY_READ_PATH)).toBe(true)
    const source = readSpec(SECONDARY_READ_PATH)

    expect(source).toContain("import('/src/lib/dataAdapter.ts')")
    expect(source).toContain('request: APIRequestContext')
    expect(source).toContain("if (projectsSource === 'bun')")
    expect(source).toContain(
      'Convex-backed projects must not request GET /api/projects from the page',
    )
    expect(source).toContain("request.get('/api/projects')")
  })
})
