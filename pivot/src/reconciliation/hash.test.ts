import { describe, expect, it } from 'bun:test';
import { normalizeMarkdown } from './hash';

describe('normalizeMarkdown', () => {
  it('removes yaml frontmatter', () => {
    const md = `---
title: Test
---

# Heading
`;
    const result = normalizeMarkdown(md);
    expect(result).not.toContain('---');
    expect(result).toContain('# Heading');
  });

  it('normalizes line endings', () => {
    const md = 'Line 1\r\nLine 2\r\nLine 3';
    const result = normalizeMarkdown(md);
    expect(result).not.toContain('\r');
  });

  it('collapses multiple blank lines', () => {
    const md = `# Heading\n\n\n\nBody`;
    const result = normalizeMarkdown(md);
    expect(result).not.toMatch(/\n{3,}/);
  });

  it('trims trailing whitespace on lines', () => {
    const md = `# Heading   \nBody   \n`;
    const result = normalizeMarkdown(md);
    expect(result).not.toMatch(/  \n/);
  });

  it('removes unicode whitespace characters', () => {
    const md = `# Heading\u200bBody`;
    const result = normalizeMarkdown(md);
    expect(result).not.toContain('\u200b');
  });

  it('normalizes list markers to hyphen', () => {
    const md = `* Item 1\n* Item 2`;
    const result = normalizeMarkdown(md);
    expect(result).toContain('- Item 1');
  });

  it('collapses inline code backticks', () => {
    const md = '`  code  `';
    const result = normalizeMarkdown(md);
    expect(result).toBe('`code`');
  });

  it('normalizes headings to ATX style', () => {
    const md = `Heading\n========`;
    const result = normalizeMarkdown(md);
    expect(result).toContain('# Heading');
  });

  it('removes HTML comments', () => {
    const md = `<!-- comment -->\n# Heading`;
    const result = normalizeMarkdown(md);
    expect(result).not.toContain('<!--');
    expect(result).not.toContain('-->');
  });

  it('handles empty input', () => {
    expect(normalizeMarkdown('')).toBe('');
    expect(normalizeMarkdown('   \n\n   ')).toBe('');
  });
});