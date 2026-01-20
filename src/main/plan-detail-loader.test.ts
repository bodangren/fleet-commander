import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { loadPlanDetails } from './plan-detail-loader'

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

  const planContents = [
    '# Implementation Plan',
    '## Phase 1: Start',
    '- [ ] Task: First task',
  ].join('\n')

  const entries: Record<string, FakeEntry> = {
    [path.join(projectPath, '.git')]: { kind: 'dir' },
    [conductorPath]: { kind: 'dir' },
    [tracksPath]: { kind: 'file', contents: tracksContents },
    [trackDir]: { kind: 'dir' },
    [planPath]: { kind: 'file', contents: planContents },
  }

  return { projectPath, entries, paths: { planPath, tracksPath } }
}

describe('loadPlanDetails', () => {
  it('returns plan content for a valid track', () => {
    const { projectPath, entries } = createProjectFixture()
    const fs = createFakeFs(entries)

    const response = loadPlanDetails(fs, {
      projectPath,
      trackId: 'track-one',
      trackTitle: 'Track One',
    })

    expect(response.ok).toBe(true)
    if (response.ok) {
      expect(response.data.trackId).toBe('track-one')
      expect(response.data.trackTitle).toBe('Track One')
      expect(response.data.planContents).toContain('Phase 1: Start')
    }
  })

  it('returns an error when plan.md is missing', () => {
    const { projectPath, entries, paths } = createProjectFixture()
    delete entries[paths.planPath]
    const fs = createFakeFs(entries)

    const response = loadPlanDetails(fs, {
      projectPath,
      trackId: 'track-one',
      trackTitle: 'Track One',
    })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('not_found')
    }
  })

  it('returns an error when the track link is missing', () => {
    const { projectPath, entries, paths } = createProjectFixture()
    entries[paths.tracksPath].contents = [
      '# Tracks Registry',
      '- [ ] **Track: Track One**',
    ].join('\n')
    const fs = createFakeFs(entries)

    const response = loadPlanDetails(fs, {
      projectPath,
      trackTitle: 'Track One',
    })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('invalid_track')
    }
  })
})
