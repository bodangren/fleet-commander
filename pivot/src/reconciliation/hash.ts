

export function normalizeMarkdown(md: string): string {
  let result = md;

  result = result.replace(/^\uFEFF/, '');

  result = result.replace(/^---[\s\S]*?---\n?/m, '');

  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  result = result.replace(/<!--[\s\S]*?-->/g, '');

  result = result.replace(/^\s*[-*+]\s+/gm, '- ');

  result = result.replace(/^(#{1,6})\s+(.+)/gm, (_match, hashes, text) => {
    const level = hashes.length;
    if (level === 1 && text.match(/^=+$/)) {
      return `Heading\n${'='.repeat(text.length)}`;
    }
    if (level === 1 && text.match(/^-+$/)) {
      return '';
    }
    return `${'#'.repeat(level)} ${text}`;
  });

  result = result.replace(/^Heading\s*\n={3,}\s*$/gm, (match) => {
    return match.replace(/^Heading/, '# Heading').replace(/\n={3,}$/, '');
  });

  result = result.replace(/`\s+/g, '`').replace(/\s+`/g, '`');

  result = result.replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, '');

  result = result.replace(/[ \t]+$/gm, '');

  result = result.replace(/\n{3,}/g, '\n\n');

  result = result.trim();

  return result;
}

export function computeMarkdownHash(md: string): string {
  const normalized = normalizeMarkdown(md);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}