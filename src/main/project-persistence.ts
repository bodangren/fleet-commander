import { join } from 'node:path';

export interface PersistenceFileSystem {
  readFileSync(path: string, encoding: 'utf-8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf-8'): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

const STORAGE_FILE = 'last-project.json';

function getStoragePath(userDataPath: string): string {
  return join(userDataPath, STORAGE_FILE);
}

export function getLastProjectPath(
  fs: PersistenceFileSystem,
  userDataPath: string,
): string | null {
  const storagePath = getStoragePath(userDataPath);
  if (!fs.existsSync(storagePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(storagePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'projectPath' in parsed &&
      typeof (parsed as { projectPath?: unknown }).projectPath === 'string'
    ) {
      const projectPath = (parsed as { projectPath: string }).projectPath.trim();
      return projectPath.length > 0 ? projectPath : null;
    }
  } catch {
    return null;
  }

  return null;
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

  fs.mkdirSync(userDataPath, { recursive: true });
  const storagePath = getStoragePath(userDataPath);
  fs.writeFileSync(storagePath, JSON.stringify({ projectPath: trimmedPath }), 'utf-8');
}
