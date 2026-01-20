import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => {
  const app = {
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
    whenReady: vi.fn(() => new Promise(() => {})),
    on: vi.fn(),
    disableHardwareAcceleration: vi.fn(),
    setAppLogsPath: vi.fn(),
    getPath: vi.fn(() => '/user/data'),
    getVersion: vi.fn(() => '0.0.0'),
  };

  class BrowserWindow {
    static getAllWindows = vi.fn(() => []);
    isMinimized() {
      return false;
    }
    restore() {}
    focus() {}
  }

  return {
    app,
    BrowserWindow,
    shell: { openExternal: vi.fn() },
    ipcMain: { handle: vi.fn() },
  };
});

vi.mock('node:os', () => ({
  release: () => '0.0.0',
}));

vi.mock('./db', () => ({
  initDatabase: vi.fn(),
  getDatabase: vi.fn(() => ({
    prepare: () => ({
      all: () => [],
    }),
  })),
}));

vi.mock('./project-ipc', () => ({
  registerProjectIpcHandlers: vi.fn(),
}));

describe('main entry', () => {
  it('registers project IPC handlers on startup', async () => {
    const { registerProjectIpcHandlers } = await import('./project-ipc');

    await import('./index');

    expect(registerProjectIpcHandlers).toHaveBeenCalledTimes(1);
  });
});
