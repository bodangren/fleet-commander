import { join, resolve, isAbsolute } from 'node:path'
import { parseTracksFile } from '../shared/conductor'
import type { PlanUpdateError, PlanUpdateErrorCode, PlanUpdateRequest, PlanUpdateResponse } from '../shared/plan-update'

export interface PlanUpdateFileSystem {
  readFileSync(path: string, encoding: 'utf-8'): string
  writeFileSync(path: string, contents: string, encoding: 'utf-8'): void
  existsSync(path: string): boolean
  statSync(path: string): { isDirectory(): boolean }
}

const errorMessages: Record<PlanUpdateErrorCode, string> = {
  invalid_project: 'Project path is required.',
  missing_conductor: 'Selected folder is missing conductor/.',
  missing_tracks: 'Selected folder is missing tracks.md.',
  not_found: 'plan.md was not found for the track.',
  invalid_track: 'Track link is missing or invalid.',
  write_failed: 'Failed to write plan.md.',
}

function buildError(code: PlanUpdateErrorCode): PlanUpdateError {
  return {
    code,
    message: errorMessages[code],
  }
}

function isDirectory(fs: PlanUpdateFileSystem, filePath: string): boolean {
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

export function updatePlanContents(
  fs: PlanUpdateFileSystem,
  request: PlanUpdateRequest,
): PlanUpdateResponse {
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

  try {
    fs.writeFileSync(planPath, request.planContents, 'utf-8')
  } catch {
    return { ok: false, error: buildError('write_failed') }
  }

  return { ok: true }
}
