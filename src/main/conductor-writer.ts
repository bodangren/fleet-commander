import type { TaskMarker } from '../shared/board';

export type TrackMetadataStatus = 'new' | 'in_progress' | 'completed';

interface UpdatePlanTaskMarkerInput {
  phaseTitle: string;
  taskTitle: string;
  nextMarker: TaskMarker;
}

interface UpdateTrackMarkerInput {
  trackTitle: string;
  nextMarker: TaskMarker;
}

interface UpdateTrackMetadataInput {
  status: TrackMetadataStatus;
  updatedAt: string;
}

const PHASE_RE = /^##\s+(?<title>.+?)\s*$/;
const TRACK_BULLET_RE = /^-\s*\[[ xX~]\]\s*\*\*Track:\s*(?<title>.+?)\*\*\s*$/;
const TRACK_HEADING_RE = /^##\s*\[[ xX~]\]\s*Track:\s*(?<title>.+?)\s*$/;

function normalizePhaseTitle(title: string): string {
  return title.replace(/\s*\[checkpoint:[^\]]+\]\s*$/i, '').trim();
}

function replaceMarker(line: string, nextMarker: TaskMarker, pattern: RegExp): string {
  return line.replace(pattern, `$1${nextMarker}`);
}

export function updatePlanTaskMarker(contents: string, input: UpdatePlanTaskMarkerInput): string {
  const lines = contents.split(/\r?\n/);
  const targetPhase = normalizePhaseTitle(input.phaseTitle);
  const taskLabel = `Task: ${input.taskTitle}`;
  let currentPhase = '';

  const updated = lines.map(line => {
    const phaseMatch = line.match(PHASE_RE);
    if (phaseMatch?.groups?.title) {
      currentPhase = normalizePhaseTitle(phaseMatch.groups.title);
      return line;
    }

    if (currentPhase === targetPhase && line.includes(taskLabel)) {
      return replaceMarker(line, input.nextMarker, /^(\-\s*)\[[ xX~]\]/);
    }

    return line;
  });

  return updated.join('\n');
}

export function updateTracksMarker(contents: string, input: UpdateTrackMarkerInput): string {
  const lines = contents.split(/\r?\n/);

  const updated = lines.map(line => {
    const bulletMatch = line.match(TRACK_BULLET_RE);
    if (bulletMatch?.groups?.title?.trim() === input.trackTitle) {
      return replaceMarker(line, input.nextMarker, /^(\-\s*)\[[ xX~]\]/);
    }

    const headingMatch = line.match(TRACK_HEADING_RE);
    if (headingMatch?.groups?.title?.trim() === input.trackTitle) {
      return replaceMarker(line, input.nextMarker, /^(##\s*)\[[ xX~]\]/);
    }

    return line;
  });

  return updated.join('\n');
}

export function updateTrackMetadata(
  contents: string,
  input: UpdateTrackMetadataInput,
): string {
  const parsed = JSON.parse(contents) as Record<string, unknown>;
  parsed.status = input.status;
  parsed.updated_at = input.updatedAt;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}
