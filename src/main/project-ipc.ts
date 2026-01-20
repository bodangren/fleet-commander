import { app, dialog, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { IPC_CHANNELS } from '../shared/ipc';
import { ProjectLoadResponse } from '../shared/board-data';
import { FileSystemAdapter, loadProjectData } from './project-loader';
import { getLastProjectPath, setLastProjectPath, PersistenceFileSystem } from './project-persistence';

export interface ProjectIpcDependencies {
  selectFolder: () => Promise<string | null>;
  loadProject: (projectPath: string) => ProjectLoadResponse;
}

export interface ProjectIpcHandlers {
  selectProject: () => Promise<ProjectLoadResponse>;
  loadProject: (event: unknown, projectPath: string) => Promise<ProjectLoadResponse>;
  refreshBoard: (event: unknown, projectPath: string) => Promise<ProjectLoadResponse>;
}

const emptyPathResponse: ProjectLoadResponse = {
  ok: false,
  error: {
    code: 'invalid_project',
    message: 'Project path is required.',
  },
};

export function createProjectHandlers(deps: ProjectIpcDependencies): ProjectIpcHandlers {
  const loadProject = async (_event: unknown, projectPath: string) => {
    if (!projectPath || projectPath.trim().length === 0) {
      return emptyPathResponse;
    }
    return deps.loadProject(projectPath);
  };

  const refreshBoard = async (event: unknown, projectPath: string) => {
    return loadProject(event, projectPath);
  };

  const selectProject = async () => {
    const selected = await deps.selectFolder();
    if (!selected) {
      return {
        ok: false,
        error: {
          code: 'cancelled',
          message: 'Project selection was cancelled.',
        },
      };
    }
    return deps.loadProject(selected);
  };

  return {
    selectProject,
    loadProject,
    refreshBoard,
  };
}

export function registerProjectIpcHandlers(): void {
  const fileSystem: FileSystemAdapter = {
    readFileSync,
    existsSync,
    statSync,
  };
  const persistenceFileSystem: PersistenceFileSystem = {
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
  };
  const userDataPath = app.getPath('userData');

  const selectFolder = async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0] ?? null;
  };

  const loadProject = (projectPath: string) => {
    const response = loadProjectData(fileSystem, projectPath);
    if (response.ok) {
      setLastProjectPath(persistenceFileSystem, userDataPath, projectPath);
    }
    return response;
  };

  const handlers = createProjectHandlers({
    selectFolder,
    loadProject,
  });

  ipcMain.handle(IPC_CHANNELS.selectProject, handlers.selectProject);
  ipcMain.handle(IPC_CHANNELS.loadProject, handlers.loadProject);
  ipcMain.handle(IPC_CHANNELS.refreshBoard, handlers.refreshBoard);
  ipcMain.handle(IPC_CHANNELS.getLastProjectPath, () =>
    getLastProjectPath(persistenceFileSystem, userDataPath),
  );
}
