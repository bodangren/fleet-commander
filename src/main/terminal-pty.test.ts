import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawnPty } from './terminal-pty'

const spawn = vi.hoisted(() => vi.fn())

describe('terminal pty adapter', () => {
  beforeEach(() => {
    spawn.mockReset()
    ;(globalThis as { __nodePty?: { spawn: typeof spawn } }).__nodePty = { spawn }
  })

  afterEach(() => {
    ;(globalThis as { __nodePty?: { spawn: typeof spawn } }).__nodePty = undefined
  })

  it('spawns a pty with the provided options', () => {
    const fakePty = { onData: vi.fn(), write: vi.fn(), kill: vi.fn() }
    spawn.mockReturnValue(fakePty)

    const result = spawnPty({ cwd: '/repo', cols: 120, rows: 40 })

    expect(result).toBe(fakePty)
    expect(spawn).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({
        name: 'xterm-color',
        cwd: '/repo',
        cols: 120,
        rows: 40,
        env: process.env,
      }),
    )
  })
})
