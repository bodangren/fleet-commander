import { describe, expect, it } from 'bun:test';
import { issueDiffer, IssueData } from './issue';
import { computeMarkdownHash } from '../hash';

describe('issueDiffer', () => {
  it('detects added issue', () => {
    const conductorMd = `---
title: New Issue
status: open
---

# New Issue

Body content`;

    const result = issueDiffer('project-x', conductorMd, null);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('added');
    expect(result!.artifactId).toBe('New Issue');
  });

  it('detects modified issue when hash differs', () => {
    const conductorMd = `---
title: My Issue
status: resolved
---

# My Issue

Body content`;

    const canonical: IssueData = {
      issueId: 'My Issue',
      title: 'My Issue',
      status: 'open',
      body: 'Body content',
      lastKnownHash: 'different-hash',
    };

    const result = issueDiffer('project-x', conductorMd, canonical);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('modified');
  });

  it('returns null when conductor hash matches canonical hash', () => {
    const md = `---
title: My Issue
status: open
---

# My Issue

Same body`;
    const hash = computeMarkdownHash(md);

    const canonical: IssueData = {
      issueId: 'My Issue',
      title: 'My Issue',
      status: 'open',
      body: 'Same body',
      lastKnownHash: hash,
    };

    const result = issueDiffer('project-x', md, canonical);
    expect(result).toBeNull();
  });

  it('handles issue without frontmatter', () => {
    const conductorMd = `# My Issue

Body content`;

    const result = issueDiffer('project-x', conductorMd, null);
    expect(result).not.toBeNull();
    expect(result!.divergenceType).toBe('added');
    expect(result!.artifactId).toBe('My Issue');
  });
});