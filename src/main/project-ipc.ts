import { dialog, ipcMain } from 'electron';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { IPC_CHANNELS } from '../shared/ipc';
import { ProjectLoadResponse } from '../shared/board-data';
import { FileSystemAdapter, loadProjectData } from './project-loader';

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

  const selectFolder = async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0] ?? null;
  };

  const handlers = createProjectHandlers({
    selectFolder,
    loadProject: projectPath => loadProjectData(fileSystem, projectPath),
  });

  ipcMain.handle(IPC_CHANNELS.selectProject, handlers.selectProject);
  ipcMain.handle(IPC_CHANNELS.loadProject, handlers.loadProject);
  ipcMain.handle(IPC_CHANNELS.refreshBoard, handlers.refreshBoard);
}
