import { BoardTask, TaskMarker, TaskStatus } from './board';

export interface BoardTrack {
  id: string;
  title: string;
  marker: TaskMarker;
  status: TaskStatus;
  link: string | null;
}

export interface BoardData {
  projectPath: string;
  tracks: BoardTrack[];
  tasks: BoardTask[];
}

export type ProjectLoadErrorCode =
  | 'missing_git'
  | 'missing_conductor'
  | 'missing_tracks'
  | 'invalid_project'
  | 'cancelled';

export interface ProjectLoadError {
  code: ProjectLoadErrorCode;
  message: string;
}

export type ProjectLoadResponse =
  | { ok: true; data: BoardData }
  | { ok: false; error: ProjectLoadError };
