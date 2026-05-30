import { normalizeMarkdown, computeMarkdownHash } from '../hash';

export interface IssueData {
  issueId: string;
  title: string;
  status: string;
  body: string;
  lastKnownHash?: string;
}

export interface Divergence {
  projectSlug: string;
  artifactType: 'issue';
  artifactId: string;
  divergenceType: 'added' | 'modified' | 'deleted';
  conductorHash: string;
  canonicalHash: string;
  description: string;
}

/**
 * Parse issue data from markdown content.
 * @param md - Markdown string to parse
 * @returns {IssueData | null} Parsed issue data or null if invalid
 */
function parseIssueFromMarkdown(md: string): IssueData | null {
  if (!md.trim()) return null;

  const normalized = normalizeMarkdown(md);

  let title = '';
  let body = normalized;
  let status = 'open';

  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    body = frontmatterMatch[2];

    const titleMatch = frontmatter.match(/title:\s*(.+)/i);
    if (titleMatch) title = titleMatch[1].trim();

    const statusMatch = frontmatter.match(/status:\s*(.+)/i);
    if (statusMatch) status = statusMatch[1].trim();
  }

  const headingMatch = body.match(/^#\s+(.+)/m);
  if (!title && headingMatch) {
    title = headingMatch[1].trim();
  }

  if (!title) return null;

  const bodyMatch = body.match(/^#\s+.+\n([\s\S]*)$/);
  if (bodyMatch) {
    body = bodyMatch[1].trim();
  }

  return { issueId: title, title, status, body };
}

/**
 * Check if issue differs between conductor and canonical state.
 * @param projectSlug - The project identifier
 * @param conductorMd - Conductor markdown content
 * @param canonical - Canonical issue data
 * @returns {Divergence | null} Divergence info if issues differ, null otherwise
 */
export function issueDiffer(
  projectSlug: string,
  conductorMd: string,
  canonical: IssueData | null
): Divergence | null {
  const conductorIssue = parseIssueFromMarkdown(conductorMd);
  const conductorHash = computeMarkdownHash(conductorMd);

  if (!canonical) {
    if (conductorIssue) {
      return {
        projectSlug,
        artifactType: 'issue',
        artifactId: conductorIssue.issueId,
        divergenceType: 'added',
        conductorHash,
        canonicalHash: '',
        description: `New issue added: ${conductorIssue.title}`,
      };
    }
    return null;
  }

  if (!conductorIssue) {
    return null;
  }

  const canonicalHash = canonical.lastKnownHash || '';

  if (canonicalHash && conductorHash !== canonicalHash) {
    const changes: string[] = [];
    if (conductorIssue.status !== canonical.status) {
      changes.push(`status changed from "${canonical.status}" to "${conductorIssue.status}"`);
    }
    if (conductorIssue.body !== canonical.body) {
      changes.push('body modified');
    }
    return {
      projectSlug,
      artifactType: 'issue',
      artifactId: conductorIssue.issueId,
      divergenceType: 'modified',
      conductorHash,
      canonicalHash,
      description: `Issue modified: ${changes.join('; ')}`,
    };
  }

  return null;
}