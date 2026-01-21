import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IPC_CHANNELS } from '../shared/ipc';

const exposeInMainWorld = vi.fn();
const on = vi.fn();
const off = vi.fn();
const send = vi.fn();
const invoke = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    on,
    off,
    send,
    invoke,
  },
}));

describe('preload projectApi', () => {
  beforeEach(() => {
    exposeInMainWorld.mockClear();
    on.mockClear();
    off.mockClear();
    send.mockClear();
    invoke.mockClear();
    vi.resetModules();
  });

  it('exposes getPlanDetails via ipcRenderer', async () => {
    await import('./index');

    const ipcRendererCall = exposeInMainWorld.mock.calls.find(call => call[0] === 'ipcRenderer');
    expect(ipcRendererCall).toBeDefined();

    const ipcRendererApi = ipcRendererCall?.[1] as {
      on: (channel: string, listener: (...args: unknown[]) => void) => unknown;
      off: (channel: string, listener: (...args: unknown[]) => void) => unknown;
      send: (channel: string, ...args: unknown[]) => unknown;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };

    const listener = vi.fn();
    ipcRendererApi.on('channel:test', listener);
    ipcRendererApi.off('channel:test', listener);
    ipcRendererApi.send('channel:test', { value: 1 });
    await ipcRendererApi.invoke('channel:test', { value: 2 });

    expect(on).toHaveBeenCalledWith('channel:test', expect.any(Function));
    expect(off).toHaveBeenCalledWith('channel:test', listener);
    expect(send).toHaveBeenCalledWith('channel:test', { value: 1 });
    expect(invoke).toHaveBeenCalledWith('channel:test', { value: 2 });

    const projectApiCall = exposeInMainWorld.mock.calls.find(call => call[0] === 'projectApi');
    expect(projectApiCall).toBeDefined();

    const projectApi = projectApiCall?.[1] as { getPlanDetails: (payload: unknown) => Promise<unknown> };
    expect(typeof projectApi.getPlanDetails).toBe('function');

    await projectApi.getPlanDetails({ projectPath: '/repo' });

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.getPlanDetails, { projectPath: '/repo' });

    const terminalApiCall = exposeInMainWorld.mock.calls.find(call => call[0] === 'terminalApi');
    expect(terminalApiCall).toBeDefined();

    const terminalApi = terminalApiCall?.[1] as {
      createSession: (payload: unknown) => Promise<unknown>;
    };

    await terminalApi.createSession({ projectPath: '/repo', cols: 80, rows: 24 });

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.terminalCreate, {
      projectPath: '/repo',
      cols: 80,
      rows: 24,
    });
  });
});
