import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

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
} as any
