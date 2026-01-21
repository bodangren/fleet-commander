import { app, BrowserWindow, dialog, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import type { ProjectLoadResponse } from '../shared/board-data';
import { IPC_CHANNELS } from '../shared/ipc';
import { loadProjectData, FileSystemAdapter } from './project-loader';
import {
  addRecentProject,
  getRecentProjects,
  PersistenceFileSystem,
} from './project-persistence';

export interface AppMenuDependencies {
  buildFromTemplate: typeof Menu.buildFromTemplate;
  setApplicationMenu: typeof Menu.setApplicationMenu;
  showOpenDialog: typeof dialog.showOpenDialog;
  getAllWindows: typeof BrowserWindow.getAllWindows;
  loadProject: (projectPath: string) => ProjectLoadResponse;
  addRecentProject: (userDataPath: string, projectPath: string) => string[];
  getRecentProjects: (userDataPath: string) => string[];
  userDataPath: string;
}

export function createAppMenu(deps: AppMenuDependencies) {
  const notifyRenderer = (response: ProjectLoadResponse) => {
    const [window] = deps.getAllWindows();
    if (!window) {
      return;
    }
    window.webContents.send(IPC_CHANNELS.menuProjectLoad, response);
  };

  const refreshMenu = () => {
    const template = buildTemplate();
    const menu = deps.buildFromTemplate(template);
    deps.setApplicationMenu(menu);
  };

  const handleProjectLoad = (projectPath: string) => {
    const response = deps.loadProject(projectPath);
    if (response.ok) {
      deps.addRecentProject(deps.userDataPath, projectPath);
    }
    notifyRenderer(response);
    refreshMenu();
  };

  const handleOpenProject = async () => {
    const result = await deps.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return;
    }
    const projectPath = result.filePaths[0];
    if (!projectPath) {
      return;
    }
    handleProjectLoad(projectPath);
  };

  const handleOpenRecent = (projectPath: string) => {
    handleProjectLoad(projectPath);
  };

  const buildTemplate = (): MenuItemConstructorOptions[] => {
    const recentProjects = deps.getRecentProjects(deps.userDataPath);
    const recentItems =
      recentProjects.length > 0
        ? recentProjects.map(projectPath => ({
            label: projectPath,
            click: () => handleOpenRecent(projectPath),
          }))
        : [
            {
              label: 'No Recent Projects',
              enabled: false,
            },
          ];

    return [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Project...',
            click: handleOpenProject,
          },
          {
            label: 'Open Recent',
            submenu: recentItems,
          },
        ],
      },
    ];
  };

  refreshMenu();

  return { refreshMenu, buildTemplate };
}

export function registerAppMenu() {
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
  const loadProject = (projectPath: string) => loadProjectData(fileSystem, projectPath);

  return createAppMenu({
    buildFromTemplate: Menu.buildFromTemplate,
    setApplicationMenu: Menu.setApplicationMenu,
    showOpenDialog: dialog.showOpenDialog,
    getAllWindows: BrowserWindow.getAllWindows,
    loadProject,
    addRecentProject: (path, projectPath) =>
      addRecentProject(persistenceFileSystem, path, projectPath),
    getRecentProjects: path => getRecentProjects(persistenceFileSystem, path),
    userDataPath,
  });
}
