import { join } from 'node:path';

export interface PersistenceFileSystem {
  readFileSync(path: string, encoding: 'utf-8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf-8'): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

const STORAGE_FILE = 'last-project.json';

interface ProjectStorage {
  projectPath?: string;
  recentProjects?: string[];
}

function getStoragePath(userDataPath: string): string {
  return join(userDataPath, STORAGE_FILE);
}

function readStorage(
  fs: PersistenceFileSystem,
  userDataPath: string,
): ProjectStorage | null {
  const storagePath = getStoragePath(userDataPath);
  if (!fs.existsSync(storagePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(storagePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as ProjectStorage;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeRecentProjects(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}

function writeStorage(
  fs: PersistenceFileSystem,
  userDataPath: string,
  storage: ProjectStorage,
): void {
  fs.mkdirSync(userDataPath, { recursive: true });
  const storagePath = getStoragePath(userDataPath);
  fs.writeFileSync(storagePath, JSON.stringify(storage), 'utf-8');
}

export function getLastProjectPath(
  fs: PersistenceFileSystem,
  userDataPath: string,
): string | null {
  const stored = readStorage(fs, userDataPath);
  const projectPath =
    stored && typeof stored.projectPath === 'string' ? stored.projectPath.trim() : '';
  return projectPath.length > 0 ? projectPath : null;
}

export function setLastProjectPath(
  fs: PersistenceFileSystem,
  userDataPath: string,
  projectPath: string,
): void {
  const trimmedPath = projectPath.trim();
  if (trimmedPath.length === 0) {
    return;
  }

  const stored = readStorage(fs, userDataPath);
  writeStorage(fs, userDataPath, {
    projectPath: trimmedPath,
    recentProjects: normalizeRecentProjects(stored?.recentProjects),
  });
}

export function getRecentProjects(
  fs: PersistenceFileSystem,
  userDataPath: string,
): string[] {
  const stored = readStorage(fs, userDataPath);
  return normalizeRecentProjects(stored?.recentProjects);
}

export function addRecentProject(
  fs: PersistenceFileSystem,
  userDataPath: string,
  projectPath: string,
  limit: number = 5,
): string[] {
  const trimmedPath = projectPath.trim();
  if (trimmedPath.length === 0) {
    return getRecentProjects(fs, userDataPath);
  }

  const recent = getRecentProjects(fs, userDataPath);
  const nextRecent = [
    trimmedPath,
    ...recent.filter(entry => entry !== trimmedPath),
  ].slice(0, Math.max(0, limit));

  writeStorage(fs, userDataPath, {
    projectPath: trimmedPath,
    recentProjects: nextRecent,
  });

  return nextRecent;
}
