import { describe, it, expect, vi, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { parseGitLog, parseGitNotes, readGitHistory } from './git-reader';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

const execFileSyncMock = vi.mocked(execFileSync);

afterEach(() => {
  execFileSyncMock.mockReset();
});

describe('parseGitNotes', () => {
  it('strips the Notes header and indentation', () => {
    const rawNotes = ['Notes:', '    Task: Build board', '    Files: src/main/git-reader.ts'].join(
      '\n',
    );

    const parsed = parseGitNotes(rawNotes);

    expect(parsed).toBe('Task: Build board\nFiles: src/main/git-reader.ts');
  });

  it('returns null for empty note content', () => {
    expect(parseGitNotes('')).toBeNull();
    expect(parseGitNotes('   ')).toBeNull();
  });
});

describe('parseGitLog', () => {
  it('returns an empty list for blank output', () => {
    expect(parseGitLog('')).toEqual([]);
    expect(parseGitLog('   ')).toEqual([]);
  });

  it('parses git log output with notes into commits', () => {
    const fieldSep = '\u001f';
    const recordSep = '\u001e';
    const notes = ['Notes:', '    Task: Parse tracks', '    Files: src/shared/conductor.ts'].join(
      '\n',
    );

    const output = [
      `abc1234${fieldSep}2026-01-20T10:00:00Z${fieldSep}feat: add parser${fieldSep}${notes}${recordSep}`,
      `def5678${fieldSep}2026-01-19T08:30:00Z${fieldSep}fix: tweak styles${fieldSep}${recordSep}`,
    ].join('');

    const commits = parseGitLog(output);

    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({
      hash: 'abc1234',
      timestamp: '2026-01-20T10:00:00Z',
      subject: 'feat: add parser',
      notes: 'Task: Parse tracks\nFiles: src/shared/conductor.ts',
    });
    expect(commits[1]).toMatchObject({
      hash: 'def5678',
      timestamp: '2026-01-19T08:30:00Z',
      subject: 'fix: tweak styles',
      notes: null,
    });
  });
});

describe('readGitHistory', () => {
  it('runs git log with notes and parses the output', () => {
    const fieldSep = '\u001f';
    const recordSep = '\u001e';
    const output = `abc1234${fieldSep}2026-01-20T10:00:00Z${fieldSep}feat: add parser${fieldSep}${recordSep}`;

    execFileSyncMock.mockReturnValue(output);

    const commits = readGitHistory('/repo');

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'log', '-n', '200', '--show-notes', '--pretty=format:%H%x1f%aI%x1f%s%x1f%N%x1e'],
      { encoding: 'utf8' },
    );
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      hash: 'abc1234',
      subject: 'feat: add parser',
    });
  });
});
