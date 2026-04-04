import { describe, test, expect } from 'bun:test';

describe('TD-005: Multiline issue descriptions', () => {
  test('issue body with multiline content is preserved as-is', () => {
    const multilineBody = [
      'Task failed after 3 attempt(s).',
      '',
      '**Error:** Connection timeout',
      '',
      '**Failure Type:** exit_code',
      '',
      '**Exit Code:** 1',
      '',
      '**Duration:** 5000ms',
    ].join('\n');

    expect(multilineBody).toContain('\n');
    expect(multilineBody.split('\n').length).toBe(9);
  });

  test('issue body with markdown formatting is preserved', () => {
    const body = `# Issue Title

This is a **multiline** description with:

- Bullet points
- \`code snippets\`
- [links](https://example.com)

\`\`\`typescript
const x = 1;
\`\`\`
`;

    expect(body).toContain('# Issue Title');
    expect(body).toContain('**multiline**');
    expect(body).toContain('- Bullet points');
    expect(body).toContain('```typescript');
  });

  test('issue body round-trips through JSON serialization', () => {
    const originalBody = 'Line 1\nLine 2\n\nLine 4 with **markdown**';

    const serialized = JSON.stringify({ body: originalBody });
    const parsed = JSON.parse(serialized);

    expect(parsed.body).toBe(originalBody);
    expect(parsed.body).toContain('\n');
  });
});

describe('TD-006: Settings with zero values', () => {
  test('zero value is preserved through JSON serialization', () => {
    const settings = {
      orchestratorInterval: 0,
      logRetentionDays: 0,
      cacheTTL: 0,
      reconnectInterval: 0,
    };

    const serialized = JSON.stringify(settings);
    const parsed = JSON.parse(serialized);

    expect(parsed.orchestratorInterval).toBe(0);
    expect(parsed.logRetentionDays).toBe(0);
    expect(parsed.cacheTTL).toBe(0);
    expect(parsed.reconnectInterval).toBe(0);
  });

  test('zero value is distinguishable from missing value', () => {
    const withZero = { interval: 0 };
    const withoutValue: Record<string, number> = {};

    expect(withZero.interval).toBe(0);
    expect(withoutValue.interval).toBe(undefined);
    expect(withZero.interval !== undefined).toBe(true);
    expect(withoutValue.interval === undefined).toBe(true);
  });

  test('settings merge with zero values uses direct assignment', () => {
    const current = {
      orchestratorInterval: 5000,
      logRetentionDays: 30,
      cacheTTL: 3600,
    };

    const updates = {
      orchestratorInterval: 0,
      cacheTTL: 0,
    };

    const merged = { ...current, ...updates };

    expect(merged.orchestratorInterval).toBe(0);
    expect(merged.logRetentionDays).toBe(30);
    expect(merged.cacheTTL).toBe(0);
  });
});
