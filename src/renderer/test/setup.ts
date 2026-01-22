import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import type { ProjectApi, SettingsApi } from '../../shared/ipc'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

vi.mock('xterm', () => {
  class TerminalMock {
    open = vi.fn()
    write = vi.fn()
    onData = vi.fn()
    loadAddon = vi.fn()
    dispose = vi.fn()
  }
  return { Terminal: TerminalMock }
})

vi.mock('xterm-addon-fit', () => {
  class FitAddonMock {
    fit = vi.fn()
  }
  return { FitAddon: FitAddonMock }
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.ipcRenderer for all renderer tests
global.window = global.window || ({} as Window & typeof globalThis)
window.ipcRenderer = {
  on: () => {},
  off: () => {},
  send: () => {},
  invoke: () => Promise.resolve({}),
} as unknown as Electron.IpcRenderer

const projectApi: ProjectApi = {
  selectProject: () =>
    Promise.resolve({
      ok: false,
      error: { code: 'cancelled', message: 'Mocked project selection.' },
    }),
  loadProject: () =>
    Promise.resolve({
      ok: false,
      error: { code: 'invalid_project', message: 'Mocked project load.' },
    }),
  refreshBoard: () =>
    Promise.resolve({
      ok: false,
      error: { code: 'invalid_project', message: 'Mocked project refresh.' },
    }),
  getLastProjectPath: () => Promise.resolve(null),
  updateTaskStatus: () =>
    Promise.resolve({
      ok: false,
      error: { code: 'invalid_project', message: 'Mocked task update.' },
    }),
}

window.projectApi = projectApi

const settingsApi: SettingsApi = {
  getAgentTemplates: () => Promise.resolve({ ok: true, templates: [] }),
  setAgentTemplates: () => Promise.resolve({ ok: true }),
}

window.settingsApi = settingsApi

window.terminalApi = {
  createSession: () => Promise.resolve({ ok: true, data: { sessionId: 'session-1' } }),
  writeToSession: () => Promise.resolve({ ok: true }),
  closeSession: () => Promise.resolve({ ok: true }),
  onSessionData: () => {},
  offSessionData: () => {},
}

window.logApi = {
  emitLogEntry: () => {},
  onLogEntry: () => {},
  offLogEntry: () => {},
}
