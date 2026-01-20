import type { TaskStatus } from './board'

export interface TaskUpdateRequest {
  projectPath: string
  trackId: string
  trackTitle: string
  phase: string
  title: string
  nextStatus: TaskStatus
}

export interface TaskUpdateError {
  code: 'invalid_project' | 'not_found' | 'write_failed'
  message: string
}

export type TaskUpdateResponse =
  | { ok: true; updatedTaskId: string }
  | { ok: false; error: TaskUpdateError }
