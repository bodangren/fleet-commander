import { statusFromMarker, TaskMarker, TaskStatus } from './board';

export interface ConductorTrack {
  id: string | null;
  title: string;
  marker: TaskMarker;
  status: TaskStatus;
  link: string | null;
}

const BULLET_TRACK_RE = /^-\s*\[(?<marker>[ xX~])\]\s*\*\*Track:\s*(?<title>.+?)\*\*\s*$/;
const HEADING_TRACK_RE = /^##\s*\[(?<marker>[ xX~])\]\s*Track:\s*(?<title>.+?)\s*$/;
const LINK_RE = /^\*Link:\s*\[(?<label>[^\]]+)\]\((?<href>[^)]+)\)\*\s*$/;

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
