import { describe, expect, it, mock } from 'bun:test';
import { parseIssues, createBlockerIssue, createDelegationIssues } from './issues';

describe('parseIssues', () => {
  it('returns empty array for normal output', () => {
    expect(parseIssues('normal output')).toEqual([]);
  });

  it('parses a single issue block', () => {
    const output = `Some output\n\`\`\`issue\n{"title":"Missing API","description":"The endpoint is not implemented","severity":"high"}\n\`\`\`\nMore output`;
    const issues = parseIssues(output);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe('Missing API');
    expect(issues[0].severity).toBe('high');
  });

  it('skips blocks with missing required fields', () => {
    const output = `\`\`\`issue\n{"title":"No desc"}\n\`\`\`\n\`\`\`issue\n{"description":"No title"}\n\`\`\``;
    expect(parseIssues(output)).toHaveLength(0);
  });

  it('skips malformed JSON', () => {
    const output = `\`\`\`issue\nnot json at all\n\`\`\``;
    expect(parseIssues(output)).toHaveLength(0);
  });
});

describe('createBlockerIssue', () => {
  it('creates a blocker issue', async () => {
    const mockClient = {
      mutation: mock(async () => {}),
    };

    await createBlockerIssue(
      mockClient as any,
      'test-project',
      'task-1',
      'Test Task',
      'something failed',
      'exit_code',
      1,
      1000,
      3,
    );

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const call = (mockClient.mutation as any).mock.calls[0];
    expect(call[1].title).toContain('task-1');
    expect(call[1].body).toContain('something failed');
  });
});

describe('createDelegationIssues', () => {
  it('creates delegation issues from output', async () => {
    const mockClient = {
      mutation: mock(async () => {}),
    };

    const output = `\`\`\`issue\n{"title":"Issue 1","description":"Desc 1"}\n\`\`\`\n\`\`\`issue\n{"title":"Issue 2","description":"Desc 2"}\n\`\`\``;
    const count = await createDelegationIssues(mockClient as any, 'test-project', 'task-1', output);

    expect(count).toBe(2);
    expect(mockClient.mutation).toHaveBeenCalledTimes(2);
  });

  it('returns 0 when no issues found', async () => {
    const mockClient = {
      mutation: mock(async () => {}),
    };

    const count = await createDelegationIssues(mockClient as any, 'test-project', 'task-1', 'no issues');
    expect(count).toBe(0);
    expect(mockClient.mutation).toHaveBeenCalledTimes(0);
  });
});
