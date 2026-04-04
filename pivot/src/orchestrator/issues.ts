import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { ParsedIssue } from './types';

const ISSUE_BLOCK_REGEX = /```issue\s*\n([\s\S]*?)```/g;

/**
 * Extracts all ```issue JSON blocks from agent output.
 * Returns an empty array when no blocks are found.
 * Malformed blocks are skipped with a warning.
 */
export function parseIssues(output: string): ParsedIssue[] {
  const issues: ParsedIssue[] = [];
  let match: RegExpExecArray | null;

  while ((match = ISSUE_BLOCK_REGEX.exec(output)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      console.warn('Warning: empty issue block, skipping');
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.title || !parsed.description) {
        console.warn(
          'Warning: issue block missing required fields (title/description), skipping',
        );
        continue;
      }
      issues.push({
        title: parsed.title,
        description: parsed.description,
        severity: parsed.severity,
        labels: parsed.labels,
      });
    } catch {
      console.warn('Warning: malformed issue JSON, skipping');
    }
  }

  return issues;
}

/**
 * Creates a blocker issue in Convex when a task permanently fails.
 */
export async function createBlockerIssue(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  taskTitle: string,
  error: string,
  failureType: string,
  exitCode: number | undefined,
  durationMs: number,
  attempts: number,
): Promise<void> {
  const issueId = `blocker-${taskKey}-${Date.now()}`;
  const title = `Task ${taskKey} blocked: ${taskTitle}`;
  const body = [
    `Task failed after ${attempts} attempt(s).`,
    '',
    `**Error:** ${error}`,
    '',
    `**Failure Type:** ${failureType}`,
    '',
    `**Exit Code:** ${exitCode ?? 'N/A'}`,
    '',
    `**Duration:** ${durationMs}ms`,
  ].join('\n');

  await client.mutation(api.fleetCatalog.upsertIssue, {
    projectSlug,
    issueId,
    title,
    body,
    status: 'open',
    openedAt: Date.now(),
  });
}

/**
 * Creates delegation issues from parsed agent output and persists to Convex.
 */
export async function createDelegationIssues(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  output: string,
): Promise<number> {
  const parsed = parseIssues(output);
  if (parsed.length === 0) {
    return 0;
  }

  for (const issue of parsed) {
    const issueId = `delegation-${taskKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await client.mutation(api.fleetCatalog.upsertIssue, {
      projectSlug,
      issueId,
      title: issue.title,
      body: issue.description,
      status: 'open',
      openedAt: Date.now(),
    });
  }

  return parsed.length;
}


