import { join, resolve, isAbsolute } from 'node:path';
import { normalizeTask } from '../shared/board';
import { parsePlanFile, parseTracksFile } from '../shared/conductor';
import { BoardData, BoardTrack, ProjectLoadError, ProjectLoadResponse } from '../shared/board-data';

export interface FileSystemAdapter {
  readFileSync(path: string, encoding: 'utf-8'): string;
  existsSync(path: string): boolean;
  statSync(path: string): { isDirectory(): boolean };
}

const errorMessages: Record<ProjectLoadError['code'], string> = {
  missing_git: 'Selected folder is not a git repository.',
  missing_conductor: 'Selected folder does not contain a conductor/ directory.',
  missing_tracks: 'Selected folder is missing conductor/tracks.md.',
  invalid_project: 'Project path is required.',
  cancelled: 'Project selection was cancelled.',
};

function isDirectory(fs: FileSystemAdapter, filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function buildError(code: ProjectLoadError['code']): ProjectLoadError {
  return {
    code,
    message: errorMessages[code],
  };
}

export function validateProjectFolder(
  fs: FileSystemAdapter,
  projectPath: string,
): ProjectLoadError | null {
  if (!projectPath || projectPath.trim().length === 0) {
    return buildError('invalid_project');
  }

  const gitPath = join(projectPath, '.git');
  if (!isDirectory(fs, gitPath)) {
    return buildError('missing_git');
  }

  const conductorPath = join(projectPath, 'conductor');
  if (!isDirectory(fs, conductorPath)) {
    return buildError('missing_conductor');
  }

  const tracksPath = join(conductorPath, 'tracks.md');
  if (!fs.existsSync(tracksPath)) {
    return buildError('missing_tracks');
  }

  return null;
}

function normalizeTracks(tracks: BoardTrack[]): BoardTrack[] {
  return tracks.map((track, index) => ({
    ...track,
    id: track.id || `track-${index + 1}`,
  }));
}

export function loadProjectData(fs: FileSystemAdapter, projectPath: string): ProjectLoadResponse {
  const validationError = validateProjectFolder(fs, projectPath);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const conductorPath = join(projectPath, 'conductor');
  const tracksPath = join(conductorPath, 'tracks.md');
  const tracksContents = fs.readFileSync(tracksPath, 'utf-8');
  const rawTracks = parseTracksFile(tracksContents);
  const tracks = normalizeTracks(
    rawTracks.map(track => ({
      id: track.id ?? '',
      title: track.title,
      marker: track.marker,
      status: track.status,
      link: track.link,
    })),
  );

  const tasks = tracks.flatMap(track => {
    if (!track.link) {
      return [];
    }

    const normalizedLink = track.link.replace(/\\/g, '/').replace(/^\.\//, '');
    const trackPath = isAbsolute(track.link)
      ? track.link
      : normalizedLink.startsWith('conductor/')
        ? resolve(projectPath, normalizedLink)
        : resolve(conductorPath, normalizedLink);
    const planPath = join(trackPath, 'plan.md');
    if (!fs.existsSync(planPath)) {
      return [];
    }

    const planContents = fs.readFileSync(planPath, 'utf-8');
    const phases = parsePlanFile(planContents);

    return phases.flatMap(phase =>
      phase.tasks.map(task =>
        normalizeTask({
          title: task.title,
          trackId: track.id,
          trackTitle: track.title,
          phase: phase.title,
          marker: task.marker,
          activity: null,
        }),
      ),
    );
  });

  const data: BoardData = {
    projectPath,
    tracks,
    tasks,
  };

  return { ok: true, data };
}
