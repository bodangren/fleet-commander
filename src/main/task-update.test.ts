import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { updateTaskStatus } from './task-update'
import type { TaskUpdateRequest } from '../shared/task-update'

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
  const metadataPath = path.join(trackDir, 'metadata.json')

  const tracksContents = [
    '# Tracks Registry',
    '- [ ] **Track: Track One**',
    '*Link: [./tracks/track-one/](./tracks/track-one/)*',
  ].join('\n')

  const planContents = [
    '# Implementation Plan',
    '## Phase 1: Start',
    '- [ ] Task: First task',
    '- [x] Task: Second task',
  ].join('\n')

  const metadataContents = JSON.stringify(
    {
      track_id: 'track-one',
      type: 'feature',
      status: 'new',
      created_at: '2026-01-20T00:00:00Z',
      updated_at: '2026-01-20T00:00:00Z',
      description: 'Sample',
    },
    null,
    2,
  )

  const entries: Record<string, FakeEntry> = {
    [path.join(projectPath, '.git')]: { kind: 'dir' },
    [conductorPath]: { kind: 'dir' },
    [tracksPath]: { kind: 'file', contents: tracksContents },
    [trackDir]: { kind: 'dir' },
    [planPath]: { kind: 'file', contents: planContents },
    [metadataPath]: { kind: 'file', contents: metadataContents },
  }

  return { projectPath, entries, paths: { tracksPath, planPath, metadataPath } }
}

describe('updateTaskStatus', () => {
  it('returns an error when project path is missing', () => {
    const { entries } = createProjectFixture()
    const fs = createFakeFs(entries)
    const request: TaskUpdateRequest = {
      projectPath: '',
      trackId: 'track-one',
      trackTitle: 'Track One',
      phase: 'Phase 1: Start',
      title: 'First task',
      nextStatus: 'in_progress',
    }

    const response = updateTaskStatus(fs, request)

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('invalid_project')
    }
  })

  it('updates the task marker and metadata when completing all tasks', () => {
    const { projectPath, entries, paths } = createProjectFixture()
    const fs = createFakeFs(entries)
    const request: TaskUpdateRequest = {
      projectPath,
      trackId: 'track-one',
      trackTitle: 'Track One',
      phase: 'Phase 1: Start',
      title: 'First task',
      nextStatus: 'done',
    }

    const response = updateTaskStatus(fs, request)

    expect(response.ok).toBe(true)
    const updatedPlan = entries[paths.planPath].contents ?? ''
    expect(updatedPlan).toContain('- [x] Task: First task')
    const updatedTracks = entries[paths.tracksPath].contents ?? ''
    expect(updatedTracks).toContain('- [x] **Track: Track One**')
    const updatedMetadata = JSON.parse(entries[paths.metadataPath].contents ?? '{}')
    expect(updatedMetadata.status).toBe('completed')
    expect(updatedMetadata.updated_at).not.toBe('2026-01-20T00:00:00Z')
  })

  it('keeps the track in progress when not all tasks are done', () => {
    const { projectPath, entries, paths } = createProjectFixture()
    entries[paths.tracksPath].contents = [
      '# Tracks Registry',
      '- [~] **Track: Track One**',
      '*Link: [./tracks/track-one/](./tracks/track-one/)*',
    ].join('\n')
    const fs = createFakeFs(entries)
    const request: TaskUpdateRequest = {
      projectPath,
      trackId: 'track-one',
      trackTitle: 'Track One',
      phase: 'Phase 1: Start',
      title: 'First task',
      nextStatus: 'in_progress',
    }

    const response = updateTaskStatus(fs, request)

    expect(response.ok).toBe(true)
    const updatedTracks = entries[paths.tracksPath].contents ?? ''
    expect(updatedTracks).toContain('- [~] **Track: Track One**')
    const updatedMetadata = JSON.parse(entries[paths.metadataPath].contents ?? '{}')
    expect(updatedMetadata.status).toBe('in_progress')
    expect(updatedMetadata.updated_at).not.toBe('2026-01-20T00:00:00Z')
  })

  it('returns an error when the track cannot be found', () => {
    const { projectPath, entries } = createProjectFixture()
    const fs = createFakeFs(entries)
    const request: TaskUpdateRequest = {
      projectPath,
      trackId: 'missing',
      trackTitle: 'Missing Track',
      phase: 'Phase 1: Start',
      title: 'First task',
      nextStatus: 'in_progress',
    }

    const response = updateTaskStatus(fs, request)

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('not_found')
    }
  })
})
