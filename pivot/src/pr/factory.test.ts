import { describe, expect, test } from 'bun:test';
import { generatePRDescription } from './factory';

describe('generatePRDescription', () => {
  test('generates description with all fields', () => {
    const desc = generatePRDescription({
      taskId: 'task-42',
      taskTitle: 'Add user auth',
      trackId: 'auth_track_20260501',
      specSummary: 'Implement JWT-based authentication',
      acceptanceCriteria: ['Users can log in', 'Tokens expire after 1h'],
      agentSummary: 'Added login endpoint and JWT middleware',
      commitHash: 'abc1234567890',
    });

    expect(desc).toContain('## Add user auth');
    expect(desc).toContain('**Track:** auth_track_20260501');
    expect(desc).toContain('**Task:** task-42');
    expect(desc).toContain('## Summary');
    expect(desc).toContain('JWT-based authentication');
    expect(desc).toContain('## Agent Output');
    expect(desc).toContain('login endpoint');
    expect(desc).toContain('- [ ] Users can log in');
    expect(desc).toContain('- [ ] Tokens expire after 1h');
    expect(desc).toContain('`abc12345`');
  });

  test('generates minimal description', () => {
    const desc = generatePRDescription({
      taskId: 'task-1',
      taskTitle: 'Fix bug',
    });

    expect(desc).toContain('## Fix bug');
    expect(desc).toContain('**Task:** task-1');
    expect(desc).not.toContain('## Summary');
    expect(desc).not.toContain('## Agent Output');
    expect(desc).not.toContain('## Acceptance Criteria');
  });

  test('includes track ID when provided', () => {
    const withTrack = generatePRDescription({
      taskId: 't1',
      taskTitle: 'Test',
      trackId: 'track-1',
    });
    expect(withTrack).toContain('**Track:** track-1');

    const withoutTrack = generatePRDescription({
      taskId: 't1',
      taskTitle: 'Test',
    });
    expect(withoutTrack).not.toContain('**Track:**');
  });
});
