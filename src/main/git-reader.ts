import { execFileSync } from 'node:child_process';

export interface GitCommit {
  hash: string;
  timestamp: string;
  subject: string;
  notes: string | null;
}

const FIELD_SEPARATOR = '\u001f';
const RECORD_SEPARATOR = '\u001e';

export function parseGitNotes(rawNotes: string): string | null {
  if (!rawNotes || rawNotes.trim().length === 0) {
    return null;
  }

  const lines = rawNotes.split(/\r?\n/);
  const startIndex = lines[0].trim().toLowerCase().startsWith('notes') ? 1 : 0;
  const cleaned = lines
    .slice(startIndex)
    .map(line => line.replace(/^(\t| {4})/, ''))
    .join('\n')
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

export function parseGitLog(output: string): GitCommit[] {
  if (!output || output.trim().length === 0) {
    return [];
  }

  return output
    .split(RECORD_SEPARATOR)
    .filter(record => record.trim().length > 0)
    .map(record => {
      const [hash, timestamp, subject, notesRaw] = record.split(FIELD_SEPARATOR);
      return {
        hash: hash ?? '',
        timestamp: timestamp ?? '',
        subject: subject ?? '',
        notes: parseGitNotes(notesRaw ?? ''),
      };
    })
    .filter(commit => commit.hash.length > 0);
}

export interface GitHistoryOptions {
  limit?: number;
}

export function readGitHistory(projectPath: string, options: GitHistoryOptions = {}): GitCommit[] {
  const limit = options.limit ?? 200;
  const format = `%H%x1f%aI%x1f%s%x1f%N%x1e`;

  const output = execFileSync(
    'git',
    ['-C', projectPath, 'log', `-n`, `${limit}`, '--show-notes', `--pretty=format:${format}`],
    { encoding: 'utf8' },
  );

  return parseGitLog(output);
}
