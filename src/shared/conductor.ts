import { statusFromMarker, TaskMarker, TaskStatus } from './board';

export interface ConductorTrack {
  id: string | null;
  title: string;
  marker: TaskMarker;
  status: TaskStatus;
  link: string | null;
}

export interface ConductorSubTask {
  title: string;
  marker: TaskMarker;
  status: TaskStatus;
}

export interface ConductorTask {
  title: string;
  marker: TaskMarker;
  status: TaskStatus;
  phase: string;
  agent?: string;
  subTasks?: ConductorSubTask[];
}

export interface ConductorPhase {
  title: string;
  tasks: ConductorTask[];
}

const BULLET_TRACK_RE = /^-\s*\[(?<marker>[ xX~])\]\s*\*\*Track:\s*(?<title>.+?)\*\*\s*$/;
const HEADING_TRACK_RE = /^##\s*\[(?<marker>[ xX~])\]\s*Track:\s*(?<title>.+?)\s*$/;
const LINK_RE = /^\*Link:\s*\[(?<label>[^\]]+)\]\((?<href>[^)]+)\)\*\s*$/;
const PHASE_RE = /^##\s+(?<title>.+?)\s*$/;
const TASK_RE = /^-\s*\[(?<marker>[ xX~])\]\s*Task:\s*(?<title>.+?)\s*$/;
const SUBTASK_RE = /^-\s*\[(?<marker>[ xX~])\]\s*(?<title>.+?)\s*$/;
const AGENT_RE = /@(?<agent>[\w-]+)$/;

function markerFromChar(char: string): TaskMarker | null {
  const normalized = char.trim().toLowerCase();
  if (normalized === '') {
    return '[ ]';
  }
  switch (normalized) {
    case 'x':
      return '[x]';
    case '~':
      return '[~]';
    default:
      return null;
  }
}

function extractTrackId(link: string | null): string | null {
  if (!link) {
    return null;
  }
  const sanitized = link.replace(/\\/g, '/');
  const trimmed = sanitized.replace(/\/+$/, '');
  const parts = trimmed.split('/');
  const last = parts[parts.length - 1];
  return last ? last : null;
}

function normalizePhaseTitle(title: string): string {
  return title.replace(/\s*\[checkpoint:[^\]]+\]\s*$/i, '').trim();
}

export function parseTracksFile(contents: string): ConductorTrack[] {
  const lines = contents.split(/\r?\n/);
  const tracks: ConductorTrack[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const match = line.match(BULLET_TRACK_RE) ?? line.match(HEADING_TRACK_RE);
    if (!match || !match.groups) {
      continue;
    }

    const marker = markerFromChar(match.groups.marker);
    if (!marker) {
      continue;
    }

    const title = match.groups.title.trim();
    let link: string | null = null;
    let nextIndex = i + 1;

    while (nextIndex < lines.length) {
      const candidate = lines[nextIndex].trim();
      if (candidate.length === 0) {
        nextIndex += 1;
        continue;
      }

      const linkMatch = candidate.match(LINK_RE);
      if (linkMatch && linkMatch.groups?.href) {
        link = linkMatch.groups.href.trim();
        i = nextIndex;
      }
      break;
    }

    tracks.push({
      id: extractTrackId(link),
      title,
      marker,
      status: statusFromMarker(marker),
      link,
    });
  }

  return tracks;
}

export function parsePlanFile(contents: string): ConductorPhase[] {
  const lines = contents.split(/\r?\n/);
  const phases: ConductorPhase[] = [];
  let currentPhase: ConductorPhase | null = null;
  let currentTask: ConductorTask | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const phaseMatch = line.match(PHASE_RE);
    if (phaseMatch && phaseMatch.groups?.title) {
      const title = normalizePhaseTitle(phaseMatch.groups.title);
      currentPhase = { title, tasks: [] };
      phases.push(currentPhase);
      currentTask = null;
      continue;
    }

    const taskMatch = line.match(TASK_RE);
    if (taskMatch && taskMatch.groups && currentPhase) {
      const marker = markerFromChar(taskMatch.groups.marker);
      if (marker) {
        const title = taskMatch.groups.title.trim();
        const agentMatch = title.match(AGENT_RE);
        const agent = agentMatch?.groups?.agent;

        currentTask = {
          title,
          marker,
          status: statusFromMarker(marker),
          phase: currentPhase.title,
          subTasks: [],
          ...(agent ? { agent } : {}),
        };
        currentPhase.tasks.push(currentTask);
        continue;
      }
    }

    const subTaskMatch = line.match(SUBTASK_RE);
    if (subTaskMatch && subTaskMatch.groups && currentTask) {
      const indent = rawLine.length - rawLine.trimStart().length;
      if (indent > 0) {
        const marker = markerFromChar(subTaskMatch.groups.marker);
        if (marker) {
          const title = subTaskMatch.groups.title.trim();
          currentTask.subTasks!.push({
            title,
            marker,
            status: statusFromMarker(marker),
          });
        }
      }
    }
  }

  return phases;
}
