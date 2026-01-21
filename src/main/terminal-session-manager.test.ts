import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTerminalSessionManager } from './terminal-session-manager'
import type { SpawnPtyOptions, TerminalPty } from './terminal-pty'

const createFakePty = (): TerminalPty => {
  return {
    onData: vi.fn(),
    write: vi.fn(),
    kill: vi.fn(),
  }
}

describe('terminal session manager', () => {
  const spawnPty = vi.fn<(options: SpawnPtyOptions) => TerminalPty>()
  const createId = vi.fn<() => string>()
  const now = vi.fn<() => number>()

  beforeEach(() => {
    spawnPty.mockReset()
    createId.mockReset()
    now.mockReset()
  })

  it('returns a validation error when project path is empty', () => {
    const manager = createTerminalSessionManager({ spawnPty, createId, now })

    const response = manager.createSession({ projectPath: '   ' })

    expect(response.ok).toBe(false)
  })

  it('spawns a session rooted at the project path', () => {
    const fakePty = createFakePty()
    spawnPty.mockReturnValue(fakePty)
    createId.mockReturnValue('session-1')
    now.mockReturnValue(1234)

    const manager = createTerminalSessionManager({ spawnPty, createId, now })

    const response = manager.createSession({ projectPath: '/repo', cols: 120, rows: 40 })

    expect(spawnPty).toHaveBeenCalledWith({ cwd: '/repo', cols: 120, rows: 40 })
    expect(response.ok).toBe(true)
    if (response.ok) {
      expect(response.data.sessionId).toBe('session-1')
    }

    const session = manager.getSession('session-1')
    expect(session?.cwd).toBe('/repo')
  })

  it('routes command input to the matching session', () => {
    const ptyOne = createFakePty()
    const ptyTwo = createFakePty()
    spawnPty.mockReturnValueOnce(ptyOne).mockReturnValueOnce(ptyTwo)
    createId.mockReturnValueOnce('session-1').mockReturnValueOnce('session-2')

    const manager = createTerminalSessionManager({ spawnPty, createId, now })
    manager.createSession({ projectPath: '/repo' })
    manager.createSession({ projectPath: '/repo' })

    const response = manager.writeToSession({ sessionId: 'session-2', data: 'ls\n' })

    expect(response.ok).toBe(true)
    expect(ptyTwo.write).toHaveBeenCalledWith('ls\n')
    expect(ptyOne.write).not.toHaveBeenCalled()
  })

  it('closes sessions and prevents further writes', () => {
    const fakePty = createFakePty()
    spawnPty.mockReturnValue(fakePty)
    createId.mockReturnValue('session-1')

    const manager = createTerminalSessionManager({ spawnPty, createId, now })
    manager.createSession({ projectPath: '/repo' })

    const closeResponse = manager.closeSession({ sessionId: 'session-1' })
    expect(closeResponse.ok).toBe(true)
    expect(fakePty.kill).toHaveBeenCalled()
    expect(manager.getSession('session-1')).toBeNull()

    const writeResponse = manager.writeToSession({ sessionId: 'session-1', data: 'pwd\n' })
    expect(writeResponse.ok).toBe(false)
  })
})
