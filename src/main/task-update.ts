import { join, resolve, isAbsolute } from 'node:path'
import { markerFromStatus } from '../shared/board'
import type { TaskUpdateRequest, TaskUpdateResponse } from '../shared/task-update'
import { parsePlanFile, parseTracksFile } from '../shared/conductor'
import { createTaskId } from '../shared/board'
import {
  updatePlanTaskMarker,
  updateTracksMarker,
  updateTrackMetadata,
  TrackMetadataStatus,
} from './conductor-writer'

export interface TaskUpdateFileSystem {
  readFileSync(path: string, encoding: 'utf-8'): string
  writeFileSync(path: string, contents: string, encoding: 'utf-8'): void
  existsSync(path: string): boolean
  statSync(path: string): { isDirectory(): boolean }
}

function isDirectory(fs: TaskUpdateFileSystem, filePath: string): boolean {
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

function mapTrackStatusToMetadata(marker: string): TrackMetadataStatus {
  if (marker === '[x]') {
    return 'completed'
  }
  if (marker === '[~]') {
    return 'in_progress'
  }
  return 'new'
}

function areAllTasksDone(planContents: string, phaseFilter?: string): boolean {
  const phases = parsePlanFile(planContents)
  const tasks = phaseFilter
    ? phases.find(phase => phase.title === phaseFilter)?.tasks ?? []
    : phases.flatMap(phase => phase.tasks)
  if (tasks.length === 0) {
    return false
  }
  return tasks.every(task => task.marker === '[x]')
}

export function updateTaskStatus(
  fs: TaskUpdateFileSystem,
  request: TaskUpdateRequest,
): TaskUpdateResponse {
  if (!request.projectPath || request.projectPath.trim().length === 0) {
    return {
      ok: false,
      error: { code: 'invalid_project', message: 'Project path is required.' },
    }
  }

  const conductorPath = join(request.projectPath, 'conductor')
  if (!isDirectory(fs, conductorPath)) {
    return {
      ok: false,
      error: { code: 'invalid_project', message: 'Selected folder is missing conductor/.' },
    }
  }

  const tracksPath = join(conductorPath, 'tracks.md')
  if (!fs.existsSync(tracksPath)) {
    return {
      ok: false,
      error: { code: 'invalid_project', message: 'Selected folder is missing tracks.md.' },
    }
  }

  const tracksContents = fs.readFileSync(tracksPath, 'utf-8')
  const tracks = parseTracksFile(tracksContents)
  const track = tracks.find(entry => entry.id === request.trackId || entry.title === request.trackTitle)
  if (!track || !track.link) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'Track could not be found.' },
    }
  }

  const trackPath = resolveTrackPath(request.projectPath, conductorPath, track.link)
  const planPath = join(trackPath, 'plan.md')
  if (!fs.existsSync(planPath)) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'plan.md was not found for the track.' },
    }
  }

  const planContents = fs.readFileSync(planPath, 'utf-8')
  const updatedPlan = updatePlanTaskMarker(planContents, {
    phaseTitle: request.phase,
    taskTitle: request.title,
    nextMarker: markerFromStatus(request.nextStatus),
  })
  fs.writeFileSync(planPath, updatedPlan, 'utf-8')

  const updatedTasksDone = areAllTasksDone(updatedPlan)
  const nextTrackMarker = updatedTasksDone ? '[x]' : track.marker
  const updatedTracks = updateTracksMarker(tracksContents, {
    trackTitle: track.title,
    nextMarker: nextTrackMarker,
  })
  fs.writeFileSync(tracksPath, updatedTracks, 'utf-8')

  const metadataPath = join(trackPath, 'metadata.json')
  if (fs.existsSync(metadataPath)) {
    const metadataContents = fs.readFileSync(metadataPath, 'utf-8')
    const nextMetadataStatus = mapTrackStatusToMetadata(nextTrackMarker)
    const updatedMetadata = updateTrackMetadata(metadataContents, {
      status: nextMetadataStatus,
      updatedAt: new Date().toISOString(),
    })
    fs.writeFileSync(metadataPath, updatedMetadata, 'utf-8')
  }

  return { ok: true, updatedTaskId: createTaskId(track.id ?? request.trackId, request.phase, request.title) }
}
