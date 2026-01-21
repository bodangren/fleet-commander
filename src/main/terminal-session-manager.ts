import { randomUUID } from 'node:crypto'
import type {
  TerminalCloseRequest,
  TerminalCloseResponse,
  TerminalCreateRequest,
  TerminalCreateResponse,
  TerminalWriteRequest,
  TerminalWriteResponse,
} from '../shared/terminal'
import type { SpawnPtyOptions, TerminalPty } from './terminal-pty'

export interface TerminalSessionRecord {
  id: string
  cwd: string
  createdAt: number
  pty: TerminalPty
}

export interface TerminalSessionManager {
  createSession: (request: TerminalCreateRequest) => TerminalCreateResponse
  writeToSession: (request: TerminalWriteRequest) => TerminalWriteResponse
  closeSession: (request: TerminalCloseRequest) => TerminalCloseResponse
  getSession: (sessionId: string) => TerminalSessionRecord | null
}

export interface TerminalSessionManagerDependencies {
  spawnPty: (options: SpawnPtyOptions) => TerminalPty
  createId?: () => string
  now?: () => number
}

const invalidProjectResponse: TerminalCreateResponse = {
  ok: false,
  error: {
    code: 'invalid_project',
    message: 'Project path is required.',
  },
}

const invalidSessionResponse: TerminalWriteResponse | TerminalCloseResponse = {
  ok: false,
  error: {
    code: 'invalid_session',
    message: 'Session id is required.',
  },
}

const sessionNotFoundResponse: TerminalWriteResponse | TerminalCloseResponse = {
  ok: false,
  error: {
    code: 'session_not_found',
    message: 'Terminal session was not found.',
  },
}

export function createTerminalSessionManager(
  deps: TerminalSessionManagerDependencies,
): TerminalSessionManager {
  const createId = deps.createId ?? (() => randomUUID())
  const now = deps.now ?? (() => Date.now())
  const sessions = new Map<string, TerminalSessionRecord>()

  const getSession = (sessionId: string) => {
    return sessions.get(sessionId) ?? null
  }

  const createSession = (request: TerminalCreateRequest): TerminalCreateResponse => {
    const projectPath = request?.projectPath?.trim()
    if (!projectPath) {
      return invalidProjectResponse
    }

    try {
      const sessionId = createId()
      const pty = deps.spawnPty({
        cwd: projectPath,
        cols: request.cols,
        rows: request.rows,
      })

      sessions.set(sessionId, {
        id: sessionId,
        cwd: projectPath,
        createdAt: now(),
        pty,
      })

      return {
        ok: true,
        data: { sessionId },
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'spawn_failed',
          message: error instanceof Error ? error.message : 'Failed to spawn terminal session.',
        },
      }
    }
  }

  const writeToSession = (request: TerminalWriteRequest): TerminalWriteResponse => {
    const sessionId = request?.sessionId?.trim()
    if (!sessionId) {
      return invalidSessionResponse
    }

    const session = sessions.get(sessionId)
    if (!session) {
      return sessionNotFoundResponse
    }

    session.pty.write(request.data ?? '')
    return { ok: true }
  }

  const closeSession = (request: TerminalCloseRequest): TerminalCloseResponse => {
    const sessionId = request?.sessionId?.trim()
    if (!sessionId) {
      return invalidSessionResponse
    }

    const session = sessions.get(sessionId)
    if (!session) {
      return sessionNotFoundResponse
    }

    session.pty.kill()
    sessions.delete(sessionId)
    return { ok: true }
  }

  return {
    createSession,
    writeToSession,
    closeSession,
    getSession,
  }
}
