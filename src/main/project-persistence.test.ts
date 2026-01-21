import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  getLastProjectPath,
  getRecentProjects,
  addRecentProject,
  setLastProjectPath,
  PersistenceFileSystem,
} from './project-persistence';

const createFakeFs = () => {
  const files = new Map<string, string>();
  const dirs = new Set<string>();

  const fs: PersistenceFileSystem = {
    readFileSync: (filePath: string, _encoding?: 'utf-8') => {
      const value = files.get(filePath);
      if (value === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      }
      return value;
    },
    writeFileSync: (filePath: string, contents: string, _encoding?: 'utf-8') => {
      files.set(filePath, contents);
    },
    existsSync: (filePath: string) => files.has(filePath) || dirs.has(filePath),
    mkdirSync: (dirPath: string) => {
      dirs.add(dirPath);
    },
  };

  return { fs, files, dirs };
};

describe('project persistence', () => {
  const userDataPath = '/user/data';
  const storagePath = path.join(userDataPath, 'last-project.json');

  it('returns null when no persisted project exists', () => {
    const { fs } = createFakeFs();

    const result = getLastProjectPath(fs, userDataPath);

    expect(result).toBeNull();
  });

  it('reads the last project path from storage', () => {
    const { fs, files } = createFakeFs();
    const payload = { projectPath: '/repo/path' };
    files.set(storagePath, JSON.stringify(payload));

    const result = getLastProjectPath(fs, userDataPath);

    expect(result).toBe('/repo/path');
  });

  it('writes the project path to storage and ensures the directory exists', () => {
    const { fs, files, dirs } = createFakeFs();

    setLastProjectPath(fs, userDataPath, '/repo/path');

    expect(dirs.has(userDataPath)).toBe(true);
    expect(files.has(storagePath)).toBe(true);
    const contents = files.get(storagePath);
    expect(contents).toBeTruthy();
    const parsed = JSON.parse(contents ?? '{}');
    expect(parsed.projectPath).toBe('/repo/path');
  });

  it('returns null when persisted data is invalid', () => {
    const { fs, files } = createFakeFs();
    files.set(storagePath, 'not-json');

    const result = getLastProjectPath(fs, userDataPath);

    expect(result).toBeNull();
  });

  it('returns empty recent projects when none are persisted', () => {
    const { fs } = createFakeFs();

    const result = getRecentProjects(fs, userDataPath);

    expect(result).toEqual([]);
  });

  it('adds recent projects, de-duplicates, and keeps most-recent-first', () => {
    const { fs } = createFakeFs();

    addRecentProject(fs, userDataPath, '/repo/a');
    addRecentProject(fs, userDataPath, '/repo/b');
    addRecentProject(fs, userDataPath, '/repo/a');

    expect(getRecentProjects(fs, userDataPath)).toEqual(['/repo/a', '/repo/b']);
    expect(getLastProjectPath(fs, userDataPath)).toBe('/repo/a');
  });

  it('trims recent projects to the most recent five entries', () => {
    const { fs } = createFakeFs();

    addRecentProject(fs, userDataPath, '/repo/1');
    addRecentProject(fs, userDataPath, '/repo/2');
    addRecentProject(fs, userDataPath, '/repo/3');
    addRecentProject(fs, userDataPath, '/repo/4');
    addRecentProject(fs, userDataPath, '/repo/5');
    addRecentProject(fs, userDataPath, '/repo/6');

    expect(getRecentProjects(fs, userDataPath)).toEqual([
      '/repo/6',
      '/repo/5',
      '/repo/4',
      '/repo/3',
      '/repo/2',
    ]);
  });

  it('returns empty recent projects when persisted data is invalid', () => {
    const { fs, files } = createFakeFs();
    files.set(storagePath, 'not-json');

    const result = getRecentProjects(fs, userDataPath);

    expect(result).toEqual([]);
  });

  it('preserves recent projects when updating last project path', () => {
    const { fs } = createFakeFs();

    addRecentProject(fs, userDataPath, '/repo/a');
    addRecentProject(fs, userDataPath, '/repo/b');
    setLastProjectPath(fs, userDataPath, '/repo/c');

    expect(getRecentProjects(fs, userDataPath)).toEqual(['/repo/b', '/repo/a']);
    expect(getLastProjectPath(fs, userDataPath)).toBe('/repo/c');
  });
});
