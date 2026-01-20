import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadProjectData, validateProjectFolder, FileSystemAdapter } from './project-loader';

interface FakeEntry {
  kind: 'file' | 'dir';
  contents?: string;
}

const createFakeFs = (entries: Record<string, FakeEntry>): FileSystemAdapter => {
  return {
    readFileSync: (filePath: string, _encoding?: 'utf-8') => {
      const entry = entries[filePath];
      if (!entry || entry.kind !== 'file') {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      }
      return entry.contents ?? '';
    },
    existsSync: (filePath: string) => {
      return Boolean(entries[filePath]);
    },
    statSync: (filePath: string) => {
      const entry = entries[filePath];
      if (!entry) {
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
      }
      return {
        isDirectory: () => entry.kind === 'dir',
      };
    },
  };
};

const createProjectFixture = () => {
  const projectPath = '/repo';
  const conductorPath = path.join(projectPath, 'conductor');
  const tracksPath = path.join(conductorPath, 'tracks.md');
  const trackDir = path.join(conductorPath, 'tracks', 'track-one');
  const planPath = path.join(trackDir, 'plan.md');

  const tracksContents = [
    '# Tracks Registry',
    '- [ ] **Track: Track One**',
    '*Link: [./tracks/track-one/](./tracks/track-one/)*',
  ].join('\n');

  const planContents = [
    '# Implementation Plan',
    '## Phase 1: Start',
    '- [ ] Task: First task',
    '- [x] Task: Done task',
  ].join('\n');

  const entries: Record<string, FakeEntry> = {
    [path.join(projectPath, '.git')]: { kind: 'dir' },
    [conductorPath]: { kind: 'dir' },
    [tracksPath]: { kind: 'file', contents: tracksContents },
    [trackDir]: { kind: 'dir' },
    [planPath]: { kind: 'file', contents: planContents },
  };

  return { projectPath, entries };
};

describe('project loader', () => {
  it('returns a missing git error when .git is absent', () => {
    const { projectPath, entries } = createProjectFixture();
    const invalidEntries = { ...entries };
    delete invalidEntries[path.join(projectPath, '.git')];
    const fakeFs = createFakeFs(invalidEntries);

    const result = validateProjectFolder(fakeFs, projectPath);

    expect(result?.code).toBe('missing_git');
  });

  it('returns a missing conductor error when conductor is absent', () => {
    const { projectPath, entries } = createProjectFixture();
    const invalidEntries = { ...entries };
    delete invalidEntries[path.join(projectPath, 'conductor')];
    const fakeFs = createFakeFs(invalidEntries);

    const result = validateProjectFolder(fakeFs, projectPath);

    expect(result?.code).toBe('missing_conductor');
  });

  it('loads tracks and tasks from a valid project folder', () => {
    const { projectPath, entries } = createProjectFixture();
    const fakeFs = createFakeFs(entries);

    const result = loadProjectData(fakeFs, projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projectPath).toBe(projectPath);
      expect(result.data.tracks).toHaveLength(1);
      expect(result.data.tasks).toHaveLength(2);
      expect(result.data.tasks[0].trackTitle).toBe('Track One');
    }
  });

  it('loads tasks when track links include the conductor prefix', () => {
    const { projectPath, entries } = createProjectFixture();
    const conductorPath = path.join(projectPath, 'conductor');
    const tracksPath = path.join(conductorPath, 'tracks.md');
    const prefixedEntries = {
      ...entries,
      [tracksPath]: {
        kind: 'file' as const,
        contents: [
          '# Tracks Registry',
          '- [ ] **Track: Track One**',
          '*Link: [./conductor/tracks/track-one/](./conductor/tracks/track-one/)*',
        ].join('\n'),
      },
    };
    const fakeFs = createFakeFs(prefixedEntries);

    const result = loadProjectData(fakeFs, projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tasks).toHaveLength(2);
      expect(result.data.tasks[0].trackTitle).toBe('Track One');
    }
  });
});
