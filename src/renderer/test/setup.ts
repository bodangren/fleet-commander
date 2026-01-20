import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import type { ProjectApi } from '../../shared/ipc'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

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
}

window.projectApi = projectApi
