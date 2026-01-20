export type TaskMarker = '[ ]' | '[~]' | '[x]';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type StatusSource = 'explicit' | 'inferred';

export interface TaskActivity {
  commitHash: string;
  timestamp: string;
}

export interface BoardTask {
  id: string;
  title: string;
  trackId: string;
  trackTitle: string;
  phase: string;
  status: TaskStatus;
  statusSource: StatusSource;
  needsSync: boolean;
  activity: TaskActivity | null;
}

export interface NormalizeTaskInput {
  title: string;
  trackId: string;
  trackTitle: string;
  phase: string;
  marker: TaskMarker;
  activity?: TaskActivity | null;
}

export function statusFromMarker(marker: TaskMarker): TaskStatus {
  switch (marker) {
    case '[ ]':
      return 'todo';
    case '[~]':
      return 'in_progress';
    case '[x]':
      return 'done';
    default: {
      const exhaustiveCheck: never = marker;
      return exhaustiveCheck;
    }
  }
}

export function markerFromStatus(status: TaskStatus): TaskMarker {
  switch (status) {
    case 'todo':
      return '[ ]';
    case 'in_progress':
      return '[~]';
    case 'done':
      return '[x]';
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

export function createTaskId(trackId: string, phase: string, title: string): string {
  return `${trackId}::${phase}::${title}`;
}

export function normalizeTask(input: NormalizeTaskInput): BoardTask {
  const baseStatus = statusFromMarker(input.marker);
  const hasActivity = Boolean(input.activity);
  const resolvedStatus: TaskStatus =
    baseStatus === 'todo' && hasActivity ? 'in_progress' : baseStatus;
  const statusSource: StatusSource =
    baseStatus === resolvedStatus ? 'explicit' : 'inferred';

  return {
    id: createTaskId(input.trackId, input.phase, input.title),
    title: input.title,
    trackId: input.trackId,
    trackTitle: input.trackTitle,
    phase: input.phase,
    status: resolvedStatus,
    statusSource,
    needsSync: baseStatus !== resolvedStatus,
    activity: input.activity ?? null,
  };
}
