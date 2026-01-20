import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { updatePlanContents } from './plan-detail-writer'
import type { PlanUpdateRequest } from '../shared/plan-update'

interface FakeEntry {
  kind: 'file' | 'dir'
  contents?: string
}

const createFakeFs = (entries: Record<string, FakeEntry>) => {
  return {
    readFileSync: (filePath: string) => {
      const entry = entries[filePath]
      if (!entry || entry.kind !== 'file') {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
      }
      return entry.contents ?? ''
    },
    writeFileSync: (filePath: string, contents: string) => {
      const entry = entries[filePath]
      if (!entry || entry.kind !== 'file') {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
      }
      entry.contents = contents
    },
    existsSync: (filePath: string) => Boolean(entries[filePath]),
    statSync: (filePath: string) => {
      const entry = entries[filePath]
      if (!entry) {
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`)
      }
      return {
        isDirectory: () => entry.kind === 'dir',
      }
    },
  }
}

const createProjectFixture = () => {
  const projectPath = '/repo'
  const conductorPath = path.join(projectPath, 'conductor')
  const tracksPath = path.join(conductorPath, 'tracks.md')
  const trackDir = path.join(conductorPath, 'tracks', 'track-one')
  const planPath = path.join(trackDir, 'plan.md')

  const tracksContents = [
    '# Tracks Registry',
    '- [ ] **Track: Track One**',
    '*Link: [./tracks/track-one/](./tracks/track-one/)*',
  ].join('\n')

  const planContents = ['# Plan', '## Phase 1', '- [ ] Task: Task A'].join('\n')

  const entries: Record<string, FakeEntry> = {
    [path.join(projectPath, '.git')]: { kind: 'dir' },
    [conductorPath]: { kind: 'dir' },
    [tracksPath]: { kind: 'file', contents: tracksContents },
    [trackDir]: { kind: 'dir' },
    [planPath]: { kind: 'file', contents: planContents },
  }

  return { projectPath, entries, paths: { planPath } }
}

describe('updatePlanContents', () => {
  it('writes plan contents for a valid track', () => {
    const { projectPath, entries, paths } = createProjectFixture()
    const fs = createFakeFs(entries)
    const request: PlanUpdateRequest = {
      projectPath,
      trackId: 'track-one',
      trackTitle: 'Track One',
      planContents: '# Updated Plan',
    }

    const response = updatePlanContents(fs, request)

    expect(response.ok).toBe(true)
    expect(entries[paths.planPath].contents).toBe('# Updated Plan')
  })

  it('returns an error when the track cannot be found', () => {
    const { projectPath, entries } = createProjectFixture()
    const fs = createFakeFs(entries)
    const request: PlanUpdateRequest = {
      projectPath,
      trackId: 'missing',
      trackTitle: 'Missing Track',
      planContents: '# Updated Plan',
    }

    const response = updatePlanContents(fs, request)

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('not_found')
    }
  })

  it('returns an error when plan.md is missing', () => {
    const { projectPath, entries, paths } = createProjectFixture()
    delete entries[paths.planPath]
    const fs = createFakeFs(entries)
    const request: PlanUpdateRequest = {
      projectPath,
      trackId: 'track-one',
      trackTitle: 'Track One',
      planContents: '# Updated Plan',
    }

    const response = updatePlanContents(fs, request)

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('not_found')
    }
  })
})
