import { describe, expect, test } from 'bun:test';
import { parseImportedTrack } from './trackMarkdown';

describe('track markdown import', () => {
  test('parses imported markdown and extracts conflict token', () => {
    const parsed = parseImportedTrack({
      projectSlug: 'kanban-conductor',
      trackId: 'platform_pivot_bun_convex_20260401',
      specMarkdown: [
        '# Strategic Platform Pivot: Bun + Convex',
        'X-Fleet-Version: 9',
        'Status: blocked',
        '',
        'Body',
      ].join('\n'),
      planMarkdown: '- [x] Task',
    });

    expect(parsed.title).toBe('Strategic Platform Pivot: Bun + Convex');
    expect(parsed.status).toBe('blocked');
    expect(parsed.expectedVersion).toBe(9);
  });

  test('defaults to new status when header is missing', () => {
    const parsed = parseImportedTrack({
      projectSlug: 'test',
      trackId: 'test_track',
      specMarkdown: '# Test Track\n\nBody',
      planMarkdown: '- [ ] Task',
    });

    expect(parsed.status).toBe('new');
    expect(parsed.expectedVersion).toBeNull();
  });
});
