import { describe, it, expect, vi } from 'vitest';
import type { ProjectLoadResponse } from '../shared/board-data';
import { IPC_CHANNELS } from '../shared/ipc';
import { createAppMenu } from './app-menu';

const createResponse = (projectPath: string): ProjectLoadResponse => ({
  ok: true,
  data: {
    projectPath,
    tracks: [],
    tasks: [],
  },
});

const createDeps = (overrides: Partial<Parameters<typeof createAppMenu>[0]> = {}) => {
  const window = {
    webContents: {
      send: vi.fn(),
    },
  };

  const buildFromTemplate = vi.fn((template: unknown) => ({ template }));
  const setApplicationMenu = vi.fn();

  return {
    buildFromTemplate,
    setApplicationMenu,
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/repo/opened'] }),
    getAllWindows: vi.fn(() => [window]),
    loadProject: vi.fn((projectPath: string) => createResponse(projectPath)),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(() => []),
    userDataPath: '/user/data',
    ...overrides,
  };
};

const getFileMenu = (template: any[]) => template.find(item => item.label === 'File');
const getMenuItem = (submenu: any[], label: string) =>
  submenu.find(item => item.label === label);

const getTemplate = (buildFromTemplate: ReturnType<typeof vi.fn>) =>
  buildFromTemplate.mock.calls[0]?.[0] as any[];

describe('app menu', () => {
  it('builds Open Recent entries from persisted list', () => {
    const deps = createDeps({
      getRecentProjects: vi.fn(() => ['/repo/one', '/repo/two']),
    });

    createAppMenu(deps);

    const template = getTemplate(deps.buildFromTemplate);
    const fileMenu = getFileMenu(template);
    const openRecent = getMenuItem(fileMenu.submenu, 'Open Recent');

    expect(openRecent.submenu.map((item: any) => item.label)).toEqual([
      '/repo/one',
      '/repo/two',
    ]);
  });

  it('shows a disabled placeholder when no recent projects exist', () => {
    const deps = createDeps();

    createAppMenu(deps);

    const template = getTemplate(deps.buildFromTemplate);
    const fileMenu = getFileMenu(template);
    const openRecent = getMenuItem(fileMenu.submenu, 'Open Recent');

    expect(openRecent.submenu).toHaveLength(1);
    expect(openRecent.submenu[0].label).toBe('No Recent Projects');
    expect(openRecent.submenu[0].enabled).toBe(false);
  });

  it('loads a recent project and notifies the renderer', () => {
    const deps = createDeps({
      getRecentProjects: vi.fn(() => ['/repo/recent']),
    });

    createAppMenu(deps);

    const template = getTemplate(deps.buildFromTemplate);
    const fileMenu = getFileMenu(template);
    const openRecent = getMenuItem(fileMenu.submenu, 'Open Recent');
    const recentItem = openRecent.submenu[0];

    recentItem.click();

    expect(deps.loadProject).toHaveBeenCalledWith('/repo/recent');
    expect(deps.addRecentProject).toHaveBeenCalledWith('/user/data', '/repo/recent');
    expect(deps.getAllWindows).toHaveBeenCalled();
    const window = deps.getAllWindows.mock.results[0].value[0];
    expect(window.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.menuProjectLoad,
      createResponse('/repo/recent'),
    );
  });

  it('opens a project from the dialog and notifies the renderer', async () => {
    const deps = createDeps();

    createAppMenu(deps);

    const template = getTemplate(deps.buildFromTemplate);
    const fileMenu = getFileMenu(template);
    const openProject = getMenuItem(fileMenu.submenu, 'Open Project...');

    await openProject.click();

    expect(deps.showOpenDialog).toHaveBeenCalled();
    expect(deps.loadProject).toHaveBeenCalledWith('/repo/opened');
    expect(deps.addRecentProject).toHaveBeenCalledWith('/user/data', '/repo/opened');
    const window = deps.getAllWindows.mock.results[0].value[0];
    expect(window.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.menuProjectLoad,
      createResponse('/repo/opened'),
    );
  });
});
