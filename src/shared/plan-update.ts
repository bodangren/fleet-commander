export type PlanUpdateErrorCode =
  | 'invalid_project'
  | 'missing_conductor'
  | 'missing_tracks'
  | 'not_found'
  | 'invalid_track'
  | 'write_failed'

export interface PlanUpdateError {
  code: PlanUpdateErrorCode
  message: string
}

export interface PlanUpdateRequest {
  projectPath: string
  trackId?: string
  trackTitle?: string
  planContents: string
}

export type PlanUpdateResponse =
  | { ok: true }
  | { ok: false; error: PlanUpdateError }
