import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { dialog, ipcMain } from 'electron';
import { createProjectHandlers } from './project-ipc';
import { loadProjectData, FileSystemAdapter } from './project-loader';
import { IPC_CHANNELS } from '../shared/ipc';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

interface FakeEntry {
  kind: 'file' | 'dir';
  contents?: string;
}

const createFakeFs = (entries: Record<string, FakeEntry>): FileSystemAdapter => {
  return {
    readFileSync: (filePath: string) => {
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

describe('project IPC handlers', () => {
  const ipcHandle = vi.mocked(ipcMain.handle);
  const showOpenDialog = vi.mocked(dialog.showOpenDialog);

  beforeEach(() => {
    ipcHandle.mockReset();
    showOpenDialog.mockReset();
  });

  it('returns a cancelled error when no folder is selected', async () => {
    const { projectPath, entries } = createProjectFixture();
    const fakeFs = createFakeFs(entries);
    const loadProject = (pathInput: string) => loadProjectData(fakeFs, pathInput);
    const handlers = createProjectHandlers({
      selectFolder: async () => null,
      loadProject,
    });

    const response = await handlers.selectProject();

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('cancelled');
    }
  });

  it('returns an invalid project error when loading with an empty path', async () => {
    const { entries } = createProjectFixture();
    const fakeFs = createFakeFs(entries);
    const loadProject = (pathInput: string) => loadProjectData(fakeFs, pathInput);
    const handlers = createProjectHandlers({
      selectFolder: async () => '/repo',
      loadProject,
    });

    const response = await handlers.loadProject({}, '   ');

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('invalid_project');
    }
  });

  it('loads project data after selecting a valid folder', async () => {
    const { projectPath, entries } = createProjectFixture();
    const fakeFs = createFakeFs(entries);
    const loadProject = (pathInput: string) => loadProjectData(fakeFs, pathInput);
    const handlers = createProjectHandlers({
      selectFolder: async () => projectPath,
      loadProject,
    });

    const response = await handlers.selectProject();

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.projectPath).toBe(projectPath);
      expect(response.data.tasks).toHaveLength(2);
      expect(response.data.tracks).toHaveLength(1);
      expect(response.data.tasks[0].trackTitle).toBe('Track One');
    }
  });

  it('returns a validation error when refreshing an invalid project', async () => {
    const { projectPath, entries } = createProjectFixture();
    const invalidEntries = { ...entries };
    delete invalidEntries[path.join(projectPath, '.git')];
    const fakeFs = createFakeFs(invalidEntries);
    const loadProject = (pathInput: string) => loadProjectData(fakeFs, pathInput);
    const handlers = createProjectHandlers({
      selectFolder: async () => projectPath,
      loadProject,
    });

    const response = await handlers.refreshBoard({}, projectPath);

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('missing_git');
    }
  });

  it('registers handlers and wires dialog selection', async () => {
    const { registerProjectIpcHandlers } = await import('./project-ipc');

    showOpenDialog.mockResolvedValueOnce({
      canceled: true,
      filePaths: [],
    });

    registerProjectIpcHandlers();

    expect(ipcHandle).toHaveBeenCalledTimes(3);
    expect(ipcHandle).toHaveBeenCalledWith(IPC_CHANNELS.selectProject, expect.any(Function));
    expect(ipcHandle).toHaveBeenCalledWith(IPC_CHANNELS.loadProject, expect.any(Function));
    expect(ipcHandle).toHaveBeenCalledWith(IPC_CHANNELS.refreshBoard, expect.any(Function));

    const selectHandler = ipcHandle.mock.calls.find(
      call => call[0] === IPC_CHANNELS.selectProject,
    )?.[1];

    expect(selectHandler).toBeDefined();
    if (selectHandler) {
      const response = await selectHandler();
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.error.code).toBe('cancelled');
      }
    }
  });
});
