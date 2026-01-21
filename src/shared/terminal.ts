export type TerminalErrorCode =
  | 'invalid_project'
  | 'invalid_session'
  | 'session_not_found'
  | 'invalid_payload'
  | 'spawn_failed'

export interface TerminalCreateRequest {
  projectPath: string
  cols?: number
  rows?: number
}

export type TerminalCreateResponse =
  | { ok: true; data: { sessionId: string } }
  | { ok: false; error: { code: TerminalErrorCode; message: string } }

export interface TerminalWriteRequest {
  sessionId: string
  data: string
}

export type TerminalWriteResponse =
  | { ok: true }
  | { ok: false; error: { code: TerminalErrorCode; message: string } }

export interface TerminalCloseRequest {
  sessionId: string
}

export type TerminalCloseResponse =
  | { ok: true }
  | { ok: false; error: { code: TerminalErrorCode; message: string } }

export interface TerminalDataEvent {
  sessionId: string
  data: string
}
