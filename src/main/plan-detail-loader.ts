import { join, resolve, isAbsolute } from 'node:path'
import { parseTracksFile } from '../shared/conductor'
import type {
  PlanDetailError,
  PlanDetailErrorCode,
  PlanDetailRequest,
  PlanDetailResponse,
} from '../shared/plan-detail'

export interface PlanDetailFileSystem {
  readFileSync(path: string, encoding: 'utf-8'): string
  existsSync(path: string): boolean
  statSync(path: string): { isDirectory(): boolean }
}

const errorMessages: Record<PlanDetailErrorCode, string> = {
  invalid_project: 'Project path is required.',
  missing_conductor: 'Selected folder is missing conductor/.',
  missing_tracks: 'Selected folder is missing tracks.md.',
  not_found: 'plan.md was not found for the track.',
  invalid_track: 'Track link is missing or invalid.',
}

function buildError(code: PlanDetailErrorCode): PlanDetailError {
  return {
    code,
    message: errorMessages[code],
  }
}

function isDirectory(fs: PlanDetailFileSystem, filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch {
    return false
  }
}

function resolveTrackPath(projectPath: string, conductorPath: string, link: string): string {
  const normalizedLink = link.replace(/\\/g, '/').replace(/^\.\//, '')
  if (isAbsolute(link)) {
    return link
  }
  if (normalizedLink.startsWith('conductor/')) {
    return resolve(projectPath, normalizedLink)
  }
  return resolve(conductorPath, normalizedLink)
}

export function loadPlanDetails(
  fs: PlanDetailFileSystem,
  request: PlanDetailRequest,
): PlanDetailResponse {
  if (!request.projectPath || request.projectPath.trim().length === 0) {
    return { ok: false, error: buildError('invalid_project') }
  }

  const conductorPath = join(request.projectPath, 'conductor')
  if (!isDirectory(fs, conductorPath)) {
    return { ok: false, error: buildError('missing_conductor') }
  }

  const tracksPath = join(conductorPath, 'tracks.md')
  if (!fs.existsSync(tracksPath)) {
    return { ok: false, error: buildError('missing_tracks') }
  }

  const tracksContents = fs.readFileSync(tracksPath, 'utf-8')
  const tracks = parseTracksFile(tracksContents)
  const track = tracks.find(
    entry => entry.id === request.trackId || entry.title === request.trackTitle,
  )

  if (!track) {
    return { ok: false, error: buildError('not_found') }
  }

  if (!track.link) {
    return { ok: false, error: buildError('invalid_track') }
  }

  const trackPath = resolveTrackPath(request.projectPath, conductorPath, track.link)
  if (!isDirectory(fs, trackPath)) {
    return { ok: false, error: buildError('invalid_track') }
  }

  const planPath = join(trackPath, 'plan.md')
  if (!fs.existsSync(planPath)) {
    return { ok: false, error: buildError('not_found') }
  }

  const planContents = fs.readFileSync(planPath, 'utf-8')

  return {
    ok: true,
    data: {
      trackId: track.id ?? request.trackId ?? '',
      trackTitle: track.title,
      planPath,
      planContents,
    },
  }
}
