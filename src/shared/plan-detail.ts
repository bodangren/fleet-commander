export type PlanDetailErrorCode =
  | 'invalid_project'
  | 'missing_conductor'
  | 'missing_tracks'
  | 'not_found'
  | 'invalid_track'

export interface PlanDetailError {
  code: PlanDetailErrorCode
  message: string
}

export interface PlanDetailData {
  trackId: string
  trackTitle: string
  planPath: string
  planContents: string
}

export type PlanDetailResponse =
  | { ok: true; data: PlanDetailData }
  | { ok: false; error: PlanDetailError }

export interface PlanDetailRequest {
  projectPath: string
  trackId?: string
  trackTitle?: string
}
